import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

export function ApiRepostPlaylist() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Repost a playlist',
      description: 'Allows a user to repost a public playlist that they do not own.',
    }),
    ApiParam({
      name: 'playlistId',
      description: 'The UUID of the playlist to repost',
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 201,
      description: 'Playlist successfully reposted',
      schema: {
        example: {
          status: 'sucess',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          playlistId: '550e8400-e29b-41d4-a716-446655440000',
          repostedAt: '2026-03-31T13:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad Request - User attempted to repost their own playlist or playlist not found',
      content: {
        'application/json': {
          examples: {
            selfRepost: {
              summary: 'Own playlist error',
              value: { message: 'You cannot repost your own playlist' },
            },
            notFound: {
              summary: 'Playlist not found',
              value: { message: 'playlist not found' },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - No valid authentication token provided',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Cannot repost a private playlist',
      schema: {
        example: { message: 'Cannot repost a private playlist' },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Conflict - Repost relationship already exists',
      schema: {
        example: { message: 'You have already reposted this playlist' },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error - Unexpected error occurred',
    })
  );
}
export function ApiUnrepostPlaylist() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Remove a playlist repost',
      description: 'Allows a user to remove a previous repost of a public playlist.',
    }),
    ApiParam({
      name: 'playlistId',
      description: 'The UUID of the playlist to unrepost',
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
    ApiResponse({
      status: 400,
      description: 'Bad Request - Playlist not found',
      schema: {
        example: { message: 'playlist not found' },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - No valid authentication token provided',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - User has not reposted this playlist or playlist is private',
      content: {
        'application/json': {
          examples: {
            notReposted: {
              summary: 'Not reposted',
              value: { message: 'you have not reposted this playlist' },
            },
            privatePlaylist: {
              summary: 'Private playlist',
              value: { message: 'This Playlist is Private' },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error - Unexpected error occurred',
    })
  );
}

export function ApiGetPlaylistRepostCount() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get playlist repost count',
      description: 'Returns the total number of times a public playlist has been reposted.',
    }),
    ApiParam({ name: 'playlistId', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Count retrieved successfully',
      schema: {
        example: {
          status: 'success',
          playlistId: '550e8400-e29b-41d4-a716-446655440000',
          repostCount: 42,
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Playlist not found' }),
    ApiResponse({ status: 403, description: 'Forbidden - Playlist is private' })
  );
}

export function ApiGetPlaylistReposts() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get users who reposted a playlist',
      description: 'Returns a paginated list of users who have reposted the specified playlist.',
    }),
    ApiParam({ name: 'playlistId', format: 'uuid' }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10, description: 'Max 100' }),
    ApiResponse({
      status: 200,
      description: 'List of reposters retrieved successfully',
      schema: {
        example: {
          status: 'sucess',
          items: [
            {
              userId: 'uuid-1',
              username: 'johndoe',
              displayName: 'John Doe',
              avatarUrl: 'https://example.com/avatar.jpg',
              repostedAt: '2026-03-31T12:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Playlist not found' }),
    ApiResponse({ status: 403, description: 'Forbidden - Playlist is private' })
  );
}
export function ApiGetUserPlaylistReposts() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: "Get a user's playlist reposts",
      description:
        "Returns a paginated list of playlists that the specified user has reposted. Works for public accounts or the user's own account.",
    }),
    ApiParam({
      name: 'user_id',
      format: 'uuid',
      description: 'ID of the user whose reposts you want to see',
    }),
    ApiQuery({ name: 'page', required: false, example: 1 }),
    ApiQuery({ name: 'limit', required: false, example: 10 }),
    ApiResponse({
      status: 200,
      description: 'User reposts retrieved successfully',
      schema: {
        example: {
          status: 'sucess',
          items: [
            {
              playlistId: 'uuid-playlist',
              title: 'Summer Hits',
              coverImage: 'https://example.com/cover.jpg',
              isPublic: true,
              tracksCount: 5,
              likesCount: 150,
              repostsCount: 12,
              user: {
                userId: 'owner-uuid',
                username: 'playlist_creator',
                displayName: 'The Creator',
              },
              repostedAt: '2026-03-31T12:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        },
      },
    }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiResponse({ status: 403, description: 'Forbidden - This account is private' })
  );
}

export function ApiLikePlaylist() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}
export function ApiUnlikePlaylist() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}

export function ApiGetPlaylistLikesCount() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}

export function ApiGetPlaylistLikes() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}
export function ApiGetUserPlaylistLikes() {
  return applyDecorators(
    ApiOperation({ summary: 'Repost a playlist' }),
    ApiParam({ name: 'playlistId', type: Number, description: 'ID of the playlist to repost' }),
    ApiResponse({ status: 201, description: 'Playlist reposted successfully' }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid playlist ID or user not authenticated',
    }),
    ApiCookieAuth('access_token')
  );
}
