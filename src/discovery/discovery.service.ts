import { Injectable } from '@nestjs/common';
// import { DiscoveryRepository } from './discovery.repository';
import { FollowersRepository } from '../followers/followers.repository';
import { ActivityService } from '../activity/activity.service';
import { ActivityType } from '../activity/entities/activity.entity';
import { TrackRepository } from '../track/track.repository';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { getLocationFromIp } from '../common/utilities/geolocation.util';
import { UserService } from '../user/user.service';

@Injectable()
export class DiscoveryService {
  constructor(
    // private readonly discoveryRepository: DiscoveryRepository,
    private readonly followersRepository: FollowersRepository,
    private readonly activityService: ActivityService,
    private readonly trackRepository: TrackRepository,
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
    console.log('Target user:', targetUser);
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
}
