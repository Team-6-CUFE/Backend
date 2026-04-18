import { applyDecorators } from '@nestjs/common';

import { ApiOperation, ApiResponse, ApiParam, ApiCookieAuth } from '@nestjs/swagger';

export function ApiGetFeed() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove a playlist repost',
      description: 'Removes a previous repost of a playlist.',
    }),
    ApiParam({
      name: 'playlistId',
      description: 'UUID of the playlist to unrepost',
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Playlist repost successfully removed',
      schema: {
        example: {
          status: 'success',
          message: 'Playlist repost successfully removed',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'User has not reposted this playlist',
      schema: {
        example: { statusCode: 403, message: 'You have not reposted this playlist' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: {
        example: { statusCode: 404, message: 'Playlist not found' },
      },
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
