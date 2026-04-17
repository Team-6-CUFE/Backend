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
