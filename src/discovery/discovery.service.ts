import { Injectable } from '@nestjs/common';
// import { DiscoveryRepository } from './discovery.repository';
import { FollowersRepository } from '../followers/followers.repository';
import { ActivityService } from '../activity/activity.service';
import { ActivityType } from '../activity/entities/activity.entity';
import { TrackRepository } from '../track/track.repository';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { TrackService } from '../track/track.service';
import { Track } from '../track/entities/track.entity';
import { Playlist } from '../playlist/entities/playlist.entity';

interface TrackCandidate {
  track: Track;
  score: number;
}

@Injectable()
export class DiscoveryService {
  constructor(
    // private readonly discoveryRepository: DiscoveryRepository,
    private readonly followersRepository: FollowersRepository,
    private readonly activityService: ActivityService,
    private readonly trackRepository: TrackRepository,
    private readonly trackService: TrackService,
    private readonly playlistRepository: PlaylistRepository
  ) {}

  async getFeed(
    userId: string,
    includeReposts: boolean = true,
    page: number = 1,
    limit: number = 20
  ) {
    const followingIds = await this.followersRepository.getFollowingIds(userId);
    if (followingIds.length === 0) {
      return {};
    }
    // console.log(followingIds);
    const activities = await this.activityService.getActivitiesByUserIds(
      followingIds,
      page,
      limit,
      includeReposts
    );
    // console.log(activities);
    const trackIds = activities
      .filter(
        (a) =>
          a.activityType === ActivityType.TRACK_POSTED ||
          a.activityType === ActivityType.TRACK_REPOST
      )
      .map((a) => a.targetId);

    const playlistIds = activities
      .filter(
        (a) =>
          a.activityType === ActivityType.PLAYLIST_POSTED ||
          a.activityType === ActivityType.PLAYLIST_REPOST
      )
      .map((a) => a.targetId);

    const [tracks, playlists] = await Promise.all([
      trackIds.length ? this.trackRepository.findByIds(trackIds) : [],
      playlistIds.length ? this.playlistRepository.findByIds(playlistIds) : [],
    ]);
    const trackMap = new Map(tracks.map((t) => [t.trackId, t]));
    const playlistMap = new Map(playlists.map((p) => [p.playlistId, p]));
    return activities.map((a) => ({
      ...a,
      target: trackMap.get(a.targetId) ?? playlistMap.get(a.targetId) ?? null,
    }));
  }

  private stationResponse(station: Playlist) {
    return {
      status: 'success',
      data: {
        playlistId: station.playlistId,
        title: station.title,
        description: station.description,
        coverImage: station.coverImage,
        tracksCount: station.tracksCount,
        durationSeconds: station.totalDurationSeconds,
        likesCount: station.likesCount,
        createdAt: station.createdAt,
        user: {
          user_id: station.user.userId,
          displayName: station.user.displayName,
          avatarUrl: station.user.avatarUrl,
        },
        tracks: station.playlistTracks.map((pt) => ({
          position: pt.position,
          trackId: pt.track.trackId,
          title: pt.track.title,
          duration_seconds: pt.track.durationSeconds,
          coverImage: pt.track.coverImage,
          playCount: pt.track.playCount,
          likesCount: pt.track.likesCount,
          repostsCount: pt.track.repostsCount,
          commentsCount: pt.track.commentsCount,
        })),
      },
    };
  }

  async getTrackStation(artistUsername: string, trackName: string) {
    const track = await this.trackRepository.findTrackByTitleAndArtist(trackName, artistUsername);
    if (!track) {
      throw new Error('Track not found');
    }
    let station = await this.playlistRepository.getTrackStation(track.trackId);
    if (station && station?.createdAt.getTime() < new Date().getTime() - 7 * 24 * 60 * 60 * 1000) {
      // If station is older than 7 days, delete and create a new one
      await this.playlistRepository.deletePlaylist(station.playlistId);
      station = null;
    }

    if (station) {
      return this.stationResponse(station);
    }

    const relatedTracks = await this.trackService.getRelatedTracksByTrackId(track.trackId);
    const candidateMap = new Map<string, { track: Track; score: number }>();
    relatedTracks.forEach((c) => {
      this.updateScore(candidateMap, c, 8); // Base 8 points for being a shared listener track
    });

    const metadataCandidates = await this.trackRepository.findPopularTracksByGenreOrTags(
      track.genreId,
      track.tags,
      1,
      40
    );
    metadataCandidates.forEach((c) => {
      // Add 5 points if genre matches
      const matchesGenre = c.genreId === track.genreId;
      let score = matchesGenre ? 5 : 0;
      // Add 3 points for each matching tag
      const matches = c.tags.filter((t) =>
        track.tags.some((trackTag) => trackTag.genreId === t.genreId)
      ).length;
      score += matches * 3;

      this.updateScore(candidateMap, c, score);
    });

    // if Same Artist add 10 points
    candidateMap.forEach((val, key) => {
      if (val.track.userId === track.userId) {
        candidateMap.get(key)!.score += 10;
      }
    });

    const results = Array.from(candidateMap.values())
      .filter((item) => item.track.trackId !== track.trackId) // Don't recommend itself
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((item) => item.track);

    results.unshift(track); // Add the original track at the beginning
    // create station
    const newStation = await this.playlistRepository.createTrackStation(
      track.trackId,
      track.title,
      track.coverImage,
      track.userId
    );
    // add tracks to station
    const addTrackPromises = results.map((relatedTrack, index) =>
      this.playlistRepository.addTrackToPlaylist(
        newStation.playlistId,
        relatedTrack.trackId,
        index + 1
      )
    );

    await Promise.all(addTrackPromises);
    const stationWithTracks = await this.playlistRepository.getPublicPlaylist(
      newStation.playlistId
    );
    return this.stationResponse(stationWithTracks!);
  }

  private updateScore(map: Map<string, TrackCandidate>, track: Track, points: number) {
    const existing = map.get(track.trackId);
    if (existing) {
      map.set(track.trackId, {
        ...existing,
        score: existing.score + points,
      });
    } else {
      map.set(track.trackId, { track, score: points });
    }
  }
}
