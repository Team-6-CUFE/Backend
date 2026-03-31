import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

// ─── Repost Track ─────────────────────────────────────────────────────────────

export function ApiRepostTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Repost a track',
      description:
        'Allows the authenticated user to repost a track. The user cannot repost their own track, and the track must be public. Returns a conflict error if the user has already reposted the track.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track to repost', type: 'string' }),
    ApiResponse({
      status: 201,
      description: 'Track reposted successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            caption: 'Check out this track!',
            createdAt: '2024-06-01T12:00:00Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Cannot repost your own track',
      schema: {
        example: { statusCode: 400, message: 'You cannot repost your own track' },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private',
      schema: {
        example: { statusCode: 403, message: 'This track is private' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: {
        example: { statusCode: 404, message: 'Track not found' },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Track already reposted',
      schema: {
        example: { statusCode: 409, message: 'You have already reposted this track' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Track Reposts ────────────────────────────────────────────────────────

export function ApiGetTrackReposts() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get reposts of a track',
      description:
        'Returns a paginated list of users who reposted the track. Private tracks are only accessible by their owner.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number (default: 1)',
      type: 'number',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Items per page, capped at 100 (default: 20)',
      type: 'number',
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of reposters',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              userId: '550e8400-e29b-41d4-a716-446655440001',
              username: 'yara_senousy',
              displayName: 'Yara Senousy',
              avatarUrl: 'https://s3.amazonaws.com/avatars/yara.jpg',
              followersCount: 500,
              caption: 'Amazing track!',
              repostedAt: '2024-06-01T12:00:00Z',
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
    ApiResponse({
      status: 403,
      description: 'Track is private',
      schema: {
        example: { statusCode: 403, message: 'This track is private' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: {
        example: { statusCode: 404, message: 'Track not found' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Remove Track Repost ──────────────────────────────────────────────────────

export function ApiRemoveTrackRepost() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove a track repost',
      description:
        "Removes the authenticated user's repost of a track. Returns an error if the user has not reposted the track.",
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Repost removed successfully',
      schema: {
        example: { status: 'success', message: 'Repost successfully removed' },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'User has not reposted this track',
      schema: {
        example: { statusCode: 400, message: 'You have not reposted this track' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Track Reposts Count ──────────────────────────────────────────────────

export function ApiGetTrackRepostsCount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get repost count of a track',
      description:
        'Returns the total number of reposts for a track. Private tracks are only accessible by their owner.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Repost count returned successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            repostsCount: 42,
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private',
      schema: {
        example: { statusCode: 403, message: 'This track is private' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: {
        example: { statusCode: 404, message: 'Track not found' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get User Track Reposts ───────────────────────────────────────────────────

export function ApiGetUserTrackReposts() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get tracks reposted by a user',
      description:
        'Returns a paginated list of tracks that a specific user has reposted. Private profiles are only accessible by the profile owner.',
    }),
    ApiParam({ name: 'user_id', description: 'UUID of the user', type: 'string' }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number (default: 1)',
      type: 'number',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Items per page, capped at 100 (default: 20)',
      type: 'number',
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of reposted tracks',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              trackId: '123e4567-e89b-12d3-a456-426614174000',
              title: 'Midnight Drive',
              coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
              durationSeconds: 213,
              playCount: 1500,
              repostsCount: 30,
              artist: {
                userId: '550e8400-e29b-41d4-a716-446655440002',
                username: 'dj_nour',
                displayName: 'Nour',
              },
              caption: 'Love this track!',
              repostedAt: '2024-06-01T12:00:00Z',
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
    ApiResponse({
      status: 403,
      description: 'Profile is private',
      schema: {
        example: { statusCode: 403, message: 'This account is private' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: {
        example: { statusCode: 404, message: 'User not found' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Edit Track Repost ────────────────────────────────────────────────────────

export function ApiEditTrackRepost() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Edit a track repost caption',
      description:
        'Updates the caption of an existing repost. Returns an error if the user has not reposted the track.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Repost updated successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            caption: 'Updated caption!',
            createdAt: '2024-06-01T12:00:00Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'User has not reposted this track',
      schema: {
        example: { statusCode: 400, message: 'You have not reposted this track' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiLikeTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Like a track',
      description:
        'Allows a user to like a track. Returns an error if the user has already liked the track.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Track liked successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174001',
            createdAt: '2024-06-01T12:00:00Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'User has already liked this track',
      schema: {
        example: { statusCode: 400, message: 'You have already liked this track' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiRemoveTrackLike() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove a track like',
      description:
        'Allows a user to remove their like from a track. Returns an error if the user has not liked the track.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Track like removed successfully',
      schema: {
        example: { status: 'success', message: 'Track successfully unliked' },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'User has not liked this track',
      schema: {
        example: { statusCode: 400, message: 'You have not liked this track' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiGetTrackLikesCount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get like count of a track',
      description: 'Retrieves the total number of likes for a specific track.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Like count retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '123e4567-e89b-12d3-a456-426614174000',
            likesCount: 42,
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private',
      schema: {
        example: { statusCode: 403, message: 'This track is private' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: {
        example: { statusCode: 404, message: 'Track not found' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
