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
        "For tracks blocked in the requester's region, only `audioUrl` is returned as `null`; all other fields (including `waveformUrl`) are still returned." +
        'Returns max 3 featured artists.',
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
        "Station retrieved successfully. Only `audioUrl` per track is `null` when blocked in the requester's region; `waveformUrl` and all other fields are always returned.",
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
              username: 'dj_nour',
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
                isLiked: false,
                isReposted: false,
                artist: {
                  userId: 'user-uuid',
                  username: 'dj_nour',
                  displayName: 'DJ Nour',
                  avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                  city: 'Cairo',
                  country: 'EG',
                  followersCount: 5200,
                },
              },
              {
                position: 2,
                trackId: 'track-uuid-2',
                title: 'Region Locked Track',
                durationSeconds: 198,
                coverImage: 'https://cdn.harmonica.com/covers/locked.jpg',
                audioUrl: null,
                waveformUrl: 'https://cdn.harmonica.com/waveforms/locked.json',
                playCount: 3400,
                likesCount: 210,
                repostsCount: 30,
                commentsCount: 8,
                isLiked: false,
                isReposted: false,
                artist: {
                  userId: 'user-uuid-2',
                  username: 'artist2',
                  displayName: 'Artist Two',
                  avatarUrl: null,
                  city: 'Alexandria',
                  country: 'EG',
                  followersCount: 800,
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
      description: 'Track is not accessible',
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

// ─── Get User Popular Tracks ──────────────────────────────────────────────────

export function ApiGetUserPopularTracks() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: "Get a user's popular tracks",
      description:
        'Returns the top 10 most popular public tracks for a given user, sorted by popularity score. ' +
        "For tracks blocked in the requester's region, `audioUrl` is returned as `null`.",
    }),
    ApiParam({
      name: 'username',
      description: 'The username of the target user',
      type: 'string',
      example: 'dj_nour',
    }),
    ApiResponse({
      status: 200,
      description:
        "Popular tracks retrieved successfully. `audioUrl` is `null` for tracks blocked in the requester's region.",
      schema: {
        example: {
          status: 'success',
          data: [
            {
              trackId: 'track-uuid-1',
              title: 'Midnight Drive',
              coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
              waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
              durationSeconds: 213,
              playCount: 12000,
              likesCount: 870,
              repostsCount: 130,
              commentsCount: 45,
              isLiked: false,
              isReposted: false,
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
              },
            },
          ],
        },
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
      description: 'Access forbidden (block relationship)',
      schema: { example: { statusCode: 403, message: "You cannot view this user's profile" } },
    })
  );
}

// ─── Get More Of What You Like ────────────────────────────────────────────────

export function ApiGetMoreOfWhatYouLike() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get personalised track recommendations',
      description:
        "Returns tracks tailored to the authenticated user's listening history by analysing their " +
        'top interacted tags and surfacing the most popular tracks with those tags. ' +
        "For tracks blocked in the requester's region, `audioUrl` is returned as `null`.",
    }),
    ApiResponse({
      status: 200,
      description:
        'Recommendations retrieved successfully. `audioUrl` is `null` for blocked tracks.',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              trackId: 'track-uuid-1',
              title: 'Midnight Drive',
              coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
              waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
              durationSeconds: 213,
              playCount: 12000,
              likesCount: 870,
              repostsCount: 130,
              commentsCount: 45,
              isLiked: true,
              isReposted: false,
              createdAt: '2026-04-17T10:00:00.000Z',
              mainArtists: ['dj_nour'],
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                city: 'Cairo',
                country: 'EG',
              },
              genre: {
                genreId: 'genre-uuid-1',
                name: 'Electronic',
              },
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function ApiSearch() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Search catalog',
      description:
        'Full-text search across tracks, playlists, albums and users. ' +
        'Supports optional filters for entity type, tag/genre, city, duration, and upload date. ' +
        "For tracks blocked in the requester's region, `audioUrl` is returned as `null`.",
    }),
    ApiQuery({
      name: 'q',
      required: true,
      type: String,
      description: 'Search query',
      example: 'midnight',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: ['track', 'playlist', 'album', 'user', 'all'],
      description: 'Entity type to filter results (default: all)',
    }),
    ApiQuery({
      name: 'tag',
      required: false,
      type: String,
      description: 'Filter by genre/tag name',
      example: 'Electronic',
    }),
    ApiQuery({
      name: 'city',
      required: false,
      type: String,
      description: 'Filter users by city',
      example: 'Cairo',
    }),
    ApiQuery({
      name: 'duration',
      required: false,
      enum: ['<2', '2-10', '10-30', '>30'],
      description: 'Filter tracks by duration range (minutes). Only applied when type=track.',
    }),
    ApiQuery({
      name: 'created',
      required: false,
      enum: ['h', 'd', 'w', 'm', 'y'],
      description: 'Filter by upload recency: h=last hour, d=day, w=week, m=month, y=year.',
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
      description: 'Results per page (default: 20)',
      example: 20,
    }),
    ApiResponse({
      status: 200,
      description: 'Search results returned successfully.',
      schema: {
        example: {
          status: 'success',
          total: 42,
          data: [
            {
              type: 'track',
              trackId: 'track-uuid-1',
              title: 'Midnight Drive',
              coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
              waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
              durationSeconds: 213,
              playCount: 12000,
              likesCount: 870,
              repostsCount: 130,
              commentsCount: 45,
              mainArtists: ['dj_nour'],
              createdAt: '2026-04-17T10:00:00.000Z',
              isLiked: false,
              isReposted: false,
              genre: { genreId: 'genre-uuid-1', name: 'Electronic' },
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                followersCount: 5200,
                city: 'Cairo',
                country: 'EG',
              },
            },
            {
              type: 'playlist',
              playlistId: 'playlist-uuid-1',
              title: 'Late Night Vibes',
              description: 'A chill collection for the late hours',
              coverImage: 'https://cdn.harmonica.com/covers/lnv.jpg',
              tracksCount: 8,
              durationSeconds: 1920,
              likesCount: 340,
              repostsCount: 22,
              createdAt: '2026-03-10T18:00:00.000Z',
              isLiked: true,
              isReposted: false,
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                city: 'Cairo',
                country: 'EG',
                followersCount: 5200,
              },
              playlistTracks: [
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
                  isLiked: true,
                  isReposted: false,
                  artist: {
                    userId: 'user-uuid',
                    username: 'dj_nour',
                    displayName: 'DJ Nour',
                    avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                    city: 'Cairo',
                    country: 'EG',
                    followersCount: 5200,
                  },
                },
              ],
            },
            {
              type: 'user',
              userId: 'user-uuid-2',
              username: 'midnight_bass',
              displayName: 'Midnight Bass',
              avatarUrl: null,
              city: 'Cairo',
              country: 'EG',
              followersCount: 820,
              isFollowedByCurrentUser: false,
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid duration or created filter value' }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Search Autocomplete ──────────────────────────────────────────────────────

export function ApiSearchAutocomplete() {
  return applyDecorators(
    ApiOperation({
      summary: 'Autocomplete search suggestions',
      description:
        'Returns up to 8 deduplicated string suggestions (track titles, usernames, display names) ' +
        'matching the given prefix query. Does not require authentication.',
    }),
    ApiQuery({
      name: 'q',
      required: true,
      type: String,
      description: 'Partial search query',
      example: 'mid',
    }),
    ApiResponse({
      status: 200,
      description: 'Suggestions returned successfully.',
      schema: {
        example: {
          status: 'success',
          data: ['midnight drive', 'midnight bass', 'midtown vibes'],
        },
      },
    })
  );
}

// ─── Get Recommended Stations ─────────────────────────────────────────────────

export function ApiGetRecommendedStations() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get recommended artist stations',
      description:
        "Returns a list of artist stations curated from the authenticated user's listening history " +
        '(last listened artists) and the most popular artists they follow. ' +
        'Results are cached per user for 7 days.',
    }),
    ApiResponse({
      status: 200,
      description: 'Recommended stations retrieved successfully.',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: 'station-uuid-1',
              title: 'DJ Nour Station',
              description: null,
              coverImage: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
              tracksCount: 25,
              durationSeconds: 5400,
              likesCount: 0,
              isLiked: false,
              createdAt: '2026-04-17T10:00:00.000Z',
              trackArtist: {
                userId: 'user-uuid-1',
                username: 'dj_nour',
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
                  isLiked: false,
                  isReposted: false,
                  artist: {
                    userId: 'user-uuid-1',
                    username: 'dj_nour',
                    displayName: 'DJ Nour',
                    avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                    city: 'Cairo',
                    country: 'EG',
                    followersCount: 5200,
                  },
                },
              ],
              featuredArtists: [
                {
                  userId: 'user-uuid-1',
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
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Trending Music By Genre ─────────────────────────────────────────────

export function ApiGetTrendingMusicByGenre() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get trending music by genre',
      description:
        "Returns a list of genre-based playlists curated by the platform's Trending Music account, " +
        "personalised to the authenticated user's top 5 most interacted genres (from likes, reposts and plays). " +
        'Returns random genres when the user has no interaction history.',
    }),
    ApiResponse({
      status: 200,
      description: 'Trending playlists by genre retrieved successfully.',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: 'playlist-uuid-1',
              title: 'Electronic',
              description: 'Top trending Electronic tracks',
              coverImage: 'https://cdn.harmonica.com/covers/electronic.jpg',
              isPublic: true,
              tracksCount: 20,
              likesCount: 340,
              repostsCount: 22,
              durationSeconds: 4800,
              createdAt: '2026-04-17T10:00:00.000Z',
              isLiked: false,
              user: {
                userId: 'user-uuid',
                username: 'trending_music',
                displayName: 'Trending Music',
                avatarUrl: null,
                isFollowedByCurrentUser: false,
              },
            },
            {
              playlistId: 'playlist-uuid-2',
              title: 'Hip Hop',
              description: 'Top trending Hip Hop tracks',
              coverImage: 'https://cdn.harmonica.com/covers/hiphop.jpg',
              isPublic: true,
              tracksCount: 20,
              likesCount: 210,
              repostsCount: 15,
              durationSeconds: 4200,
              createdAt: '2026-04-17T10:00:00.000Z',
              isLiked: true,
              user: {
                userId: 'user-uuid',
                username: 'trending_music',
                displayName: 'Trending Music',
                avatarUrl: null,
                isFollowedByCurrentUser: false,
              },
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiGetPublicTrendingMusicByGenre() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get trending music by genre',
      description:
        "Returns a list of genre-based playlists curated by the platform's Trending Music account, " +
        "Returns random genres because the user isn't authenticated.",
    }),
    ApiResponse({
      status: 200,
      description: 'Trending playlists by genre retrieved successfully.',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: 'playlist-uuid-1',
              title: 'Electronic',
              description: 'Top trending Electronic tracks',
              coverImage: 'https://cdn.harmonica.com/covers/electronic.jpg',
              isPublic: true,
              tracksCount: 20,
              likesCount: 340,
              repostsCount: 22,
              durationSeconds: 4800,
              createdAt: '2026-04-17T10:00:00.000Z',
              isLiked: false,
              user: {
                userId: 'user-uuid',
                username: 'trending_music',
                displayName: 'Trending Music',
                avatarUrl: null,
                isFollowedByCurrentUser: false,
              },
            },
            {
              playlistId: 'playlist-uuid-2',
              title: 'Hip Hop',
              description: 'Top trending Hip Hop tracks',
              coverImage: 'https://cdn.harmonica.com/covers/hiphop.jpg',
              isPublic: true,
              tracksCount: 20,
              likesCount: 210,
              repostsCount: 15,
              durationSeconds: 4200,
              createdAt: '2026-04-17T10:00:00.000Z',
              isLiked: true,
              user: {
                userId: 'user-uuid',
                username: 'trending_music',
                displayName: 'Trending Music',
                avatarUrl: null,
                isFollowedByCurrentUser: false,
              },
            },
          ],
        },
      },
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
        "For tracks blocked in the requester's region, only `audioUrl` is returned as `null`; all other fields (including `waveformUrl`) are still returned. " +
        'Returns max 3 featured artists.',
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
        "Station retrieved successfully. Only `audioUrl` per track is `null` when blocked in the requester's region; `waveformUrl` and all other fields are always returned.",
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
              username: 'dj_nour',
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
                isLiked: false,
                isReposted: false,
                artist: {
                  userId: 'user-uuid',
                  username: 'dj_nour',
                  displayName: 'DJ Nour',
                  avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                  city: 'Cairo',
                  country: 'EG',
                  followersCount: 5200,
                },
              },
              {
                position: 2,
                trackId: 'track-uuid-2',
                title: 'Region Locked Track',
                durationSeconds: 198,
                coverImage: 'https://cdn.harmonica.com/covers/locked.jpg',
                audioUrl: null,
                waveformUrl: 'https://cdn.harmonica.com/waveforms/locked.json',
                playCount: 3400,
                likesCount: 210,
                repostsCount: 30,
                commentsCount: 8,
                isLiked: false,
                isReposted: false,
                artist: {
                  userId: 'user-uuid-2',
                  username: 'artist2',
                  displayName: 'Artist Two',
                  avatarUrl: null,
                  city: null,
                  country: null,
                  followersCount: 800,
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

// ─── Get Tracks By Tag ────────────────────────────────────────────────────────

export function ApiGetTracksByTag() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get tracks or playlists by tag',
      description:
        'Returns a paginated list of tracks or playlists that match the given tag (genre) name. ' +
        'Use the `type` query parameter to switch between results: ' +
        '`recent` (default) and `popular` return tracks; `playlists` returns playlists. ' +
        "Audio URLs are nulled out for tracks blocked in the requester's region.",
    }),
    ApiParam({
      name: 'tag_name',
      description: 'The tag (genre) name to filter by',
      example: 'Electronic',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: ['recent', 'popular', 'playlists'],
      description: 'Result type: tracks by date (recent), by plays (popular), or playlists',
      example: 'recent',
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
      description: 'Items per page (default: 20)',
      example: 20,
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated tracks or playlists for the tag',
      schema: {
        oneOf: [
          {
            title: 'Tracks response (type=recent or type=popular)',
            example: {
              status: 'success',
              data: [
                {
                  trackId: 'track-uuid-1',
                  title: 'Midnight Drive',
                  audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
                  waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
                  coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
                  durationSeconds: 213,
                  playCount: 1200,
                  likesCount: 87,
                  repostsCount: 13,
                  commentsCount: 5,
                  isLiked: false,
                  isReposted: false,
                  createdAt: '2026-04-17T10:00:00.000Z',
                  mainArtists: ['dj_nour'],
                  genre: { genreId: 'genre-uuid-1', name: 'Electronic' },
                  user: {
                    userId: 'user-uuid',
                    username: 'dj_nour',
                    displayName: 'DJ Nour',
                    avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                    city: null,
                    country: null,
                    followersCount: 500,
                  },
                },
              ],
              pagination: {
                currentPage: 1,
                totalPages: 5,
                totalCount: 100,
                limit: 20,
              },
            },
          },
          {
            title: 'Playlists response (type=playlists)',
            example: {
              status: 'success',
              data: {
                playlistId: 'e77da41d-8152-4043-91cf-60179ad36a6b',
                title: 'Weak',
                description: 'Based on Weak',
                coverImage: 'https://picsum.photos/seed/YBdRS/500/500',
                tracksCount: 5,
                durationSeconds: 1433,
                likesCount: 0,
                isLiked: false,
                isReposted: false,
                createdAt: '2026-04-24T15:14:48.292Z',
                user: {
                  userId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
                  username: 'artist1',
                  displayName: 'John Doe',
                  avatarUrl: null,
                  city: 'Cairo',
                  country: 'EG',
                  followersCount: 0,
                },
                tracks: [
                  {
                    position: 1,
                    trackId: '5ec4ad0d-9c02-44ff-b66e-0a3fb396a0f7',
                    title: 'Weak',
                    durationSeconds: 324,
                    coverImage: 'https://picsum.photos/seed/YBdRS/500/500',
                    audioUrl:
                      'https://cdn.soundcloud-clone.com/audio/44f172c3-7c58-47a9-aa0a-c38794254c77.mp3',
                    waveformUrl:
                      'https://cdn.soundcloud-clone.com/waveforms/44f172c3-7c58-47a9-aa0a-c38794254c77.json',
                    playCount: 51337,
                    likesCount: 14,
                    repostsCount: 7,
                    commentsCount: 8,
                    isLiked: false,
                    isReposted: false,
                    artist: {
                      userId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
                      username: 'artist1',
                      displayName: 'John Doe',
                      avatarUrl: null,
                      city: null,
                      country: null,
                      followersCount: 0,
                    },
                  },
                ],
              },
              pagination: {
                currentPage: 1,
                totalPages: 5,
                totalCount: 100,
                limit: 20,
              },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Tag not found',
      schema: { example: { statusCode: 404, message: 'Tag not found' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Liked By Users (current user) ───────────────────────────────────────

export function ApiGetLikedByUsers() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get users who liked the current user tracks',
      description:
        'Returns up to 8 public users (followers of the current user) who have recently ' +
        "liked any of the current user's tracks or playlists. " +
        'The result is a raw query response — field names use the TypeORM raw alias format.',
    }),
    ApiResponse({
      status: 200,
      description: 'Users who liked the current user tracks',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              userId: 'cf23bd6c-022c-4fdf-84a4-8133fbcc2b74',
              username: 'listener1',
              displayName: 'Listener One',
              avatarUrl: 'https://cdn.harmonica.com/avatars/listener1.jpg',
            },
            {
              userId: 'd8bf664c-cbe6-4164-8663-c609776b16be',
              username: 'tina.kozey98',
              displayName: 'Tina Kozey',
              avatarUrl: null,
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Liked-By Content For A Specific User ─────────────────────────────────

export function ApiGetLikedByUsersForUser() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get tracks and playlists liked by a user',
      description:
        'Returns the paginated tracks and playlists that a specific user has liked. ' +
        'Throws 403 when the target account is private and is not the authenticated user. ' +
        "For tracks blocked in the requester's region, `audioUrl` is returned as `null`.",
    }),
    ApiParam({
      name: 'userId',
      description: 'Target user UUID',
      example: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
    }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiResponse({
      status: 200,
      description:
        'Liked tracks and playlists for the user. `audioUrl` is `null` for region-blocked tracks.',
      schema: {
        example: {
          status: 'success',
          tracks: {
            data: [
              {
                trackId: 'track-uuid-1',
                title: 'Midnight Drive',
                coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
                audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
                waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
                playCount: 12000,
                likesCount: 870,
                repostsCount: 130,
                commentsCount: 45,
                durationSeconds: 213,
                mainArtists: ['DJ Nour'],
                createdAt: '2026-04-17T10:00:00.000Z',
                isLiked: true,
                isReposted: false,
                user: {
                  userId: 'user-uuid',
                  username: 'dj_nour',
                  displayName: 'DJ Nour',
                  avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                  followersCount: 5200,
                  city: 'Cairo',
                  country: 'EG',
                },
                genre: {
                  genreId: 'genre-uuid-1',
                  name: 'Electronic',
                },
              },
            ],
            total: 1,
          },
          playlists: {
            data: [
              {
                playlistId: 'playlist-uuid-1',
                title: 'Chill Vibes',
                description: 'A relaxing playlist',
                coverImage: 'https://cdn.harmonica.com/covers/chill.jpg',
                tracksCount: 10,
                durationSeconds: 2400,
                likesCount: 230,
                repostsCount: 15,
                createdAt: '2026-03-10T08:00:00.000Z',
                isLiked: true,
                isReposted: false,
                user: {
                  userId: 'user-uuid-2',
                  username: 'curator_sam',
                  displayName: 'Sam Curator',
                  avatarUrl: null,
                  city: null,
                  country: null,
                  followersCount: 320,
                },
                playlistTracks: [
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
                    isLiked: false,
                    isReposted: false,
                    artist: {
                      userId: 'user-uuid',
                      username: 'dj_nour',
                      displayName: 'DJ Nour',
                      avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                      city: 'Cairo',
                      country: 'EG',
                      followersCount: 5200,
                    },
                  },
                ],
              },
            ],
            total: 1,
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Account is private',
      schema: { example: { statusCode: 403, message: 'This account is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: { example: { statusCode: 404, message: 'User not found' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get More Albums Of What You Like ─────────────────────────────────────────

export function ApiGetMoreAlbumsOfWhatYouLike() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get albums based on your listening taste',
      description:
        "Returns albums that match the authenticated user's top 5 most-interacted album genres. " +
        'Each album is formatted via `formatPlaylist` (same shape as a playlist). ' +
        'Returns an empty array when the user has no album interaction history. ' +
        "For tracks inside `playlistTracks` blocked in the requester's region, `audioUrl` is `null`.",
    }),
    ApiResponse({
      status: 200,
      description: 'Albums matching the user taste',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: 'album-uuid-1',
              title: 'Electronica Vol. 1',
              description: null,
              coverImage: 'https://cdn.harmonica.com/covers/electronica.jpg',
              tracksCount: 12,
              durationSeconds: 2640,
              likesCount: 430,
              repostsCount: 22,
              createdAt: '2026-02-01T12:00:00.000Z',
              isLiked: false,
              isReposted: false,
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                city: 'Cairo',
                country: 'EG',
                followersCount: 5200,
              },
              playlistTracks: [
                {
                  position: 1,
                  trackId: 'track-uuid-1',
                  title: 'Neon Pulse',
                  durationSeconds: 245,
                  coverImage: 'https://cdn.harmonica.com/covers/neon.jpg',
                  audioUrl: 'https://cdn.harmonica.com/audio/neon.mp3',
                  waveformUrl: 'https://cdn.harmonica.com/waveforms/neon.json',
                  playCount: 8400,
                  likesCount: 310,
                  repostsCount: 45,
                  commentsCount: 12,
                  isLiked: false,
                  isReposted: false,
                  artist: {
                    userId: 'user-uuid',
                    username: 'dj_nour',
                    displayName: 'DJ Nour',
                    avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                    city: 'Cairo',
                    country: 'EG',
                    followersCount: 5200,
                  },
                },
              ],
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Discover Feed ────────────────────────────────────────────────────────

export function ApiGetDiscoverFeed() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get personalised discover feed',
      description:
        'Returns 15 randomly selected tracks from a personalised pool built from: ' +
        "new releases in the user's top genres, tracks related to recently played tracks, " +
        'and tracks related to top followed artists. ' +
        'The pool is cached per user (1-hour TTL). ' +
        'Each track carries a human-readable `reason` field explaining why it appears. ' +
        "`audioUrl` is `null` for tracks blocked in the requester's region.",
    }),
    ApiResponse({
      status: 200,
      description: '15 personalised tracks with reasons',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              trackId: 'track-uuid-1',
              title: 'Midnight Drive',
              coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              audioUrl: 'https://cdn.harmonica.com/audio/midnight.mp3',
              waveformUrl: 'https://cdn.harmonica.com/waveforms/midnight.json',
              playCount: 12000,
              likesCount: 870,
              repostsCount: 130,
              commentsCount: 45,
              durationSeconds: 213,
              mainArtists: ['DJ Nour'],
              createdAt: '2026-04-17T10:00:00.000Z',
              isLiked: false,
              isReposted: false,
              reason: 'New release by DJ Nour',
              user: {
                userId: 'user-uuid',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                followersCount: 5200,
                city: 'Cairo',
                country: 'EG',
              },
              genre: {
                genreId: 'genre-uuid-1',
                name: 'Electronic',
              },
            },
            {
              trackId: 'track-uuid-2',
              title: 'Neon Lights',
              coverImage: 'https://cdn.harmonica.com/covers/neon.jpg',
              audioUrl: 'https://cdn.harmonica.com/audio/neon.mp3',
              waveformUrl: 'https://cdn.harmonica.com/waveforms/neon.json',
              playCount: 5400,
              likesCount: 320,
              repostsCount: 40,
              commentsCount: 9,
              durationSeconds: 198,
              mainArtists: [],
              createdAt: '2026-04-10T08:00:00.000Z',
              isLiked: false,
              isReposted: false,
              reason: 'Because you played Midnight Drive',
              user: {
                userId: 'user-uuid-2',
                username: 'artist2',
                displayName: 'Artist Two',
                avatarUrl: null,
                followersCount: 800,
                city: null,
                country: null,
              },
              genre: {
                genreId: 'genre-uuid-2',
                name: 'Hip-Hop',
              },
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiGetArtistsToWatchOutFor() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get artists to watch out for',
      description:
        'Returns a list of artists that the user should watch out for based on their track plays.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of artists to watch out for',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              username: 'artist1',
              displayName: 'Artist One',
              avatarUrl: 'https://cdn.harmonica.com/avatars/artist1.jpg',
              followersCount: 1500,
            },
            {
              username: 'artist2',
              displayName: 'Artist Two',
              avatarUrl: 'https://cdn.harmonica.com/avatars/artist2.jpg',
              followersCount: 2000,
            },
          ],
        },
      },
    })
  );
}

// ─── Get Curated Playlists ────────────────────────────────────────────────────

export function ApiGetCuratedPlaylists() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get curated playlists',
      description:
        'Returns the top 5 trending tracks from the last month. ' +
        'Each entry contains the track title, artist username, artist display name, and cover image, ' +
        'enabling the client to request a track station for each track.',
    }),
    ApiResponse({
      status: 200,
      description: 'Curated playlist tracks retrieved successfully.',
      schema: {
        example: {
          status: 'success',
          data: {
            tracks: [
              {
                title: 'Midnight Drive',
                artistUsername: 'dj_nour',
                artistDisplayName: 'DJ Nour',
                coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              },
              {
                title: 'Solar Winds',
                artistUsername: 'luna_beats',
                artistDisplayName: 'Luna Beats',
                coverImage: 'https://cdn.harmonica.com/covers/solar.jpg',
              },
            ],
          },
        },
      },
    })
  );
}
