import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AddCommentDto } from './dto/add-comment.dto';

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
    ApiBody({
      required: false,
      schema: {
        type: 'object',
        properties: {
          caption: {
            type: 'string',
            description: 'Optional caption to accompany the repost',
            example: 'Check out this awesome track!',
          },
        },
      },
    }),
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
        'Allows a user to like a track. The user cannot like their own track, and the track must be public.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 201,
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
      description: 'Cannot like your own track',
      schema: {
        example: { statusCode: 400, message: 'You cannot like your own track' },
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
      description: 'Track already liked',
      schema: {
        example: { statusCode: 409, message: 'You have already liked this track' },
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

export function ApiGetTrackLikes() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get users who liked a track',
      description:
        'Returns a paginated list of users who have liked the track. Private tracks are only accessible by their owner.',
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
      description: 'Likes retrieved successfully',
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
              likedAt: '2024-06-01T12:00:00Z',
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

export function ApiGetUserTrackLikes() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get tracks liked by a user',
      description: 'Returns a paginated list of tracks liked by the specified user.',
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
      description: 'Liked tracks retrieved successfully',
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
                displayName: 'DJ Nour',
              },
              likedAt: '2024-06-01T12:00:00Z',
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

export function ApiTrackComment() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Comment on a track',
      description: 'Allows a user to comment on a track. The track must be public.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiBody({ type: AddCommentDto }),
    ApiResponse({
      status: 201,
      description: 'Comment created successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            commentId: '550e8400-e29b-41d4-a716-446655440001',
            userId: '550e8400-e29b-41d4-a716-446655440002',
            trackId: '550e8400-e29b-41d4-a716-446655440003',
            content: 'Great track!',
            timestampSeconds: 120,
            parentId: null,
            createdAt: '2024-06-01T12:00:00Z',
            updatedAt: '2024-06-01T12:00:00Z',
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
      description: 'Track or parent comment not found',
      schema: {
        example: { statusCode: 404, message: 'Track not found' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
export function ApiDeleteComment() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Delete a comment from a track',
      description:
        'Deletes a comment by ID. The requester must be the author of the comment. Also deletes all replies to the comment.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiParam({ name: 'commentId', description: 'UUID of the comment to delete', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Comment deleted successfully',
      schema: {
        example: {
          status: 'success',
          message: 'comment deleted successfully',
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private or user is not the comment author',
      schema: {
        example: { statusCode: 403, message: 'You are not authorized to delete this comment' },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Track or comment not found',
      schema: {
        example: { statusCode: 404, message: 'Comment not found' },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Comment does not belong to this track',
      schema: {
        example: { statusCode: 409, message: 'This comment does not belong to this track' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
export function ApiGetTrackComments() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get comments on a track',
      description:
        'Returns a paginated list of comments. Ordering can be by track timestamp, newest, or oldest.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiQuery({ name: 'page', required: false, type: 'number', example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: 'number', example: 20 }),
    ApiQuery({
      name: 'order',
      required: false,
      enum: ['timestamp', 'newest', 'oldest'],
      description: 'Sort order',
    }),
    ApiResponse({
      status: 200,
      description: 'Comments retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              commentId: '550e8400-e29b-41d4-a716-446655440010',
              content: 'This drop at 1:23 is insane!',
              timestampSeconds: 83,
              parentId: null,
              user: {
                userId: '550e8400-e29b-41d4-a716-446655440020',
                username: 'john_doe',
                displayName: 'John Doe',
                avatarUrl: 'https://s3.amazonaws.com/avatars/john.jpg',
              },
              createdAt: '2025-06-01T12:00:00Z',
              replies: [
                {
                  commentId: '550e8400-e29b-41d4-a716-446655440011',
                  content: 'Agreed, the bass hits hard!',
                  timestampSeconds: 83,
                  parentId: '550e8400-e29b-41d4-a716-446655440010',
                  user: {
                    userId: '550e8400-e29b-41d4-a716-446655440021',
                    username: 'jane_doe',
                    displayName: 'Jane Doe',
                    avatarUrl: 'https://s3.amazonaws.com/avatars/jane.jpg',
                  },
                  createdAt: '2025-06-01T12:05:00Z',
                },
              ],
            },
            {
              commentId: '550e8400-e29b-41d4-a716-446655440012',
              content: 'Love the melody here',
              timestampSeconds: 145,
              parentId: null,
              user: {
                userId: '550e8400-e29b-41d4-a716-446655440022',
                username: 'bob_smith',
                displayName: 'Bob Smith',
                avatarUrl: 'https://s3.amazonaws.com/avatars/bob.jpg',
              },
              createdAt: '2025-06-02T08:15:00Z',
              replies: [],
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalCount: 54,
            limit: 20,
          },
        },
      },
    }),
    ApiResponse({ status: 403, description: 'Track is private' }),
    ApiResponse({ status: 404, description: 'Track not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

export function ApiUploadTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Upload a new track',
      description: `Upload an audio file along with a cover image and all track metadata in a single multipart request.
Audio processing (transcoding HQ/standard, 20-second preview, waveform generation) runs in the background.
Subscribe to \`GET /tracks/:trackId/status/stream\` (SSE) to receive live progress updates instead of polling.`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['audio', 'title'],
        properties: {
          // ── Files ────────────────────────────────────────────────────────
          audio: {
            type: 'string',
            format: 'binary',
            description: 'Audio file — MP3, WAV, FLAC or AIFF, max 4 GB',
          },
          cover: {
            type: 'string',
            format: 'binary',
            description: 'Cover image — JPEG, PNG or WebP, max 10 MB (optional)',
          },
          // ── Core metadata ────────────────────────────────────────────────
          title: { type: 'string', example: 'Midnight Drive' },
          description: { type: 'string', example: 'Lo-fi hip-hop session recorded live.' },
          previewStartTime: { type: 'string', example: '00:00:30', description: 'HH:MM:SS' },
          visibility: {
            type: 'string',
            enum: ['public', 'private', 'follower_exclusive'],
            default: 'public',
          },
          mainArtists: {
            type: 'string',
            description: 'Comma-separated artist names, e.g. "Artist A,Artist B"',
            example: 'DJ Nour,Yara Senousy',
          },
          // ── Distribution ─────────────────────────────────────────────────
          buyLink: { type: 'string', example: 'https://bandcamp.com/track/midnight-drive' },
          recordLabel: { type: 'string', example: 'Interscope Records' },
          releaseDate: { type: 'string', example: '2026-06-01', description: 'ISO 8601 date' },
          publisher: { type: 'string', example: 'Sony Music Publishing' },
          isrc: { type: 'string', example: 'USRC17607839' },
          explicitContent: { type: 'boolean', default: false },
          pLine: { type: 'string', example: '℗ 2026 Atlantic Records' },
          trackLink: { type: 'string', example: 'midnight-drive-2026' },
          // ── Playback permissions ─────────────────────────────────────────
          enableDirectDownloads: { type: 'boolean', default: false },
          offlineListening: { type: 'boolean', default: false },
          // ── Licensing ────────────────────────────────────────────────────
          attribution: { type: 'boolean', default: false },
          noncommercial: { type: 'boolean', default: false },
          noDerivativeWorks: { type: 'boolean', default: false },
          shareAlike: { type: 'boolean', default: false },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Track upload accepted — processing started in background',
      schema: {
        example: {
          status: 'success',
          message: 'Track upload started. Processing in background.',
          data: {
            trackId: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Midnight Drive',
            trackStatus: 'processing',
            createdAt: '2026-04-02T22:00:00Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Missing audio file or invalid file type / size',
      schema: {
        example: { statusCode: 400, message: 'Invalid audio type. Allowed: MP3, WAV, FLAC, AIFF' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Stream Track Processing Status (SSE) ────────────────────────────────────

export function ApiStreamTrackStatus() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Stream track processing status (SSE)',
      description: `Opens a Server-Sent Events stream that pushes real-time processing updates for the given track.

**Connect** immediately after \`POST /tracks/upload\` using the returned \`trackId\`.

**Event shapes:**
\`\`\`
event: progress   → data: { trackId, progress: 0–100 }
event: completed  → data: { trackId, audioUrl, waveformUrl, durationSeconds }
event: failed     → data: { trackId, error: "reason" }
\`\`\`
The stream closes automatically once \`completed\` or \`failed\` is emitted.`,
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track to watch', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'SSE stream opened — events pushed until processing finishes',
      content: {
        'text/event-stream': {
          schema: {
            type: 'string',
            example: [
              'data: {"event":"progress","data":{"trackId":"550e8...","progress":45}}',
              '',
              'data: {"event":"completed","data":{"trackId":"550e8...","audioUrl":"https://...","waveformUrl":"https://...","durationSeconds":213}}',
            ].join('\n'),
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
