import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AddTrackDto } from './dto/add-track.dto';
import { CreatePlaylistDto } from './dto/create-playlist.dto';

export function ApiRepostPlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Repost a playlist',
      description:
        'Allows a user to repost a public playlist that they do not own. Checks: exists → private → own → duplicate.',
    }),
    ApiParam({
      name: 'playlistId',
      description: 'UUID of the playlist to repost',
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 201,
      description: 'Playlist successfully reposted',
      schema: {
        example: {
          status: 'success',
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440001',
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            repostedAt: '2026-03-31T13:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'User attempted to repost their own playlist',
      schema: {
        example: { statusCode: 400, message: 'You cannot repost your own playlist' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Playlist is private',
      schema: {
        example: { statusCode: 403, message: 'Cannot repost a private playlist' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: {
        example: { statusCode: 404, message: 'Playlist not found' },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Already reposted this playlist',
      schema: {
        example: { statusCode: 409, message: 'You have already reposted this playlist' },
      },
    })
  );
}

export function ApiUnrepostPlaylist() {
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

export function ApiGetPlaylistRepostCount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get playlist repost count',
      description: 'Returns the total number of times a public playlist has been reposted.',
    }),
    ApiParam({ name: 'playlistId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Count retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            repostCount: 42,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Playlist is private',
      schema: { example: { statusCode: 403, message: 'This playlist is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: { example: { statusCode: 404, message: 'Playlist not found' } },
    })
  );
}

export function ApiGetPlaylistReposts() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get users who reposted a playlist',
      description: 'Returns a paginated list of users who have reposted the specified playlist.',
    }),
    ApiParam({ name: 'playlistId', type: 'string', format: 'uuid' }),
    ApiQuery({
      name: 'page',
      required: false,
      example: 1,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      example: 20,
      description: 'Items per page, capped at 100 (default: 20)',
    }),
    ApiResponse({
      status: 200,
      description: 'Reposters retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              userId: '550e8400-e29b-41d4-a716-446655440001',
              username: 'johndoe',
              displayName: 'John Doe',
              avatarUrl: 'https://example.com/avatar.jpg',
              repostedAt: '2026-03-31T12:00:00Z',
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalCount: 50,
            limit: 20,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Playlist is private',
      schema: { example: { statusCode: 403, message: 'This playlist is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: { example: { statusCode: 404, message: 'Playlist not found' } },
    })
  );
}

export function ApiGetUserPlaylistReposts() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: "Get a user's playlist reposts",
      description:
        "Returns a paginated list of playlists that the specified user has reposted. Accessible for public accounts or the user's own account.",
    }),
    ApiParam({
      name: 'user_id',
      type: 'string',
      format: 'uuid',
      description: 'UUID of the user whose reposts to retrieve',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      example: 1,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      example: 20,
      description: 'Items per page, capped at 100 (default: 20)',
    }),
    ApiResponse({
      status: 200,
      description: 'User playlist reposts retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: '550e8400-e29b-41d4-a716-446655440000',
              title: 'Summer Hits',
              coverImage: 'https://example.com/cover.jpg',
              isPublic: true,
              tracksCount: 5,
              likesCount: 150,
              repostsCount: 12,
              user: {
                userId: '550e8400-e29b-41d4-a716-446655440002',
                username: 'playlist_creator',
                displayName: 'The Creator',
              },
              repostedAt: '2026-03-31T12:00:00Z',
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 2,
            totalCount: 25,
            limit: 20,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'This account is private',
      schema: { example: { statusCode: 403, message: 'This account is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: { example: { statusCode: 404, message: 'User not found' } },
    })
  );
}

export function ApiLikePlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Like a playlist',
      description:
        'Allows a user to like a public playlist or their own private playlist. Checks: exists → private → duplicate.',
    }),
    ApiParam({
      name: 'playlistId',
      type: 'string',
      format: 'uuid',
      description: 'UUID of the playlist to like',
    }),
    ApiResponse({
      status: 201,
      description: 'Playlist liked successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440001',
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            likedAt: '2026-03-31T13:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Cannot like a private playlist belonging to someone else',
      schema: { example: { statusCode: 403, message: 'Cannot like a private playlist' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: { example: { statusCode: 404, message: 'Playlist not found' } },
    }),
    ApiResponse({
      status: 409,
      description: 'Already liked this playlist',
      schema: { example: { statusCode: 409, message: 'You have already liked this playlist' } },
    })
  );
}

export function ApiUnlikePlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({ summary: 'Unlike a playlist', description: 'Removes a like from a playlist.' }),
    ApiParam({ name: 'playlistId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Playlist like successfully removed',
      schema: { example: { status: 'success', message: 'Playlist like successfully removed' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'You have not liked this playlist',
      schema: { example: { statusCode: 403, message: 'You have not liked this playlist' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: { example: { statusCode: 404, message: 'Playlist not found' } },
    })
  );
}

export function ApiGetPlaylistLikesCount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get playlist likes count',
      description: 'Returns the total number of likes for a playlist.',
    }),
    ApiParam({ name: 'playlistId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Count retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            likesCount: 42,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'This playlist is private',
      schema: { example: { statusCode: 403, message: 'This playlist is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: { example: { statusCode: 404, message: 'Playlist not found' } },
    })
  );
}

export function ApiGetPlaylistLikes() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get users who liked a playlist',
      description: 'Returns a paginated list of users who liked the specified playlist.',
    }),
    ApiParam({ name: 'playlistId', type: 'string', format: 'uuid' }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Items per page, capped at 100 (default: 20)',
    }),
    ApiResponse({
      status: 200,
      description: 'Users who liked the playlist retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              userId: '550e8400-e29b-41d4-a716-446655440001',
              username: 'user1',
              displayName: 'User One',
              avatarUrl: 'https://example.com/avatar.jpg',
              followersCount: 120,
              likedAt: '2026-03-31T12:00:00Z',
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalCount: 50,
            limit: 20,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'This playlist is private',
      schema: { example: { statusCode: 403, message: 'This playlist is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found',
      schema: { example: { statusCode: 404, message: 'Playlist not found' } },
    })
  );
}

export function ApiGetUserPlaylistLikes() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: "Get a user's liked playlists",
      description: 'Returns a paginated list of playlists that the specified user has liked.',
    }),
    ApiParam({ name: 'user_id', type: 'string', format: 'uuid', description: 'UUID of the user' }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Items per page, capped at 100 (default: 20)',
    }),
    ApiResponse({
      status: 200,
      description: 'User liked playlists retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: '550e8400-e29b-41d4-a716-446655440000',
              title: 'Summer Hits',
              coverImage: 'https://example.com/cover.jpg',
              isPublic: true,
              tracksCount: 5,
              likesCount: 150,
              repostsCount: 12,
              user: {
                userId: '550e8400-e29b-41d4-a716-446655440002',
                username: 'playlist_creator',
                displayName: 'The Creator',
              },
              likedAt: '2026-03-31T12:00:00Z',
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 2,
            totalCount: 25,
            limit: 20,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'This account is private',
      schema: { example: { statusCode: 403, message: 'This account is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: { example: { statusCode: 404, message: 'User not found' } },
    })
  );
}

// export function ApiDeletePlaylist() {
//   return applyDecorators(
//     ApiCookieAuth('access_token'),
//     ApiOperation({
//       summary: "Get a user's liked playlists",
//       description: 'Returns a paginated list of playlists that the specified user has liked.',
//     }),
//     ApiParam({ name: 'user_id', type: 'string', format: 'uuid', description: 'UUID of the user' }),
//     ApiQuery({
//       name: 'page',
//       required: false,
//       type: Number,
//       example: 1,
//       description: 'Page number (default: 1)',
//     }),
//     ApiQuery({
//       name: 'limit',
//       required: false,
//       type: Number,
//       example: 20,
//       description: 'Items per page, capped at 100 (default: 20)',
//     }),
//     ApiResponse({
//       status: 200,
//       description: 'User liked playlists retrieved successfully',
//       schema: {
//         example: {
//           status: 'success',
//           data: [
//             {
//               playlistId: '550e8400-e29b-41d4-a716-446655440000',
//               title: 'Summer Hits',
//               coverImage: 'https://example.com/cover.jpg',
//               isPublic: true,
//               tracksCount: 5,
//               likesCount: 150,
//               repostsCount: 12,
//               user: {
//                 userId: '550e8400-e29b-41d4-a716-446655440002',
//                 username: 'playlist_creator',
//                 displayName: 'The Creator',
//               },
//               likedAt: '2026-03-31T12:00:00Z',
//             },
//           ],
//           pagination: {
//             currentPage: 1,
//             totalPages: 2,
//             totalCount: 25,
//             limit: 20,
//           },
//         },
//       },
//     }),
//     ApiResponse({ status: 401, description: 'Unauthorized' }),
//     ApiResponse({
//       status: 403,
//       description: 'This account is private',
//       schema: { example: { statusCode: 403, message: 'This account is private' } },
//     }),
//     ApiResponse({
//       status: 404,
//       description: 'User not found',
//       schema: { example: { statusCode: 404, message: 'User not found' } },
//     })
//   );
// }

export function ApiCreatePlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Create a new playlist',
      description:
        'Creates a new playlist for the authenticated user. If private, a secret token is generated for sharing.',
    }),
    ApiBody({ type: CreatePlaylistDto }),
    ApiResponse({
      status: 201,
      description: 'Playlist created successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'My New Playlist',
            isPublic: false,
            trackCount: 0,
            durationSeconds: 0,
            likesCount: 0,
            repostsCount: 0,
            secretToken: 'abc123xyz',
            createdAt: '2026-04-09T10:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Validation error in request body' }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiUpdatePlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Update playlist metadata or cover image',
      description: 'Allows the owner to update title, description, and the cover image.',
    }),
    ApiParam({
      name: 'playlistId',
      type: 'string',
      format: 'uuid',
      description: 'UUID of the playlist to update',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'My New Title' },
          description: { type: 'string', example: 'Updated playlist description' },
          coverImage: {
            type: 'string',
            format: 'binary',
            description: 'Playlist cover image (png, jpeg, webp)',
          },
          buyLink: { type: 'string', example: 'https://bandcamp.com/my-link' },
          recordLabel: { type: 'string', example: 'Harmonica Records' },
          genre: { type: 'string', example: 'Rock & Roll' },
          type: {
            type: 'string',
            enum: ['playlist', 'album', 'ep'],
            example: 'album',
            description: 'Playlist type (playlist, album, ep)',
          },
          releaseDate: {
            type: 'string',
            example: '2026-04-07',
            description: 'Release date in YYYY-MM-DD format',
          },
          permalink: { type: 'string', example: 'summer-vibes-2026' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['chill', 'lo-fi', 'study'],
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Playlist updated successfully',
      schema: {
        example: {
          status: 'Success',
          message: 'Playlist updated successfully',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'My New Title',
            description: 'Updated playlist description',
            coverImage: 'https://s3.amazonaws.com/bucket/playlists/uuid/cover.webp',
            buyLink: 'https://bandcamp.com/my-link',
            recordLabel: 'Harmonica Records',
            genre: 'Rock & Roll',
            type: 'album',
            releaseDate: '2026-04-07',
            permalink: 'summer-vibes-2026',
            tags: ['chill', 'lo-fi', 'study'],
            updatedAt: '2026-04-07T08:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid file type or size' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Not the owner of the playlist' }),
    ApiResponse({ status: 404, description: 'Playlist not found' })
  );
}

export function ApiAddTrackToPlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Add a track to a playlist',
      description: 'Adds a track to the end of a playlist. Only the owner can add tracks.',
    }),
    ApiParam({
      name: 'playlistId',
      description: 'UUID of the playlist',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({ type: AddTrackDto }),
    ApiResponse({
      status: 201,
      description: 'Track added successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            trackId: '550e8400-e29b-41d4-a716-446655440005',
            position: 13,
            addedAt: '2026-04-07T10:00:00Z',
            playlist: {
              trackCount: 13,
              durationSeconds: 3061,
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Not the playlist owner',
      schema: { example: { statusCode: 403, message: 'Forbidden resource' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist or Track not found',
      schema: { example: { statusCode: 404, message: 'Track not found' } },
    }),
    ApiResponse({
      status: 409,
      description: 'Conflict - Track already in playlist',
      schema: { example: { statusCode: 409, message: 'Track is already in this playlist' } },
    })
  );
}

export function ApiRemoveTrackFromPlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove a track from a playlist',
      description: 'Removes a track and automatically re-indexes the remaining tracks positions.',
    }),
    ApiParam({ name: 'playlistId', format: 'uuid', example: 'uuid-1' }),
    ApiParam({ name: 'trackId', format: 'uuid', example: 'uuid-2' }),
    ApiResponse({
      status: 200,
      description: 'Success',
      schema: {
        example: { status: 'success', message: 'Track removed from playlist successfully' },
      },
    }),
    ApiResponse({ status: 403, description: 'Forbidden - Not the owner' }),
    ApiResponse({ status: 404, description: 'Playlist or track not found' })
  );
}

export function ApiDeletePlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Delete a playlist',
      description: 'Permanently deletes a playlist. Only the owner can perform this action.',
    }),
    ApiParam({ name: 'playlistId', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Playlist deleted' }),
    ApiResponse({ status: 403, description: 'Not authorized' }),
    ApiResponse({ status: 404, description: 'Not found' })
  );
}

export function ApiGetUserCreatedPlaylists() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: "Get a user's created playlists",
      description:
        'Returns playlists created by the user. Private playlists are only visible to the owner.',
    }),
    ApiParam({ name: 'userId', format: 'uuid' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 20 }),
    ApiResponse({
      status: 200,
      description: 'Success',
      schema: {
        example: {
          status: 'success',
          data: [{ playlistId: 'uuid', title: 'My Vibes', isPublic: true }],
          pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
        },
      },
    })
  );
}

export function ApiReorderTracks() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Bulk update track positions',
      description:
        'Accepts an ordered array of track IDs and updates their positions (1-indexed) in a single transaction.',
    }),
    ApiParam({ name: 'playlistId', format: 'uuid', example: 'pl-123' }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['track_ids'],
        properties: {
          trackIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            example: ['track-uuid-1', 'track-uuid-2', 'track-uuid-3'],
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Reordered successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Playlist tracks reordered successfully.',
          data: { playlistId: 'pl-123', trackCount: 3 },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid array or length mismatch' }),
    ApiResponse({ status: 403, description: 'Not the owner' })
  );
}

// export function ApiChangePlaylistPrivacy() {
//   return applyDecorators(
//     ApiCookieAuth('access_token'),
//     ApiOperation({
//       summary: 'Update playlist privacy (Public/Private)',
//       description: 'Toggles visibility. Making a playlist private generates a new secret token.',
//     }),
//     ApiParam({ name: 'playlistId', format: 'uuid' }),
//     ApiBody({
//       schema: {
//         type: 'object',
//         properties: {
//           isPublic: { type: 'boolean', example: true, description: 'New privacy state' },
//         },
//       },
//     }),
//     ApiResponse({
//       status: 200,
//       description: 'Privacy updated. When making private, response includes secretToken.',
//       schema: {
//         examples: {
//           'Made Public': {
//             value: {
//               status: 'success',
//               data: {
//                 playlistId: 'uuid-123',
//                 isPublic: true,
//               },
//             },
//           },
//           'Made Private': {
//             value: {
//               status: 'success',
//               data: {
//                 playlistId: 'uuid-123',
//                 isPublic: false,
//                 secretToken: 'abc9xyz',
//               },
//             },
//           },
//         },
//       },
//     }),
//     ApiResponse({ status: 400, description: 'Playlist is already in the requested state' }),
//     ApiResponse({ status: 403, description: 'Not the owner' }),
//     ApiResponse({ status: 404, description: 'Playlist not found' })
//   );
// }

export function ApiGetPublicPlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get playlist details',
      description:
        'Retrieves a public playlist by ID, including its owner, tracks (ordered), and tags. ' +
        "For tracks blocked in the requester's region, `audioUrl` and `waveformUrl` are returned as `null`.",
    }),
    ApiParam({
      name: 'playlistId',
      description: 'The UUID of the playlist',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description:
        "Playlist retrieved successfully. `audioUrl` and `waveformUrl` per track are `null` when blocked in the requester's region.",
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Chill Beats',
            description: 'A playlist for studying',
            coverImage: 'https://cdn.harmonica.com/covers/123.jpg',
            isPublic: true,
            tracksCount: 2,
            durationSeconds: 420,
            likesCount: 15,
            repostsCount: 3,
            createdAt: '2026-03-31T12:00:00Z',
            updatedAt: '2026-04-01T08:00:00Z',
            genreName: 'Lo-fi',
            genreId: 'genre-uuid',
            tags: [
              { tagId: 'tag-1', name: 'Lo-fi' },
              { tagId: 'tag-2', name: 'Relax' },
            ],
            user: {
              userId: 'user-uuid',
              username: 'harmonica_user',
              displayName: 'HarmonicaUser',
              avatarUrl: 'https://cdn.harmonica.com/avatars/me.jpg',
            },
            tracks: [
              {
                position: 1,
                trackId: 'track-uuid-1',
                title: 'Midnight Rain',
                durationSeconds: 210,
                coverImage: 'https://cdn.harmonica.com/covers/track.jpg',
                audioUrl: 'https://cdn.harmonica.com/audio/track.mp3',
                waveformUrl: 'https://cdn.harmonica.com/waveforms/track.json',
                playCount: 1000,
                likesCount: 50,
                repostsCount: 10,
                commentsCount: 5,
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
                durationSeconds: 195,
                coverImage: 'https://cdn.harmonica.com/covers/locked.jpg',
                audioUrl: null,
                waveformUrl: null,
                playCount: 500,
                likesCount: 20,
                repostsCount: 3,
                commentsCount: 1,
                artist: {
                  userId: 'user-uuid-2',
                  username: 'artist2',
                  displayName: 'Artist Two',
                  avatarUrl: null,
                },
              },
            ],
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 403,
      description: 'Playlist is private and caller is not the owner',
    }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found or is private',
    })
  );
}

export function ApiGetSecretPlaylist() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get a private playlist via secret token',
      description:
        'Allows users with the secret link to view a private playlist. Used for SoundCloud-style sharing. ' +
        "For tracks blocked in the requester's region, `audioUrl` and `waveformUrl` are returned as `null`.",
    }),
    ApiParam({
      name: 'secretToken',
      description: 'The unique secret token generated for the private playlist',
      type: 'string',
      example: '9a2b4c6d8e',
    }),
    ApiResponse({
      status: 200,
      description:
        "Secret playlist retrieved successfully. `audioUrl` and `waveformUrl` per track are `null` when blocked in the requester's region.",
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Top Secret Beats',
            description: 'Private album drop',
            coverImage: 'https://cdn.harmonica.com/covers/secret.jpg',
            isPublic: false,
            tracksCount: 2,
            durationSeconds: 420,
            likesCount: 0,
            repostsCount: 0,
            createdAt: '2026-04-01T10:00:00Z',
            updatedAt: '2026-04-02T08:00:00Z',
            genreName: 'Experimental',
            genreId: 'genre-uuid',
            tags: [{ tagId: 'tag-uuid', name: 'Experimental' }],
            user: {
              userId: 'user-uuid',
              username: 'harmonica_artist',
              displayName: 'ArtistName',
              avatarUrl: 'https://cdn.harmonica.com/avatars/artist.jpg',
            },
            tracks: [
              {
                position: 1,
                trackId: 'track-uuid-1',
                title: 'Unreleased Track',
                durationSeconds: 210,
                coverImage: 'https://cdn.harmonica.com/covers/track.jpg',
                audioUrl: 'https://cdn.harmonica.com/audio/unreleased.mp3',
                waveformUrl: 'https://cdn.harmonica.com/waveforms/unreleased.json',
                playCount: 0,
                likesCount: 0,
                repostsCount: 0,
                commentsCount: 0,
                artist: {
                  userId: 'user-uuid',
                  username: 'harmonica_artist',
                  displayName: 'ArtistName',
                  avatarUrl: 'https://cdn.harmonica.com/avatars/artist.jpg',
                },
              },
              {
                position: 2,
                trackId: 'track-uuid-2',
                title: 'Region Locked Track',
                durationSeconds: 210,
                coverImage: 'https://cdn.harmonica.com/covers/locked.jpg',
                audioUrl: null,
                waveformUrl: null,
                playCount: 0,
                likesCount: 0,
                repostsCount: 0,
                commentsCount: 0,
                artist: {
                  userId: 'user-uuid-2',
                  username: 'artist2',
                  displayName: 'Artist Two',
                  avatarUrl: null,
                },
              },
            ],
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'Playlist not found or token is invalid',
    })
  );
}

export function ApiResetPlaylistSecretToken() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Reset secret token for a private playlist',
      description: 'Generates a new secret token and share URL. Only works for private playlists.',
    }),
    ApiParam({ name: 'playlistId', format: 'uuid', example: 'uuid-123' }),
    ApiResponse({
      status: 201,
      description: 'Secret token regenerated successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            playlistId: 'uuid-123',
            secretToken: 'new-random-string-789',
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Playlist is public (cannot reset token)' }),
    ApiResponse({ status: 403, description: 'Not the playlist owner' }),
    ApiResponse({ status: 404, description: 'Playlist not found' })
  );
}

export function ApiGetMyPlaylists() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get my playlists',
      description:
        'Returns a paginated list of playlists owned by the authenticated user. Includes both public and private playlists.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Items per page, capped at 100 (default: 20)',
    }),
    ApiResponse({
      status: 200,
      description: 'Playlists retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: '550e8400-e29b-41d4-a716-446655440000',
              title: 'My Vibe',
              coverImage: 'https://cdn.harmonica.com/covers/my-vibe.jpg',
              isPublic: false,
              tracksCount: 15,
              durationSeconds: 3600,
              likesCount: 0,
              repostsCount: 0,
              isOwner: true,
              createdAt: '2026-04-09T10:00:00.000Z',
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 1,
            limit: 20,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiGetUserPlaylists() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: "Get a user's playlists",
      description:
        "Returns a paginated list of a user's playlists. Shows public playlists for public profiles. If a user is viewing their own profile, it returns both public and private playlists. Returns a 403 if the profile is private and the caller is not the owner.",
    }),
    ApiParam({
      name: 'user_id',
      description: 'The UUID of the user whose playlists are being requested',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440001',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Items per page, capped at 100 (default: 20)',
    }),
    ApiResponse({
      status: 200,
      description: 'Playlists retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: '550e8400-e29b-41d4-a716-446655440000',
              title: 'Vibes 2026',
              coverImage: 'https://cdn.harmonica.com/covers/vibes.jpg',
              isPublic: true,
              tracksCount: 12,
              likesCount: 45,
              repostsCount: 3,
              createdAt: '2026-04-01T12:00:00.000Z',
              user: {
                userId: '550e8400-e29b-41d4-a716-446655440001',
                username: 'other_user',
                displayName: 'Other User',
              },
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: 1,
            limit: 20,
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'This account is private and the requester is not the owner',
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
    })
  );
}
