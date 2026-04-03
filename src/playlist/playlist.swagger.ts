import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';

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

export function ApiDeletePlaylist() {
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
