import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';

const errorSchema = (statusCode: number, message: string) => ({
  schema: { example: { statusCode, message } },
});

const invalidUuidResponse = ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Invalid UUID format',
  content: {
    'application/json': {
      examples: {
        invalidUuid: {
          summary: 'Invalid UUID',
          value: { statusCode: 400, message: 'user_id must be a valid UUID' },
        },
        selfFollow: {
          summary: 'Self-follow attempt',
          value: { statusCode: 400, message: 'You cannot follow yourself' },
        },
      },
    },
  },
});

const commonErrorResponses = [
  ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No valid authentication token provided',
    ...errorSchema(401, 'Unauthorized'),
  }),
  ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Target user not found',
    ...errorSchema(404, 'User not found'),
  }),
];

const privatOrBlockedResponse = ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: 'Account is private or a block relationship exists',
  content: {
    'application/json': {
      examples: {
        private: {
          summary: 'Private account',
          value: { statusCode: 403, message: 'This account is private' },
        },
        blocked: {
          summary: 'Block relationship',
          value: { statusCode: 403, message: 'Action not allowed due to a block relationship' },
        },
      },
    },
  },
});

export function ApiFollowUser() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Follow a user',
      description:
        'Creates a follow relationship. Returns 409 if already following, 403 if blocked, 400 if self-follow or invalid UUID.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the user to follow', type: String }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Follow relationship successfully created',
      schema: {
        example: {
          status: 'success',
          data: {
            followerId: '550e8400-e29b-41d4-a716-446655440001',
            followedId: '550e8400-e29b-41d4-a716-446655440002',
            createdAt: '2025-06-01T12:00:00Z',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid UUID or self-follow attempt',
      content: {
        'application/json': {
          examples: {
            invalidUuid: {
              summary: 'Invalid UUID',
              value: { statusCode: 400, message: 'user_id must be a valid UUID' },
            },
            selfFollow: {
              summary: 'Self-follow',
              value: { statusCode: 400, message: 'You cannot follow yourself' },
            },
          },
        },
      },
    }),
    ...commonErrorResponses,
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'A block relationship exists between the two users',
      ...errorSchema(403, 'Action not allowed due to a block relationship'),
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Already following this user',
      ...errorSchema(409, 'You are already following this user'),
    })
  );
}

export function ApiUnfollowUser() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Unfollow a user',
      description:
        'Removes a follow relationship. Returns 404 if not following, 400 if self-unfollow or invalid UUID.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the user to unfollow', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Follow relationship successfully removed',
      schema: { example: { status: 'success', message: 'Successfully unfollowed user' } },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid UUID or self-unfollow attempt',
      content: {
        'application/json': {
          examples: {
            invalidUuid: {
              summary: 'Invalid UUID',
              value: { statusCode: 400, message: 'user_id must be a valid UUID' },
            },
            selfUnfollow: {
              summary: 'Self-unfollow',
              value: { statusCode: 400, message: 'You cannot unfollow yourself' },
            },
          },
        },
      },
    }),
    ...commonErrorResponses
  );
}

export function ApiGetFollowStatus() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get follow status',
      description:
        'Returns the follow relationship status between the authenticated user and the target user.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the target user', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Follow status successfully returned',
      content: {
        'application/json': {
          examples: {
            following: {
              summary: 'Following',
              value: {
                status: 'success',
                data: { followStatus: 'following', since: '2025-01-15T08:30:00Z' },
              },
            },
            mutual: {
              summary: 'Mutual',
              value: {
                status: 'success',
                data: { followStatus: 'mutual', since: '2025-01-15T08:30:00Z' },
              },
            },
            notFollowing: {
              summary: 'Not following',
              value: { status: 'success', data: { followStatus: 'notFollowing' } },
            },
          },
        },
      },
    }),
    invalidUuidResponse,
    ...commonErrorResponses,
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'A block relationship exists between the two users',
      ...errorSchema(403, 'Action not allowed due to a block relationship'),
    })
  );
}

export function ApiGetFollowers() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get followers list',
      description:
        'Returns a paginated list of users that follow the specified user. Private accounts are only visible to the account owner.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the target user', type: String }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Followers list successfully returned',
      schema: {
        example: {
          status: 'success',
          data: {
            followers: [
              {
                userId: '550e8400-e29b-41d4-a716-446655440001',
                username: 'john_doe',
                displayName: 'John Doe',
                avatarUrl: 'https://s3.amazonaws.com/avatars/john.jpg',
                followersCount: 100,
                isFollowedBack: true,
              },
            ],
            pagination: { currentPage: 1, totalPages: 5, totalCount: 98, limit: 20 },
          },
        },
      },
    }),
    invalidUuidResponse,
    ...commonErrorResponses,
    privatOrBlockedResponse
  );
}

export function ApiGetFollowing() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get following list',
      description:
        'Returns a paginated list of users that the specified user is following. Private accounts are only visible to the account owner.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the target user', type: String }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Following list successfully returned',
      schema: {
        example: {
          status: 'success',
          data: {
            following: [
              {
                userId: '550e8400-e29b-41d4-a716-446655440001',
                username: 'john_doe',
                displayName: 'John Doe',
                avatarUrl: 'https://s3.amazonaws.com/avatars/john.jpg',
                followersCount: 100,
                isFollowingBack: true,
              },
            ],
            pagination: { currentPage: 1, totalPages: 5, totalCount: 98, limit: 20 },
          },
        },
      },
    }),
    invalidUuidResponse,
    ...commonErrorResponses,
    privatOrBlockedResponse
  );
}

export function ApiGetFollowersCount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get followers count',
      description:
        'Returns the total number of followers for the specified user. Private accounts are only visible to the account owner.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the target user', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Followers count successfully returned',
      schema: {
        example: {
          status: 'success',
          data: { userId: '550e8400-e29b-41d4-a716-446655440001', followersCount: 1024 },
        },
      },
    }),
    invalidUuidResponse,
    ...commonErrorResponses,
    privatOrBlockedResponse
  );
}

export function ApiGetFollowingCount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get following count',
      description:
        'Returns the total number of users the specified user is following. Private accounts are only visible to the account owner.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the target user', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Following count successfully returned',
      schema: {
        example: {
          status: 'success',
          data: { userId: '550e8400-e29b-41d4-a716-446655440001', followingsCount: 512 },
        },
      },
    }),
    invalidUuidResponse,
    ...commonErrorResponses,
    privatOrBlockedResponse
  );
}

export function ApiBlockUser() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Block a user',
      description:
        'Blocks the specified user on behalf of the authenticated user. Enforces mutual invisibility and removes any existing follow relationships between the two users.',
    }),
    ApiParam({
      name: 'user_id',
      description: 'ID of the user to be blocked',
      type: String,
      example: '1066b876-d3c5-46ed-b954-ac24fdab3294',
    }),

    // Success Response (201 Created)
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Block relationship successfully created',
      schema: {
        example: {
          status: 'success',
          data: {
            blockerId: 'e4fbc35b-2881-4fdc-bd05-d3900b2eb61a',
            blockedId: '1066b876-d3c5-46ed-b954-ac24fdab3294',
            createdAt: '2025-06-01T12:00:00Z',
          },
        },
      },
    }),

    // Self-block (400 Bad Request)
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'User attempted to block themselves',
      ...errorSchema(400, 'You cannot block yourself'),
    }),

    // Unauthorized (401) & Not Found (404)
    ...commonErrorResponses,

    // Already Blocked (409 Conflict)
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Block relationship already exists',
      ...errorSchema(409, 'You have already blocked this user'),
    }),

    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Unexpected server error',
      ...errorSchema(500, 'Internal server error'),
    })
  );
}

export function ApiUnblockUser() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Unblock a user',
      description:
        'Removes the block relationship between the authenticated user and the target user. This does not restore previous follow relationships.',
    }),
    ApiParam({
      name: 'user_id',
      description: 'ID of the user to unblock',
      type: String,
      example: '993f6e51-3927-4740-bcbf-96e7919964bc',
    }),

    // Success Response (200 OK)
    ApiResponse({
      status: HttpStatus.OK,
      description: 'User successfully unblocked',
      schema: {
        example: {
          status: 'success',
          message: 'User successfully unblocked',
        },
      },
    }),

    // Self-unblock (400 Bad Request)
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'User attempted to unblock themselves',
      ...errorSchema(400, 'You cannot unblock yourself'),
    }),

    // Unauthorized (401)
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'No valid authentication token provided',
      ...errorSchema(401, 'Unauthorized'),
    }),

    // Block Not Found (404)
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Block relationship not found',
      ...errorSchema(404, 'You have not blocked this user'),
    }),

    // Internal Server Error (500)
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Unexpected server error',
      ...errorSchema(500, 'Internal server error'),
    })
  );
}

export function ApiGetBlockedUsers() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get blocked users',
      description: 'Retrieves a paginated list of all users blocked by the authenticated user.',
    }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Successfully retrieved blocked users list',
      schema: {
        example: {
          status: 'success',
          data: {
            blockedUsers: [
              {
                userId: '112f6e51-3927-4740-bcbf-96e791996111',
                username: 'toxic_user',
                displayName: 'Toxic User',
                avatarUrl: 'https://s3.amazonaws.com/avatars/toxic.jpg',
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
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'No valid authentication token provided',
      ...errorSchema(401, 'Unauthorized'),
    })
  );
}

export function ApiGetBlockStatus() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get block status',
      description:
        'Returns the block relationship status between the authenticated user and the target user.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the target user', type: String }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Block status successfully returned',
      content: {
        'application/json': {
          examples: {
            blocking: {
              summary: 'Blocking',
              value: {
                status: 'success',
                data: { blockStatus: 'blocking', since: '2025-03-10T09:00:00Z' },
              },
            },
            blockedBy: {
              summary: 'Blocked By',
              value: {
                status: 'success',
                data: { blockStatus: 'blockedBy', since: '2025-04-22T14:30:00Z' },
              },
            },
            mutualBlock: {
              summary: 'Mutual Block',
              value: { status: 'success', data: { blockStatus: 'mutualBlock' } },
            },
            noBlock: {
              summary: 'No Block',
              value: { status: 'success', data: { blockStatus: 'none' } },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Cannot check block status with yourself',
      ...errorSchema(400, 'Cannot check block status with yourself'),
    }),
    ...commonErrorResponses
  );
}

export function ApiGetMutualFollowers() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get mutual followers',
      description:
        'Returns a paginated list of users that the authenticated user follows who also follow the target user (like Instagram). Enforces blocking rules.',
    }),
    ApiParam({
      name: 'user_id',
      description: 'ID of the target profile being viewed',
      type: String,
    }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Mutual followers list successfully returned',
      schema: {
        example: {
          status: 'success',
          data: {
            targetUserId: '550e8400-e29b-41d4-a716-446655440001',
            mutualFollowers: [
              {
                userId: '550e8400-e29b-41d4-a716-446655440003',
                username: 'mutual_follower',
                displayName: 'Mutual follower',
                avatarUrl: 'https://s3.amazonaws.com/avatars/mutual.jpg',
              },
            ],
            pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid UUID or comparing against yourself',
      content: {
        'application/json': {
          examples: {
            invalidUuid: {
              summary: 'Invalid UUID',
              value: { statusCode: 400, message: 'user_id must be a valid UUID' },
            },
            identicalUsers: {
              summary: 'Self Comparison',
              value: {
                statusCode: 400,
                message: 'Cannot view mutual followers with yourself',
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Action not allowed due to a block relationship',
      schema: {
        example: {
          statusCode: 403,
          message: 'Action not allowed due to a block relationship',
          error: 'Forbidden',
        },
      },
    }),
    ...commonErrorResponses
  );
}

export function ApiGetSuggestedUsers() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get suggested users',
      description:
        'Returns a paginated list of suggested users to follow based on popularity, mutual connections, or shared favorite genres.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
    }),
    ApiQuery({
      name: 'by',
      required: false,
      type: String,
      description: 'The recommendation algorithm to use',
      enum: ['popular', 'mutuals', 'genre'],
      example: 'popular',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Suggested users list successfully returned',
      schema: {
        example: {
          status: 'success',
          data: {
            suggestedUsers: [
              {
                userId: '550e8400-e29b-41d4-a716-446655440999',
                username: 'rising_star',
                displayName: 'Rising Star',
                avatarUrl: 'https://s3.amazonaws.com/avatars/star.jpg',
                followersCount: 1500,
              },
            ],
            pagination: {
              currentPage: 1,
              totalPages: 2,
              totalCount: 35,
              limit: 20,
            },
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'No valid authentication token provided',
      ...errorSchema(401, 'Unauthorized'),
    })
  );
}

export function ApiGetFriends() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get friends list',
      description:
        'Returns a paginated list of friends (both follow each other) for the specified user.',
    }),
    ApiParam({ name: 'user_id', description: 'ID of the target user', type: String }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Friends list successfully returned',
      schema: {
        example: {
          status: 'success',
          data: {
            friends: [
              {
                userId: '550e8400-e29b-41d4-a716-446655440003',
                username: 'mutual_friend',
                displayName: 'Mutual Friend',
                avatarUrl: 'https://s3.amazonaws.com/avatars/friend.jpg',
                followersCount: 250,
              },
            ],
            pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 },
          },
        },
      },
    }),
    invalidUuidResponse,
    ...commonErrorResponses,
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'A block relationship exists between the two users',
      ...errorSchema(403, 'Action not allowed due to a block relationship'),
    })
  );
}
