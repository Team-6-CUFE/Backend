import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function ApiRepostTrack() {
  return applyDecorators(
    ApiOperation({
      summary: 'Repost a track',
      description:
        'Allows a user to repost a track. The user cannot repost their own track, and the track must be public. If the user has already reposted the track, an error will be returned.',
    }),
    ApiResponse({
      status: 201,
      description: 'Track reposted successfully',
      schema: {
        example: {
          track_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          caption: 'Check out this track!',
          created_at: '2024-06-01T12:00:00Z',
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 409, description: 'Conflict' })
  );
}

export function ApiGetTrackReposts() {
  return applyDecorators();
}

export function ApiRemoveTrackRepost() {
  return applyDecorators();
}

export function ApiGetTrackRepostsCount() {
  return applyDecorators();
}

export function ApiGetUserTrackReposts() {
  return applyDecorators();
}
