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
          // ── Genre & Tags ─────────────────────────────────────────────────
          genreName: {
            type: 'string',
            description:
              'Genre name — auto-created if it does not exist. Use "None" to clear the genre.',
            example: 'Lo-Fi',
          },
          tags: {
            type: 'string',
            description: 'Comma-separated tag names — auto-created if new',
            example: 'lo-fi,chillhop,study',
          },
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

// ─── Update Track Metadata ────────────────────────────────────────────────────

export function ApiUpdateTrackMetadata() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Update track metadata',
      description: `Partial update — only fields included in the request are changed. Omitted fields remain unchanged.
Send as \`multipart/form-data\` so a new cover image can optionally be included.
\`previewStartTime\` is stored and will take effect the next time the audio is re-processed via \`PATCH /tracks/:trackId/audio\`.`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiParam({ name: 'trackId', description: 'UUID of the track to update', type: 'string' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          cover: {
            type: 'string',
            format: 'binary',
            description: 'New cover image — JPEG, PNG or WebP, max 10 MB',
          },
          title: { type: 'string', example: 'Midnight Drive (Extended Mix)' },
          description: { type: 'string' },
          previewStartTime: {
            type: 'string',
            example: '00:01:00',
            description: 'HH:MM:SS — stored, applied on next audio re-upload',
          },
          visibility: { type: 'string', enum: ['public', 'private', 'follower_exclusive'] },
          mainArtists: {
            type: 'string',
            example: 'DJ Nour,Yara Senousy',
            description: 'Comma-separated',
          },
          buyLink: { type: 'string', example: 'https://bandcamp.com/track/midnight-drive' },
          recordLabel: { type: 'string', example: 'Interscope Records' },
          releaseDate: { type: 'string', example: '2026-06-01' },
          publisher: { type: 'string', example: 'Sony Music Publishing' },
          isrc: { type: 'string', example: 'USRC17607839' },
          explicitContent: { type: 'boolean' },
          pLine: { type: 'string', example: '℗ 2026 Atlantic Records' },
          trackLink: { type: 'string', example: 'midnight-drive-extended' },
          enableDirectDownloads: { type: 'boolean' },
          offlineListening: { type: 'boolean' },
          attribution: { type: 'boolean' },
          noncommercial: { type: 'boolean' },
          noDerivativeWorks: { type: 'boolean' },
          shareAlike: { type: 'boolean' },
          genreName: {
            type: 'string',
            description:
              'Genre name — auto-created if it does not exist. Use "None" to clear the genre.',
            example: 'Lo-Fi',
          },
          tags: {
            type: 'string',
            description:
              'Comma-separated tag names — replaces the full tag list, auto-created if new',
            example: 'lo-fi,chillhop,study',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Track metadata updated successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Midnight Drive (Extended Mix)',
            description: 'Lo-fi hip-hop session recorded live.',
            coverImage: 'https://s3.amazonaws.com/covers/new_cover.jpg',
            durationSeconds: 214,
            trackStatus: 'finished',
            waveformUrl: 'https://s3.amazonaws.com/waveforms/track_123.json',
            playCount: 1042,
            likesCount: 87,
            repostsCount: 14,
            commentsCount: 5,
            visibility: 'public',
            explicitContent: false,
            releaseDate: '2026-06-01',
            genre: { genreId: 'genre_001', name: 'Lo-Fi' },
            tags: [
              {
                createdAt: '2026-04-14T17:58:00.470Z',
                updatedAt: '2026-04-14T17:58:00.470Z',
                genreId: '545f092b-a993-4e88-9fbd-bc4397a367d1',
                name: 'summer',
              },
              {
                createdAt: '2026-04-14T17:58:00.470Z',
                updatedAt: '2026-04-14T17:58:00.470Z',
                genreId: '545f092b-a993-4e88-9fbd-bc4397a367d1',
                name: 'cairo',
              },
            ],
            owner: {
              userId: '550e8400-e29b-41d4-a716-446655440001',
              username: 'yara_senousy',
              displayName: 'Yara Senousy',
              avatarUrl: 'https://s3.amazonaws.com/avatars/user_123.jpg',
            },
            createdAt: '2025-06-01T10:00:00Z',
            updatedAt: '2026-04-03T01:00:00Z',
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid field values or cover image type/size' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'You do not own this track' }),
    ApiResponse({ status: 404, description: 'Track not found' })
  );
}

// ─── Re-upload Track Audio ────────────────────────────────────────────────────

export function ApiReuploadTrackAudio() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Replace track audio file',
      description: `Replaces the existing audio with a new file. Processing (transcoding, waveform, preview) restarts in the background.
Subscribe to \`GET /tracks/:trackId/status/stream\` for live progress — the same SSE endpoint is reused.
Returns immediately with \`trackStatus: "processing"\`. Rejected if the track is currently being processed.`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['audio'],
        properties: {
          audio: {
            type: 'string',
            format: 'binary',
            description: 'New audio file — MP3, WAV, FLAC or AIFF, max 4 GB',
          },
          previewStartTime: {
            type: 'string',
            example: '00:01:30',
            description: 'HH:MM:SS — overrides stored value for this processing run',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Audio re-upload accepted — processing started',
      schema: {
        example: {
          status: 'success',
          message: 'Audio re-upload started. Processing in background.',
          data: {
            trackId: '550e8400-e29b-41d4-a716-446655440001',
            trackStatus: 'processing',
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Missing audio file or invalid file type' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'You do not own this track' }),
    ApiResponse({ status: 404, description: 'Track not found' }),
    ApiResponse({ status: 409, description: 'Track is currently being processed' })
  );
}

// ─── Top Fans ─────────────────────────────────────────────────────────────

export function ApiGetTopFans() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get top fans',
      description:
        'Returns the top 5 users who have played this track the most (all time). Users must follow the artist, have liked the track, have a profile image, and have opted in to fan visibility. Results are cached for up to 24 hours. Returns an empty array if the artist has disabled fan display.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Top fans retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              rank: 1,
              playCount: 47,
              user: {
                userId: '550e8400-e29b-41d4-a716-446655440001',
                username: 'superfan_ahmed',
                displayName: 'Ahmed Khalil',
                avatarUrl: 'https://s3.amazonaws.com/avatars/ahmed.jpg',
              },
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Track not found' })
  );
}

// ─── First Fans ───────────────────────────────────────────────────────────

export function ApiGetFirstFans() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get first fans',
      description:
        'Returns the top 5 users who played this track the most during the first 7 days after release. While the 7-day window is still open, this returns a live snapshot (cached 1 hour) that updates as more plays come in. Once the window closes the list is permanently stored (top 20 kept in DB, top 5 shown) and cached for 24 hours — it never changes after that. Returns an empty array only if the artist has disabled fan display.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'First fans retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              rank: 1,
              playCount: 47,
              user: {
                userId: '550e8400-e29b-41d4-a716-446655440001',
                username: 'superfan_ahmed',
                displayName: 'Ahmed Khalil',
                avatarUrl: 'https://s3.amazonaws.com/avatars/ahmed.jpg',
              },
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Track not found' })
  );
}

// ─── Play Track ───────────────────────────────────────────────────────────

export function ApiPlayTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Record a track play',
      description: `Records that the authenticated user has played a track. This is used for listening history, recently played, and analytics.
If a playlistId is provided, the play is recorded with that playlist. Otherwise, the play is recorded for the artist only.
Returns the status of the play recording and a play count.`,
    }),
    ApiParam({ name: 'id', description: 'UUID of the track to play', type: 'string' }),
    ApiBody({
      required: false,
      schema: {
        type: 'object',
        properties: {
          playlistId: {
            type: 'string',
            format: 'uuid',
            description: 'Optional UUID of the playlist the track is being played from',
            example: '550e8400-e29b-41d4-a716-446655440001',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Track play recorded successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Track play recorded',
          data: {
            trackId: '550e8400-e29b-41d4-a716-446655440001',
            playCount: 42,
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid track ID or playlistId format' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Track not found' })
  );
}

// ─── Get User Uploaded Tracks ─────────────────────────────────────────────────

export function ApiGetUserTracks() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get tracks uploaded by a user',
      description:
        'Returns a paginated list of finished tracks uploaded by the specified user. ' +
        'The owner sees all visibility levels (public, private, follower_exclusive). ' +
        'Others see only public tracks. Private profiles are inaccessible to non-owners.',
    }),
    ApiParam({ name: 'userId', description: 'UUID of the user', type: 'string' }),
    ApiQuery({ name: 'page', required: false, type: 'number', example: 1 }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: 'number',
      example: 20,
      description: 'Items per page, capped at 100',
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of uploaded tracks',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              trackId: '550e8400-e29b-41d4-a716-446655440001',
              title: 'Midnight Drive',
              description: 'Lo-fi session recorded live.',
              coverImage: 'https://s3.amazonaws.com/covers/midnight.jpg',
              waveformUrl: 'https://s3.amazonaws.com/waveforms/midnight.json',
              durationSeconds: 213,
              playCount: 1500,
              likesCount: 320,
              repostsCount: 30,
              commentsCount: 14,
              visibility: 'public',
              explicitContent: false,
              createdAt: '2024-06-01T12:00:00Z',
            },
          ],
          pagination: { currentPage: 1, totalPages: 3, totalCount: 42, limit: 20 },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Profile is private',
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

// ─── Get Upload Quota ─────────────────────────────────────────────────────────

export function ApiGetUploadQuota() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get upload quota usage',
      description:
        'Returns how many minutes of audio the current user has uploaded versus their plan limit. ' +
        'Quota is calculated from total duration of all finished tracks. ' +
        'Limits: free = 120 min, go+ = 180 min, pro = unlimited.',
    }),
    ApiResponse({
      status: 200,
      description: 'Upload quota returned',
      schema: {
        example: {
          status: 'success',
          data: {
            plan: 'pro',
            usedMinutes: 87,
            limitMinutes: 180,
            remainingMinutes: 153,
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Unlimited plan example',
      schema: {
        example: {
          status: 'success',
          data: {
            plan: 'pro',
            usedMinutes: 312,
            limitMinutes: null,
            remainingMinutes: null,
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: { example: { statusCode: 404, message: 'User does not exist' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Track Playlists ──────────────────────────────────────────────────────

export function ApiGetTrackPlaylists() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get playlists containing a track',
      description:
        'Returns a paginated list of playlists that include this track. ' +
        'Public playlists are always shown. Private playlists are only shown to their owner. ' +
        'Returns 403 if the track itself is private and the requester is not the owner.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiQuery({ name: 'page', required: false, type: 'number', example: 1 }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: 'number',
      example: 20,
      description: 'Items per page, capped at 100',
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of playlists',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              playlistId: '660e8400-e29b-41d4-a716-446655440010',
              title: 'Late Night Vibes',
              description: 'Chill tracks for late nights.',
              coverImage: 'https://s3.amazonaws.com/covers/late-night.jpg',
              isPublic: true,
              tracksCount: 14,
              totalDurationSeconds: 3120,
              owner: {
                userId: '550e8400-e29b-41d4-a716-446655440001',
                username: 'dj_nour',
                displayName: 'Nour',
                avatarUrl: 'https://s3.amazonaws.com/avatars/nour.jpg',
              },
              addedAt: '2024-06-01T12:00:00Z',
            },
          ],
          pagination: { currentPage: 1, totalPages: 2, totalCount: 18, limit: 20 },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private',
      schema: { example: { statusCode: 403, message: 'This track is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: { example: { statusCode: 404, message: 'Track not found' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get Track ────────────────────────────────────────────────────────────────

export function ApiGetTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get a track',
      description:
        'Returns the full track object including metadata, genre, tags, waveform URL, and owner. ' +
        'Auth is optional — unauthenticated users can access public tracks. ' +
        'Private tracks require the owner to be authenticated. ' +
        'Audio URL is not returned, use GET track audio',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Track retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '550e8400-e29b-41d4-a716-446655440010',
            title: 'Summer Nights',
            description: 'A deep house track recorded live in Cairo.',
            coverImage: 'https://s3.amazonaws.com/covers/track_123.jpg',
            durationSeconds: 214,
            trackStatus: 'finished',
            waveformUrl: 'https://s3.amazonaws.com/waveforms/track_123.json',
            playCount: 1042,
            likesCount: 87,
            repostsCount: 14,
            commentsCount: 5,
            visibility: 'public',
            explicitContent: false,
            releaseDate: '2025-06-01',
            genre: { genreId: 'genre_001', name: 'Electronic' },
            tags: [
              {
                name: 'summer',
              },
              {
                name: 'cairo',
              },
            ],
            owner: {
              userId: '550e8400-e29b-41d4-a716-446655440001',
              username: 'yara_senousy',
              displayName: 'Yara Senousy',
              avatarUrl: 'https://s3.amazonaws.com/avatars/user_123.jpg',
            },
            createdAt: '2025-06-01T10:00:00Z',
            updatedAt: '2025-06-10T09:15:00Z',
            mainArtists: ['artist1', 'artist2'],
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Track is private and no valid token provided',
      schema: { example: { statusCode: 401, message: 'Unauthorized' } },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private and belongs to another user',
      schema: { example: { statusCode: 403, message: 'This track is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: { example: { statusCode: 404, message: 'Track not found' } },
    }),
    ApiResponse({
      status: 403,
      description: 'This track is not available in your region',
      schema: {
        example: { statusCode: 403, message: 'This track is not available in your region' },
      },
    })
  );
}

// ─── Get Track Audio ──────────────────────────────────────────────────────────

export function ApiGetTrackAudio() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get track audio URLs',
      description:
        'Returns the audio URL, preview URL, and duration for a finished track. ' +
        'Auth is optional — unauthenticated and free-tier users receive the standard audio URL. ' +
        'Pro and Go+ users receive the HQ audio URL. ' +
        'Returns 409 if the track is still processing.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Audio URLs returned successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            audioUrl: 'https://s3.amazonaws.com/audio/track_123.mp3',
            previewAudioUrl: 'https://s3.amazonaws.com/previews/track_123.mp3',
            durationSeconds: 214,
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private and belongs to another user',
      schema: { example: { statusCode: 403, message: 'This track is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: { example: { statusCode: 404, message: 'Track not found' } },
    }),
    ApiResponse({
      status: 409,
      description: 'Track is still processing',
      schema: { example: { statusCode: 409, message: 'Track audio is not available yet' } },
    })
  );
}

// ─── Update Blocked Regions ───────────────────────────────────────────────────

export function ApiUpdateBlockedRegions() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Set blocked regions for a track',
      description:
        "Replaces the track's blocked regions list entirely. " +
        'Pass an empty array to unblock all regions. ' +
        'Country names must match the format used by the geoip-lite lookup ' +
        '(e.g. "Egypt", "United States", "Germany"). ' +
        'Only the track owner can call this endpoint.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['blockedRegions'],
        properties: {
          blockedRegions: {
            type: 'array',
            items: { type: 'string' },
            example: ['Egypt', 'United States', 'Germany'],
            description: 'Full list of country names to block. Replaces existing list entirely.',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Blocked regions updated successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            trackId: '550e8400-e29b-41d4-a716-446655440010',
            blockedRegions: ['Egypt', 'United States', 'Germany'],
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid request body',
      schema: {
        example: {
          statusCode: 400,
          message: ['blockedRegions must be an array of non-empty strings'],
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'You do not own this track',
      schema: { example: { statusCode: 403, message: 'You do not own this track' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: { example: { statusCode: 404, message: 'Track not found' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get All Genres ───────────────────────────────────────────────────────────

export function ApiGetAllGenres() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all genres',
      description:
        'Returns the full list of available genres. No authentication required. ' +
        'Used to populate genre selector dropdowns in the track upload flow.',
    }),
    ApiResponse({
      status: 200,
      description: 'Genres retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            { genreId: 'genre_001', name: 'Electronic' },
            { genreId: 'genre_002', name: 'Hip-Hop' },
            { genreId: 'genre_003', name: 'Jazz' },
            { genreId: 'genre_004', name: 'House' },
            { genreId: 'genre_005', name: 'Techno' },
          ],
        },
      },
    })
  );
}

export function ApiDeleteTrack() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Delete a track',
      description: 'Deletes a track by ID. The requester must be the owner of the track.',
    }),
    ApiParam({ name: 'trackId', description: 'UUID of the track', type: 'string' }),
    ApiResponse({
      status: 200,
      description: 'Track deleted successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Track deleted successfully',
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'You do not own this track',
      schema: {
        example: { statusCode: 403, message: 'You do not own this track' },
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

// ─── Get Related Tracks ───────────────────────────────────────────────────────

export function ApiGetRelatedTracks() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get related tracks',
      description:
        'Returns a paginated list of tracks that are related to the given track, ' +
        'based on the listening history of its top fans. ' +
        'The track must be public. Results are cached for 3 days.',
    }),
    ApiParam({
      name: 'artistUsername',
      description: 'Username of the artist who owns the track',
      type: 'string',
      example: 'dj_nour',
    }),
    ApiParam({
      name: 'title',
      description: 'Title of the track',
      type: 'string',
      example: 'Midnight Drive',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number (default: 1)',
      type: 'number',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Items per page (default: 10)',
      type: 'number',
      example: 10,
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of related tracks',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              trackId: '550e8400-e29b-41d4-a716-446655440001',
              title: 'Neon Lights',
              description: 'Synthwave journey through a neon city.',
              coverImage: 'https://s3.amazonaws.com/covers/neon.jpg',
              waveformUrl: 'https://s3.amazonaws.com/waveforms/neon.json',
              durationSeconds: 198,
              playCount: 3200,
              likesCount: 420,
              repostsCount: 55,
              commentsCount: 18,
              visibility: 'public',
              explicitContent: false,
              createdAt: '2024-07-15T10:00:00.000Z',
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 4,
            totalCount: 40,
            limit: 10,
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Track is private',
      schema: { example: { statusCode: 403, message: 'This track is private' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Track not found',
      schema: { example: { statusCode: 404, message: 'Track not found' } },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}

// ─── Get All Time Stats ───────────────────────────────────────────────────────

export function ApiGetAllTimeStats() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get all-time stats for the authenticated artist',
      description:
        'Returns aggregated lifetime statistics for all tracks owned by the authenticated user: ' +
        'total plays, likes, reposts, comments, and downloads. ' +
        'Results are cached for 24 hours.',
    }),
    ApiResponse({
      status: 200,
      description: 'All-time stats retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            totalPlays: 152300,
            totalLikes: 8750,
            totalReposts: 2100,
            totalComments: 640,
            totalDownloads: 0,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' })
  );
}
