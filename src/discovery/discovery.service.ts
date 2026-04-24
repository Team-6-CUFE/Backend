import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { createClient } from 'redis';
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
import { search, autocomplete } from '../search/search';
import { EntityType } from '../search/types';
import { Genre } from '../genre/entities/genre.entity';
import { User } from '../user/entities/user.entity';
import { REDIS_CLIENT } from '../redis/redis.module';
import { DEFAULT_GENRE_NAMES } from '../genre/genre.constants';
import { TRENDING_MUSIC_USER } from '../user/trending-music-user.constants';
import { CreatePlaylistDto } from '../playlist/dto/create-playlist.dto';
import { GenreRepository } from '../genre/genre.repository';

const logger = new Logger('DiscoveryService');

interface TrackCandidate {
  track: Track;
  score: number;
}

const RECOMMENDED_STATIONS_TTL_SECS = 7 * 24 * 60 * 60; // 1 week

@Injectable()
export class DiscoveryService {
  constructor(
    // private readonly discoveryRepository: DiscoveryRepository,
    private readonly followersRepository: FollowersRepository,
    private readonly activityService: ActivityService,
    private readonly trackRepository: TrackRepository,
    private readonly trackService: TrackService,
    private readonly playlistRepository: PlaylistRepository,
    private readonly userService: UserService,
    @Inject(REDIS_CLIENT)
    private readonly redis: ReturnType<typeof createClient>,
    private readonly genreRepository: GenreRepository
  ) {}

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Formats a track for API responses.
   * Returns null if the track should be filtered out (hidden or region-blocked).
   */
  private formatTrack(
    track: Track & { isLiked?: boolean; isReposted?: boolean },
    country: string | null
  ): Record<string, any> | null {
    if (track.hidden || track.visibility !== TrackVisibility.PUBLIC) return null;
    const isBlocked = country && track.blockedRegions?.includes(country);

    const user = track.user as User;
    return {
      trackId: track.trackId,
      title: track.title,
      coverImage: track.coverImage,
      user: user
        ? {
            userId: user.userId,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            followersCount: user.followersCount,
            city: user.city,
            country: user.country,
          }
        : null,
      genre: track.genre
        ? { genreId: (track.genre as Genre).genreId, name: (track.genre as Genre).name }
        : null,
      audioUrl: isBlocked ? null : track.audioUrl,
      waveformUrl: track.waveformUrl,
      playCount: track.playCount,
      likesCount: track.likesCount,
      repostsCount: track.repostsCount,
      commentsCount: track.commentsCount,
      durationSeconds: track.durationSeconds,
      mainArtists: track.mainArtists,
      createdAt: track.createdAt,
      isLiked: track.isLiked ?? false,
      isReposted: track.isReposted ?? false,
    };
  }

  /**
   * Formats a playlist-track entry.
   * Returns null if the track is hidden or region-blocked.
   */
  private formatPlaylistTrack(
    pt: { position: number; track: Track & { isLiked?: boolean; isReposted?: boolean } },
    country: string | null
  ): Record<string, any> | null {
    const { track } = pt;
    if (!track) return null;
    if (track.hidden || track.visibility !== TrackVisibility.PUBLIC) return null;
    const isBlocked = country && track.blockedRegions?.includes(country);

    const artist = track.user as User;
    return {
      position: pt.position,
      trackId: track.trackId,
      title: track.title,
      durationSeconds: track.durationSeconds,
      coverImage: track.coverImage,
      audioUrl: isBlocked ? null : track.audioUrl,
      waveformUrl: track.waveformUrl,
      playCount: track.playCount,
      likesCount: track.likesCount,
      repostsCount: track.repostsCount,
      commentsCount: track.commentsCount,
      artist: artist
        ? {
            userId: artist.userId,
            username: artist.username,
            displayName: artist.displayName,
            avatarUrl: artist.avatarUrl,
            city: artist.city,
            country: artist.country,
            followersCount: artist.followersCount,
          }
        : null,
      isLiked: track.isLiked ?? false,
      isReposted: track.isReposted ?? false,
    };
  }

  /**
   * Formats a playlist for API responses, filtering hidden/blocked tracks within it.
   */
  private formatPlaylist(
    playlist: Playlist & { isLiked?: boolean; isReposted?: boolean },
    country: string | null
  ): Record<string, any> {
    const owner = playlist.user as User;
    return {
      playlistId: playlist.playlistId,
      title: playlist.title,
      description: playlist.description,
      coverImage: playlist.coverImage,
      tracksCount: playlist.tracksCount,
      durationSeconds: playlist.totalDurationSeconds,
      likesCount: playlist.likesCount,
      repostsCount: playlist.repostsCount,
      createdAt: playlist.createdAt,
      isLiked: playlist.isLiked ?? false,
      isReposted: playlist.isReposted ?? false,
      user: owner
        ? {
            userId: owner.userId,
            username: owner.username,
            displayName: owner.displayName,
            avatarUrl: owner.avatarUrl,
            city: owner.city,
            country: owner.country,
            followersCount: owner.followersCount,
          }
        : null,
      playlistTracks: (playlist.playlistTracks ?? [])
        .map((pt: any) => this.formatPlaylistTrack(pt, country))
        .filter((pt): pt is NonNullable<typeof pt> => pt !== null),
    };
  }

  /**
   * Assembles activity feed items with fully formatted targets.
   */
  private async assembleActivities(
    activities: any[],
    userId: string,
    country: string | null
  ): Promise<any[]> {
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
      trackIds.length ? this.trackRepository.findByIds(trackIds, userId) : [],
      playlistIds.length ? this.playlistRepository.findByIds(playlistIds) : [],
    ]);

    // Batch-check playlist like/repost status for the current user
    const playlistTrackIds = playlists.flatMap(
      (p) => p.playlistTracks?.map((pt: any) => pt.trackId) ?? []
    );
    const [likedPlaylistIds, repostedPlaylistIds, likedPlaylistTrackIds, repostedPlaylistTrackIds] =
      await Promise.all([
        this.playlistRepository.getUserLikedPlaylistIds(userId, playlistIds),
        this.playlistRepository.getUserRepostedPlaylistIds(userId, playlistIds),
        this.trackRepository.getUserLikedTrackIds(userId, playlistTrackIds),
        this.trackRepository.getUserRepostedTrackIds(userId, playlistTrackIds),
      ]);

    const trackMap = new Map(tracks.map((t) => [t.trackId, t]));
    const playlistMap = new Map(playlists.map((p) => [p.playlistId, p]));

    return activities.map((a) => {
      const rawTarget: any = trackMap.get(a.targetId) ?? playlistMap.get(a.targetId) ?? null;
      if (!rawTarget) return { ...a, target: null };

      if (
        a.activityType === ActivityType.TRACK_POSTED ||
        a.activityType === ActivityType.TRACK_REPOST
      ) {
        return { ...a, target: this.formatTrack(rawTarget, country) };
      }

      if (
        a.activityType === ActivityType.PLAYLIST_POSTED ||
        a.activityType === ActivityType.PLAYLIST_REPOST
      ) {
        // Inject isLiked/isReposted for each playlist track then format
        const playlistWithStatus = {
          ...rawTarget,
          isLiked: likedPlaylistIds.has(rawTarget.playlistId),
          isReposted: repostedPlaylistIds.has(rawTarget.playlistId),
          playlistTracks: (rawTarget.playlistTracks ?? []).map((pt: any) => ({
            ...pt,
            track: pt.track
              ? {
                  ...pt.track,
                  isLiked: likedPlaylistTrackIds.has(pt.track.trackId),
                  isReposted: repostedPlaylistTrackIds.has(pt.track.trackId),
                }
              : pt.track,
          })),
        };
        return { ...a, target: this.formatPlaylist(playlistWithStatus, country) };
      }

      return { ...a, target: rawTarget };
    });
  }

  async getFeed(
    userId: string,
    ip: string,
    includeReposts: boolean = true,
    page: number = 1,
    limit: number = 20
  ) {
    const { country } = getLocationFromIp(ip);

    const followingIds = await this.followersRepository.getFollowingIds(userId);
    if (followingIds.length === 0) {
      return { activities: [], total: 0 };
    }

    const activities = await this.activityService.getActivitiesByUserIds(
      followingIds,
      page,
      limit,
      includeReposts
    );

    return this.assembleActivities(activities, userId, country);
  }

  private async stationResponse(currentUserId: string, station: Playlist, ip?: string) {
    // Batch-query like/repost status for the station and its tracks
    const stationTrackIds = station.playlistTracks
      .map((pt) => pt.track?.trackId)
      .filter(Boolean) as string[];
    const [likedStationIds, likedTrackIds, repostedTrackIds] = await Promise.all([
      this.playlistRepository.getUserLikedPlaylistIds(currentUserId, [station.playlistId]),
      this.trackRepository.getUserLikedTrackIds(currentUserId, stationTrackIds),
      this.trackRepository.getUserRepostedTrackIds(currentUserId, stationTrackIds),
    ]);

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
        isLiked: likedStationIds.has(station.playlistId),
        createdAt: station.createdAt,
        trackArtist: {
          userId: station.user.userId,
          username: station.user.username,
          displayName: station.user.displayName,
          avatarUrl: station.user.avatarUrl,
        },
        tracks: station.playlistTracks
          .map((pt) =>
            this.formatPlaylistTrack(
              {
                ...pt,
                track: pt.track
                  ? {
                      ...pt.track,
                      isLiked: likedTrackIds.has(pt.track.trackId),
                      isReposted: repostedTrackIds.has(pt.track.trackId),
                    }
                  : pt.track,
              },
              country
            )
          )
          .filter((pt): pt is NonNullable<typeof pt> => pt !== null),
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

    const station = await this.playlistRepository.getTrackStation(track.trackId);
    if (station && station?.createdAt.getTime() > new Date().getTime() - 15 * 24 * 60 * 60 * 1000) {
      // If station exists and is less than 15 days old, return it
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

    if (station) {
      // If an old station exists, transfer likes and delete it
      await this.playlistRepository.transferStationLikes(station.playlistId, newStation.playlistId);
      await this.playlistRepository.deletePlaylist(station.playlistId);
    }

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

  async getArtistStation(username: string, currentUserId: string, ip?: string) {
    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isPublic === false) {
      throw new ForbiddenException('User is private');
    }

    if (user.trackCount === 0) {
      throw new NotFoundException('Artist has no tracks');
    }
    if (await this.followersRepository.hasBlockRelationship(currentUserId, user.userId)) {
      throw new ForbiddenException("You cannot view this user's station");
    }
    const station = await this.playlistRepository.getArtistStation(user.userId);
    if (station && station?.createdAt.getTime() > new Date().getTime() - 15 * 24 * 60 * 60 * 1000) {
      // If station exists and is less than 15 days old, return it
      return this.stationResponse(currentUserId, station, ip);
    }

    // get the user's most popular tracks
    const tracks = await this.trackRepository.getAllUserTracks(username);

    // Resolve all promises first, then sort
    const tracksWithScores = await Promise.all(
      tracks.map(async (track) => ({
        ...track,
        popularityScore: await this.trackService.getPopularityScore(track.trackId),
      }))
    );

    const popularTracks = tracksWithScores
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 10);
    logger.debug(`Popular tracks for ${username}: ${popularTracks.map((t) => t.title).join(', ')}`);
    const candidateMap = new Map<string, { track: Track; score: number }>();
    popularTracks.forEach((t) => {
      this.updateScore(candidateMap, t, 10); // Base 10 points for being a top track of the artist
    });

    // Get related tracks for each of the top tracks and flatten the results
    const relatedTracks = await Promise.all(
      popularTracks.map((track) => this.trackService.getRelatedTracksByTrackId(track.trackId))
    ).then((arrays) => arrays.flat());
    logger.debug(
      `Related tracks count for ${username}: ${relatedTracks.map((t) => t.title).join(', ')}`
    );
    relatedTracks.forEach((c) => {
      this.updateScore(candidateMap, c, 8); // Base 8 points for being a shared listener track
    });

    const artistGenres = [...new Set(popularTracks.map((t) => t.genreId))];
    const artistTags = popularTracks.flatMap((t) => t.tags);
    const metadataCandidates = await this.trackRepository.findPopularTracksByGenreOrTags(
      artistGenres.length > 0 ? artistGenres[0] : null, // Use the most common genre if available
      artistTags,
      1,
      40
    );
    logger.debug(
      `Metadata candidates count for ${username}: ${metadataCandidates.map((c) => c.title).join(', ')}`
    );
    metadataCandidates.forEach((c) => {
      // Add 5 points if genre matches
      const matchesGenre = c.genreId && artistGenres.includes(c.genreId);
      let score = matchesGenre ? 5 : 0;
      // Add 3 points for each matching tag
      const matches = c.tags.filter((t) =>
        artistTags.some((trackTag) => trackTag.genreId === t.genreId)
      ).length;
      score += matches * 3;

      this.updateScore(candidateMap, c, score);
    });

    // if Same Artist add 10 points
    candidateMap.forEach((val, key) => {
      if (val.track.userId === user.userId) {
        candidateMap.get(key)!.score += 15;
      }
    });

    const results = Array.from(candidateMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((item) => item.track);

    // create station
    const newStation = await this.playlistRepository.createArtistStation(
      user.displayName,
      user.avatarUrl,
      user.userId
    );

    if (station) {
      // If an old station exists, transfer likes and delete it
      await this.playlistRepository.transferStationLikes(station.playlistId, newStation.playlistId);
      await this.playlistRepository.deletePlaylist(station.playlistId);
    }

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

  async getUserRecentActivities(
    userId: string,
    username: string,
    ip: string,
    page: number = 1,
    limit: number = 20
  ) {
    const { country } = getLocationFromIp(ip);

    const targetUser = await this.userService.findByUsername(username);
    if (!targetUser) {
      throw new Error('User not found');
    }
    if (targetUser.isPublic === false) {
      throw new Error('User activities are private');
    }
    if (await this.followersRepository.hasBlockRelationship(userId, targetUser.userId)) {
      throw new ForbiddenException("You cannot view this user's profile");
    }

    const activities = await this.activityService.getActivitiesByUserIds(
      [targetUser.userId],
      page,
      limit,
      true
    );

    return this.assembleActivities(activities, userId, country);
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

    const trackIds = sortedTracks.map((t) => t.trackId);
    const [likedIds, repostedIds] = await Promise.all([
      this.trackRepository.getUserLikedTrackIds(currentUserId, trackIds),
      this.trackRepository.getUserRepostedTrackIds(currentUserId, trackIds),
    ]);

    return {
      status: 'success',
      data: sortedTracks
        .map((track) =>
          this.formatTrack(
            {
              ...track,
              isLiked: likedIds.has(track.trackId),
              isReposted: repostedIds.has(track.trackId),
            },
            country
          )
        )
        .filter((t): t is NonNullable<typeof t> => t !== null),
    };
  }

  async getMoreOfWhatYouLike(userId: string, ip: string) {
    // get genres of tracks the user has interacted with
    const interactedTrackTags = await this.trackService.getUserInteractedTrackTags(userId);
    // determine top 5 most interacted genres
    const tagFrequency = interactedTrackTags.reduce<
      Record<string, { count: number; name: string }>
    >((acc, tag) => {
      acc[tag.genreId] = acc[tag.genreId]
        ? { ...acc[tag.genreId], count: acc[tag.genreId].count + 1 }
        : { count: 1, name: tag.name };
      return acc;
    }, {});
    const topTagIds = Object.entries(tagFrequency)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([genreId]) => genreId);

    if (topTagIds.length === 0) {
      return { status: 'success', data: [] };
    }
    // get top tracks with those genres
    const tracks = await this.trackService.getTopTracksByTagIds(topTagIds, userId);
    // filter out blocked tracks based on IP geolocation
    const { country } = getLocationFromIp(ip);

    return {
      status: 'success',
      data: tracks
        .map((track) => this.formatTrack(track as any, country))
        .filter((t): t is NonNullable<typeof t> => t !== null),
    };
  }

  async getSearchResults(
    userId: string,
    q: string,
    type: EntityType | undefined,
    tag: string | undefined,
    city: string | undefined,
    duration: string | undefined,
    createdAt: string | undefined,
    ip: string,
    page: number = 1,
    limit: number = 20
  ) {
    let durationRange;
    if (duration && type === 'track') {
      if (duration === '<2') {
        durationRange = {
          min: 0,
          max: 2 * 60,
        };
      } else if (duration === '2-10') {
        durationRange = {
          min: 2 * 60,
          max: 10 * 60,
        };
      } else if (duration === '10-30') {
        durationRange = {
          min: 10 * 60,
          max: 30 * 60,
        };
      } else if (duration === '>30') {
        durationRange = {
          min: 30 * 60,
          max: undefined,
        };
      } else {
        return new BadRequestException('Incorrect duration range');
      }
    }

    let createdAtLimit;
    if (createdAt) {
      if (createdAt === 'h') {
        createdAtLimit = new Date(Date.now() - 60 * 60 * 1000);
      } else if (createdAt === 'd') {
        createdAtLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
      } else if (createdAt === 'w') {
        createdAtLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (createdAt === 'm') {
        createdAtLimit = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      } else if (createdAt === 'y') {
        createdAtLimit = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      } else {
        return new BadRequestException('Incorrect created at range');
      }
    }
    const offset = (page - 1) * limit;
    const { hits: searchResult, total } = await search({
      query: q,
      type: type || 'all',
      genre: tag,
      tag,
      city,
      durationRange,
      createdAtLimit,
      offset,
      limit,
    });

    const userIds = searchResult
      .filter((hit) => hit.type === 'user')
      .map((hit) => hit.id.replace('user_', ''));
    const trackIds = searchResult
      .filter((hit) => hit.type === 'track')
      .map((hit) => hit.id.replace('track_', ''));
    const playlistIds = searchResult
      .filter((hit) => hit.type === 'playlist')
      .map((hit) => hit.id.replace('playlist_', ''));
    const albumIds = searchResult
      .filter((hit) => hit.type === 'album')
      .map((hit) => hit.id.replace('album_', ''));

    const [users, tracks, playlists, albums] = await Promise.all([
      userIds.length ? this.userService.findByIds(userIds) : [],
      trackIds.length ? this.trackRepository.findByIds(trackIds, userId) : [],
      playlistIds.length ? this.playlistRepository.findPlaylistsByIds(playlistIds) : [],
      albumIds.length ? this.playlistRepository.findAlbumsByIds(albumIds) : [],
    ]);

    // Batch-check like/repost status for playlists and their tracks
    const allCollectionIds = [...playlistIds, ...albumIds];
    const allCollections = [...playlists, ...albums];
    const collectionTrackIds = allCollections.flatMap(
      (c) => c.playlistTracks?.map((pt: any) => pt.trackId) ?? []
    );

    const [
      likedPlaylistIds,
      repostedPlaylistIds,
      likedCollectionTrackIds,
      repostedCollectionTrackIds,
    ] = await Promise.all([
      this.playlistRepository.getUserLikedPlaylistIds(userId, allCollectionIds),
      this.playlistRepository.getUserRepostedPlaylistIds(userId, allCollectionIds),
      this.trackRepository.getUserLikedTrackIds(userId, collectionTrackIds),
      this.trackRepository.getUserRepostedTrackIds(userId, collectionTrackIds),
    ]);

    const { country } = getLocationFromIp(ip);
    const formattedResults = await Promise.all(
      searchResult.map(async (hit) => {
        if (hit.type === 'user') {
          const id = hit.id.replace('user_', '');
          const user = users.find((u) => u.userId === id);
          return user
            ? {
                type: 'user',
                userId: user.userId,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                city: user.city,
                country: user.country,
                followersCount: user.followersCount,
                isFollowedByCurrentUser:
                  userId === user.userId
                    ? true
                    : await this.followersRepository.isFollowing(userId, user.userId),
              }
            : null;
        }

        if (hit.type === 'track') {
          const id = hit.id.replace('track_', '');
          const track = tracks.find((t) => t.trackId === id);
          if (!track) return null;
          const formatted = this.formatTrack(track, country);
          if (!formatted) return null;
          return { type: 'track', ...formatted };
        }

        if (hit.type === 'playlist') {
          const id = hit.id.replace('playlist_', '');
          const playlist = playlists.find((p) => p.playlistId === id);
          if (!playlist) return null;
          const playlistWithStatus = {
            ...playlist,
            isLiked: likedPlaylistIds.has(playlist.playlistId),
            isReposted: repostedPlaylistIds.has(playlist.playlistId),
            playlistTracks: (playlist.playlistTracks ?? []).map((pt: any) => ({
              ...pt,
              track: pt.track
                ? {
                    ...pt.track,
                    isLiked: likedCollectionTrackIds.has(pt.track.trackId),
                    isReposted: repostedCollectionTrackIds.has(pt.track.trackId),
                  }
                : pt.track,
            })),
          };
          return {
            type: 'playlist',
            ...this.formatPlaylist(playlistWithStatus, country),
          };
        }
        const id = hit.id.replace('album_', '');
        const album = albums.find((a) => a.playlistId === id);
        if (!album) return null;
        const albumWithStatus = {
          ...album,
          isLiked: likedPlaylistIds.has(album.playlistId),
          isReposted: repostedPlaylistIds.has(album.playlistId),
          playlistTracks: (album.playlistTracks ?? []).map((pt: any) => ({
            ...pt,
            track: pt.track
              ? {
                  ...pt.track,
                  isLiked: likedCollectionTrackIds.has(pt.track.trackId),
                  isReposted: repostedCollectionTrackIds.has(pt.track.trackId),
                }
              : pt.track,
          })),
        };
        return {
          type: 'album',
          ...this.formatPlaylist(albumWithStatus, country),
        };
      })
    );
    return {
      status: 'success',
      total,
      data: formattedResults.filter((r): r is NonNullable<typeof r> => r !== null),
    };
  }

  async searchAutocomplete(q: string) {
    const data = await autocomplete(q);
    return {
      status: 'success',
      data,
    };
  }

  async getRecommendedStations(userId: string, ip: string) {
    const cached = await this.redis.get(`recommended_stations:${userId}`);
    if (cached) {
      const data = JSON.parse(cached) as Track[];
      return data;
    }
    // get last 5 artists user listened to
    const lastListenedArtistUsernames =
      await this.trackRepository.getUserLastListenedArtistUsernames(userId);
    // get top 5 popular artists user follows
    const topFollowedArtistUsernames = await this.followersRepository.getTopFollowedArtistUsernames(
      userId,
      5
    );

    // get stations for those artists
    const stationPromises = [
      ...new Set([...lastListenedArtistUsernames, ...topFollowedArtistUsernames]),
    ].map(async (username) => {
      try {
        return (await this.getArtistStation(username, userId, ip)).data;
      } catch (e) {
        return null;
      }
    });
    const stations = await Promise.all(stationPromises);
    await this.redis.set(`recommended_stations:${userId}`, JSON.stringify(stations), {
      EX: RECOMMENDED_STATIONS_TTL_SECS,
    });
    return {
      status: 'success',
      data: stations.filter((s): s is NonNullable<typeof s> => s !== null),
    };
  }

  async createTrendingMusicPlaylists() {
    const trendingMusicUser = await this.userService.findByUsername(TRENDING_MUSIC_USER.username);
    if (!trendingMusicUser) throw new Error('Trending Music user not found');
    const defaultGenres = await this.genreRepository.findByNames([...DEFAULT_GENRE_NAMES]);
    const createPlaylistPromises = defaultGenres.map((genre) =>
      this.createTrendingMusicPlaylistByGenre(genre, trendingMusicUser.userId)
    );
    await Promise.all(createPlaylistPromises);
  }

  async createTrendingMusicPlaylistByGenre(genre: Genre, userId: string) {
    const topTracks = await this.trackRepository.findPopularTracksByGenreOrTags(
      genre.genreId,
      [genre],
      1,
      50
    );
    if (topTracks.length === 0) return null;

    const existingPlaylist = await this.playlistRepository.getPlaylistByUserAndTitle(
      userId,
      genre.name
    );
    let playlistId = existingPlaylist ? existingPlaylist.playlistId : null;
    if (!playlistId) {
      const createPlaylistDto: CreatePlaylistDto = {
        title: genre.name,
        description: `Trending in ${genre.name}.`,
        coverImage: topTracks[0].coverImage,
        isPublic: true,
      };

      const playlist = await this.playlistRepository.createPlaylist(createPlaylistDto, userId);
      playlistId = playlist.playlistId;
      await this.playlistRepository.updatePlaylistGenre(playlistId, genre);
    } else {
      // If playlist already exists, clear existing tracks before adding new ones
      await this.playlistRepository.clearPlaylistTracks(playlistId);
    }
    const addTrackPromises = topTracks.map((track, index) =>
      this.playlistRepository.addTrackToPlaylist(playlistId!, track.trackId, index + 1)
    );
    await Promise.all(addTrackPromises);
    return playlistId;
  }

  async getTrendingMusicPlaylists(userId: string) {
    const trendingMusicUser = await this.userService.findByUsername(TRENDING_MUSIC_USER.username);
    if (!trendingMusicUser) throw new Error('Trending Music user not found');

    // get genres of tracks the user has interacted with
    const interactedTrackTags = await this.trackService.getUserInteractedTrackTags(userId);
    // determine top 5 most interacted genres
    const tagFrequency = interactedTrackTags.reduce<
      Record<string, { count: number; name: string }>
    >((acc, tag) => {
      acc[tag.genreId] = acc[tag.genreId]
        ? { ...acc[tag.genreId], count: acc[tag.genreId].count + 1 }
        : { count: 1, name: tag.name };
      return acc;
    }, {});
    const topTagNames = Object.entries(tagFrequency)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([_, value]) => value.name);

    console.log('Top tags for user:', topTagNames);

    if (topTagNames.length === 0) {
      return { status: 'success', data: [] };
    }

    const playlists = await this.playlistRepository.getPlaylistByUserAndTitles(
      trendingMusicUser.userId,
      topTagNames
    );

    console.log(
      'Found playlists:',
      playlists.map((p) => p.title)
    );

    const isFollowedByCurrentUser = await this.followersRepository.isFollowing(
      userId,
      trendingMusicUser.userId
    );

    const mappedPlaylistsPromises = playlists.map(async (playlist) => ({
      playlistId: playlist.playlistId,
      title: playlist.title,
      description: playlist.description,
      coverImage: playlist.coverImage,
      isPublic: playlist.isPublic,
      tracksCount: playlist.tracksCount,
      likesCount: playlist.likesCount,
      repostsCount: playlist.repostsCount,
      durationSeconds: playlist.totalDurationSeconds,
      createdAt: playlist.createdAt,
      user: {
        userId: trendingMusicUser.userId,
        username: trendingMusicUser.username,
        displayName: trendingMusicUser.displayName,
        avatarUrl: trendingMusicUser.avatarUrl,
        isFollowedByCurrentUser,
      },
      isLiked:
        (await this.playlistRepository.findLikeByUserAndPlaylist(userId, playlist.playlistId)) !==
        null,
    }));

    const mappedPlaylists = await Promise.all(mappedPlaylistsPromises);

    return {
      status: 'success',
      data: mappedPlaylists,
    };
  }

  async getLikedByUsers(userId: string) {
    const users = await this.activityService.getLikedByUsers(userId);
    return {
      status: 'success',
      data: users,
    };
  }
}
