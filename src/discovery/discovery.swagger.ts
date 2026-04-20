import { applyDecorators } from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

export function ApiGetFeed() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get following feed',
      description:
        'Returns a paginated feed of recent track and playlist activities from users the authenticated user follows. ' +
        'Each item contains an activity record plus the full target (track or playlist). ' +
        "For tracks blocked in the requester's region, `audioUrl` is returned as `null`.",
    }),
    ApiBody({
      required: false,
      schema: {
        type: 'object',
        properties: {
          includeReposts: {
            type: 'boolean',
            description: 'Whether to include repost activities (default: true)',
            example: true,
          },
        },
      },
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of activities per page (default: 20)',
      example: 20,
    }),
    ApiResponse({
      status: 200,
      description:
        "Feed retrieved successfully. `audioUrl` is `null` for tracks blocked in the requester's region.",
      schema: {
        example: [
          {
            activityId: 'act-uuid-1',
            activityType: 'track_posted',
            targetId: 'track-uuid-1',
            userId: 'user-uuid',
            targetUserId: null,
            createdAt: '2026-04-17T10:00:00.000Z',
            user: {
              userId: 'user-uuid',
              username: 'dj_nour',
              displayName: 'DJ Nour',
              avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
            },
            target: {
              trackId: 'track-uuid-1',
              title: 'Midnight Drive',
              audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
              coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              durationSeconds: 213,
              playCount: 1200,
              likesCount: 87,
              repostsCount: 13,
              commentsCount: 5,
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
              },
            },
          },
          {
            activityId: 'act-uuid-2',
            activityType: 'track_repost',
            targetId: 'track-uuid-2',
            userId: 'user-uuid-2',
            targetUserId: null,
            createdAt: '2026-04-16T08:00:00.000Z',
            user: {
              userId: 'user-uuid-2',
              username: 'listener1',
              displayName: 'Listener One',
              avatarUrl: null,
            },
            target: {
              trackId: 'track-uuid-2',
              title: 'Region Locked Track',
              audioUrl: null,
              coverImage: 'https://cdn.harmonica.com/covers/locked.jpg',
              genre: 'Electronic',
              isBlocked: true,
              user: {
                userId: 'user-uuid-3',
                username: 'artist3',
                displayName: 'Artist Three',
                avatarUrl: null,
              },
            },
          },
        ],
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get User Recent Activities ───────────────────────────────────────────────

export function ApiGetUserRecentActivities() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: "Get a user's recent activities",
      description:
        "Returns a paginated list of a public user's recent track and playlist activities (posts and reposts). " +
        "For tracks blocked in the requester's region, `audioUrl` is returned as `null`.",
    }),
    ApiParam({
      name: 'username',
      description: 'The username of the target user',
      type: 'string',
      example: 'dj_nour',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of activities per page (default: 20)',
      example: 20,
    }),
    ApiResponse({
      status: 200,
      description:
        "Activities retrieved successfully. `audioUrl` is `null` for tracks blocked in the requester's region.",
      schema: {
        example: [
          {
            activityId: 'act-uuid-1',
            activityType: 'track_posted',
            targetId: 'track-uuid-1',
            userId: 'user-uuid',
            targetUserId: null,
            createdAt: '2026-04-17T10:00:00.000Z',
            user: {
              userId: 'user-uuid',
              username: 'dj_nour',
              displayName: 'DJ Nour',
              avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
            },
            target: {
              trackId: 'track-uuid-1',
              title: 'Midnight Drive',
              audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
              coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              durationSeconds: 213,
              playCount: 1200,
              likesCount: 87,
              repostsCount: 13,
              commentsCount: 5,
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
              },
            },
          },
        ],
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: { example: { statusCode: 404, message: 'User not found' } },
    }),
    ApiResponse({
      status: 403,
      description: "User's activities are private",
      schema: { example: { statusCode: 403, message: 'User activities are private' } },
    })
  );
}

// ─── Get Track Station ────────────────────────────────────────────────────────

export function ApiGetTrackStation() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get track station',
      description:
        'Returns a dynamically generated station (playlist) seeded by a specific track. ' +
        'The station is built from tracks that share fans, genres, and tags with the seed track. ' +
        'Stations are cached for 7 days before being regenerated. ' +
        "For tracks blocked in the requester's region, `audioUrl` and `waveformUrl` are returned as `null`.",
    }),
    ApiParam({
      name: 'artist_username',
      description: 'Username of the artist who owns the seed track',
      type: 'string',
      example: 'dj_nour',
    }),
    ApiParam({
      name: 'track_name',
      description: 'Title of the seed track',
      type: 'string',
      example: 'Midnight Drive',
    }),
    ApiResponse({
      status: 200,
      description:
        "Station retrieved successfully. `audioUrl` and `waveformUrl` per track are `null` when blocked in the requester's region.",
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Midnight Drive',
            description: null,
            coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
            tracksCount: 25,
            durationSeconds: 5400,
            likesCount: 0,
            createdAt: '2026-04-17T10:00:00.000Z',
            trackArtist: {
              userId: 'user-uuid',
              displayName: 'DJ Nour',
              avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
            },
            tracks: [
              {
                position: 1,
                trackId: 'track-uuid-1',
                title: 'Midnight Drive',
                durationSeconds: 213,
                coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
                audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
                waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
                playCount: 12000,
                likesCount: 870,
                repostsCount: 130,
                commentsCount: 45,
                artist: {
                  userId: 'user-uuid',
                  username: 'dj_nour',
                  displayName: 'DJ Nour',
                  avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                },
              },
              {
                position: 2,
                trackId: 'track-uuid-2',
                title: 'Region Locked Track',
                durationSeconds: 198,
                coverImage: 'https://cdn.harmonica.com/covers/locked.jpg',
                audioUrl: null,
                waveformUrl: null,
                playCount: 3400,
                likesCount: 210,
                repostsCount: 30,
                commentsCount: 8,
                artist: {
                  userId: 'user-uuid-2',
                  username: 'artist2',
                  displayName: 'Artist Two',
                  avatarUrl: null,
                },
              },
            ],
            featuredArtists: [
              {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                trackCount: 34,
                followersCount: 5200,
                isFollowedByCurrentUser: false,
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is not public or is hidden',
      schema: { example: { statusCode: 403, message: 'Track is not accessible' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: { example: { statusCode: 404, message: 'Track not found' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Artist Station ───────────────────────────────────────────────────────

export function ApiGetArtistStation() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get artist station',
      description:
        'Returns a dynamically generated station (playlist) seeded by a specific username. ' +
        'The station is built from tracks that share fans, genres, and tags with the user popular tracks. ' +
        'Stations are cached for 7 days before being regenerated. ' +
        "For tracks blocked in the requester's region, `audioUrl` and `waveformUrl` are returned as `null`.",
    }),
    ApiParam({
      name: 'username',
      description: 'Username of the artist who owns the station',
      type: 'string',
      example: 'dj_nour',
    }),
    ApiResponse({
      status: 200,
      description:
        "Station retrieved successfully. `audioUrl` and `waveformUrl` per track are `null` when blocked in the requester's region.",
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'DJ Nour Station',
            description: null,
            coverImage: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
            tracksCount: 25,
            durationSeconds: 5400,
            likesCount: 0,
            createdAt: '2026-04-17T10:00:00.000Z',
            trackArtist: {
              userId: 'user-uuid-1',
              displayName: 'DJ Nour',
              avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
            },
            tracks: [
              {
                position: 1,
                trackId: 'track-uuid-1',
                title: 'Midnight Drive',
                durationSeconds: 213,
                coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
                audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
                waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
                playCount: 12000,
                likesCount: 870,
                repostsCount: 130,
                commentsCount: 45,
                artist: {
                  userId: 'user-uuid',
                  username: 'dj_nour',
                  displayName: 'DJ Nour',
                  avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                },
              },
              {
                position: 2,
                trackId: 'track-uuid-2',
                title: 'Region Locked Track',
                durationSeconds: 198,
                coverImage: 'https://cdn.harmonica.com/covers/locked.jpg',
                audioUrl: null,
                waveformUrl: null,
                playCount: 3400,
                likesCount: 210,
                repostsCount: 30,
                commentsCount: 8,
                artist: {
                  userId: 'user-uuid-2',
                  username: 'artist2',
                  displayName: 'Artist Two',
                  avatarUrl: null,
                },
              },
            ],
            featuredArtists: [
              {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                trackCount: 34,
                followersCount: 5200,
                isFollowedByCurrentUser: false,
              },
              {
                userId: 'user-uuid-2',
                username: 'artist2',
                displayName: 'Artist Two',
                avatarUrl: null,
                trackCount: 12,
                followersCount: 800,
                isFollowedByCurrentUser: true,
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'User is private',
      schema: { example: { statusCode: 403, message: 'User is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: { example: { statusCode: 404, message: 'User not found' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
