import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
// import { DiscoveryRepository } from './discovery.repository';
import { FollowersRepository } from '../followers/followers.repository';
import { ActivityService } from '../activity/activity.service';
import { ActivityType } from '../activity/entities/activity.entity';
import { TrackRepository } from '../track/track.repository';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { TrackService } from '../track/track.service';
import { Track } from '../track/entities/track.entity';
import { Playlist } from '../playlist/entities/playlist.entity';
import { TrackVisibility } from '../track/enums/track-visibility.enum';
import { getLocationFromIp } from '../common/utilities/geolocation.util';
import { UserService } from '../user/user.service';

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
    private readonly playlistRepository: PlaylistRepository,
    private readonly userService: UserService
  ) {}

  async getFeed(
    userId: string,
    ip: string,
    includeReposts: boolean = true,
    page: number = 1,
    limit: number = 20
  ) {
    // 1. Resolve geolocation from the provided IP
    const { country } = getLocationFromIp(ip);

    // 2. Fetch the IDs of users being followed
    const followingIds = await this.followersRepository.getFollowingIds(userId);
    if (followingIds.length === 0) {
      return { activities: [], total: 0 };
    }

    // 3. Fetch activities (reposts and posts)
    const activities = await this.activityService.getActivitiesByUserIds(
      followingIds,
      page,
      limit,
      includeReposts
    );

    // 4. Separate IDs by type to fetch full data from repositories
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

    // 5. Fetch Tracks and Playlists concurrently
    const [tracks, playlists] = await Promise.all([
      trackIds.length ? this.trackRepository.findByIds(trackIds) : [],
      playlistIds.length ? this.playlistRepository.findByIds(playlistIds) : [],
    ]);

    // 6. Map results for O(1) lookup
    const trackMap = new Map(tracks.map((t) => [t.trackId, t]));
    const playlistMap = new Map(playlists.map((p) => [p.playlistId, p]));

    // 7. Assemble the feed and apply region-based censorship
    return activities.map((a) => {
      // Cast to 'any' to allow for partial object construction later
      let target: any = trackMap.get(a.targetId) ?? playlistMap.get(a.targetId) ?? null;

      if (!target) return { ...a, target: null };

      // --- TRACK LOGIC ---
      if (
        a.activityType === ActivityType.TRACK_POSTED ||
        a.activityType === ActivityType.TRACK_REPOST
      ) {
        const isBlocked = country && target.blockedRegions?.includes(country);

        if (isBlocked) {
          // Return only allowed fields
          target = {
            trackId: target.trackId,
            title: target.title,
            coverImage: target.coverImage,
            user: target.user,
            genre: target.genre,
            isBlocked: true,
            audioUrl: null, // Censored
          };
        }
      }

      // --- PLAYLIST LOGIC ---
      if (
        a.activityType === ActivityType.PLAYLIST_POSTED ||
        a.activityType === ActivityType.PLAYLIST_REPOST
      ) {
        if (target.playlistTracks) {
          target.playlistTracks = target.playlistTracks.map((pt: any) => {
            const trackIsBlocked = country && pt.track?.blockedRegions?.includes(country);

            if (trackIsBlocked) {
              return {
                ...pt,
                track: {
                  trackId: pt.track.trackId,
                  title: pt.track.title,
                  coverImage: pt.track.coverImage,
                  user: pt.track.user,
                  isBlocked: true,
                  audioUrl: null, // Censored
                },
              };
            }
            return pt;
          });
        }
      }

      return {
        ...a,
        target,
      };
    });
  }

  private async stationResponse(currentUserId: string, station: Playlist, ip?: string) {
    // get first 3 unique featured artists
    const uniqueArtistTracks = station.playlistTracks
      .map((pt) => pt.track)
      .filter((track, index, self) => index === self.findIndex((t) => t.userId === track.userId))
      .slice(0, 3); // Grab the first 3 unique ones

    // 2. Map them to the final format using Promise.all
    const featuredArtists = await Promise.all(
      uniqueArtistTracks.map(async (t) => ({
        userId: t.userId,
        username: t.user?.username || 'unknown',
        displayName: t.user?.displayName || 'Unknown Artist',
        avatarUrl: t.user?.avatarUrl || null,
        trackCount: t.user?.trackCount || 0,
        followersCount: t.user?.followersCount || 0,
        isFollowedByCurrentUser:
          currentUserId === t.userId
            ? true
            : await this.followersRepository.isFollowing(currentUserId, t.userId),
      }))
    );

    const country = ip ? getLocationFromIp(ip).country : null;

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
        trackArtist: {
          userId: station.user.userId,
          username: station.user.username,
          displayName: station.user.displayName,
          avatarUrl: station.user.avatarUrl,
        },
        tracks: station.playlistTracks.map((pt) => {
          const isBlocked = !!(country && pt.track.blockedRegions?.includes(country));
          return {
            position: pt.position,
            trackId: pt.track.trackId,
            title: pt.track.title,
            durationSeconds: pt.track.durationSeconds,
            coverImage: pt.track.coverImage,
            audioUrl: isBlocked ? null : pt.track.audioUrl,
            waveformUrl: isBlocked ? null : pt.track.waveformUrl,
            playCount: pt.track.playCount,
            likesCount: pt.track.likesCount,
            repostsCount: pt.track.repostsCount,
            commentsCount: pt.track.commentsCount,
            artist: {
              userId: pt.track.userId,
              username: pt.track.user?.username || 'unknown',
              displayName: pt.track.user?.displayName || 'Unknown Artist',
              avatarUrl: pt.track.user?.avatarUrl || null,
            },
          };
        }),
        featuredArtists,
      },
    };
  }

  async getTrackStation(
    artistUsername: string,
    trackName: string,
    currentUserId: string,
    ip?: string
  ) {
    const track = await this.trackRepository.findTrackByTitleAndArtist(trackName, artistUsername);
    if (!track) {
      throw new NotFoundException('Track not found');
    }
    if (track.visibility !== TrackVisibility.PUBLIC || track.hidden) {
      throw new ForbiddenException('Track is not accessible');
    }

    let station = await this.playlistRepository.getTrackStation(track.trackId);
    if (station && station?.createdAt.getTime() < new Date().getTime() - 7 * 24 * 60 * 60 * 1000) {
      // If station is older than 7 days, delete and create a new one
      await this.playlistRepository.deletePlaylist(station.playlistId);
      station = null;
    }

    if (station) {
      return this.stationResponse(currentUserId, station, ip);
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

    return this.stationResponse(currentUserId, stationWithTracks!, ip);
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

  async getUserRecentActivities(
    userId: string,
    username: string,
    ip: string,
    page: number = 1,
    limit: number = 20
  ) {
    // 1. Resolve geolocation from the provided IP
    const { country } = getLocationFromIp(ip);

    // 2. Fetch the IDs of users being followed
    const targetUser = await this.userService.findByUsername(username);
    if (!targetUser) {
      throw new Error('User not found');
    }
    if (targetUser.isPublic === false) {
      throw new Error('User activities are private');
    }

    // 3. Fetch activities (reposts and posts)
    const activities = await this.activityService.getActivitiesByUserIds(
      [targetUser.userId],
      page,
      limit,
      true
    );

    // 4. Separate IDs by type to fetch full data from repositories
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

    // 5. Fetch Tracks and Playlists concurrently
    const [tracks, playlists] = await Promise.all([
      trackIds.length ? this.trackRepository.findByIds(trackIds) : [],
      playlistIds.length ? this.playlistRepository.findByIds(playlistIds) : [],
    ]);

    // 6. Map results for O(1) lookup
    const trackMap = new Map(tracks.map((t) => [t.trackId, t]));
    const playlistMap = new Map(playlists.map((p) => [p.playlistId, p]));

    // 7. Assemble the feed and apply region-based censorship
    return activities.map((a) => {
      // Cast to 'any' to allow for partial object construction later
      let target: any = trackMap.get(a.targetId) ?? playlistMap.get(a.targetId) ?? null;

      if (!target) return { ...a, target: null };

      // --- TRACK LOGIC ---
      if (
        a.activityType === ActivityType.TRACK_POSTED ||
        a.activityType === ActivityType.TRACK_REPOST
      ) {
        const isBlocked = country && target.blockedRegions?.includes(country);

        if (isBlocked) {
          // Return only allowed fields
          target = {
            trackId: target.trackId,
            title: target.title,
            coverImage: target.coverImage,
            user: target.user,
            genre: target.genre,
            isBlocked: true,
            audioUrl: null, // Censored
          };
        }
      }

      // --- PLAYLIST LOGIC ---
      if (
        a.activityType === ActivityType.PLAYLIST_POSTED ||
        a.activityType === ActivityType.PLAYLIST_REPOST
      ) {
        if (target.playlistTracks) {
          target.playlistTracks = target.playlistTracks.map((pt: any) => {
            const trackIsBlocked = country && pt.track?.blockedRegions?.includes(country);

            if (trackIsBlocked) {
              return {
                ...pt,
                track: {
                  trackId: pt.track.trackId,
                  title: pt.track.title,
                  coverImage: pt.track.coverImage,
                  user: pt.track.user,
                  isBlocked: true,
                  audioUrl: null, // Censored
                },
              };
            }
            return pt;
          });
        }
      }

      return {
        ...a,
        target,
      };
    });
  }

  async getUserPopularTracks(username: string, currentUserId: string, ip: string) {
    const targetUser = await this.userService.findByUsername(username);
    if (!targetUser) {
      return { status: 'error', message: 'User not found' };
    }

    if (await this.followersRepository.hasBlockRelationship(currentUserId, targetUser.userId)) {
      throw new ForbiddenException("You cannot view this user's profile");
    }

    const tracks = await this.trackRepository.getAllUserTracks(username);
    const { country } = getLocationFromIp(ip);
    if (tracks.length === 0) {
      return { status: 'success', data: [] };
    }
    // Resolve all promises first, then sort
    const tracksWithScores = await Promise.all(
      tracks.map(async (track) => ({
        ...track,
        popularityScore: await this.trackService.getPopularityScore(track.trackId),
      }))
    );

    const sortedTracks = tracksWithScores
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 10);
    return {
      status: 'success',
      data: sortedTracks.map((track) => {
        const isBlocked = country && track.blockedRegions?.includes(country);
        return {
          trackId: track.trackId,
          title: track.title,
          coverImage: track.coverImage,
          user: track.user,
          genre: track.genre,
          isBlocked,
          audioUrl: isBlocked ? null : track.audioUrl,
          waveformUrl: isBlocked ? null : track.waveformUrl,
          playCount: track.playCount,
          likesCount: track.likesCount,
          repostsCount: track.repostsCount,
          commentsCount: track.commentsCount,
        };
      }),
    };
  }
}
