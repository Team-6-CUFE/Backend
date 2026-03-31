import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

const errorSchema = (message: string) => ({
  schema: { example: { status: 'error', message } },
});

const invalidUuidResponse = ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Invalid UUID format',
  content: {
    'application/json': {
      examples: {
        invalidUuid: {
          summary: 'Invalid UUID',
          value: { status: 'error', message: 'user_id must be a valid UUID' },
        },
        selfFollow: {
          summary: 'Self-follow attempt',
          value: { status: 'error', message: 'You cannot follow yourself' },
        },
      },
    },
  },
});

const commonErrorResponses = [
  ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No valid authentication token provided',
    ...errorSchema('Unauthorized'),
  }),
  ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Target user not found',
    ...errorSchema('User not found'),
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
          value: { status: 'error', message: 'This account is private' },
        },
        blocked: {
          summary: 'Block relationship',
          value: { status: 'error', message: 'Action not allowed due to a block relationship' },
        },
      },
    },
  },
});

export function ApiFollowUser() {
  return applyDecorators(
    ApiBearerAuth(),
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
              value: { status: 'error', message: 'user_id must be a valid UUID' },
            },
            selfFollow: {
              summary: 'Self-follow',
              value: { status: 'error', message: 'You cannot follow yourself' },
            },
          },
        },
      },
    }),
    ...commonErrorResponses,
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'A block relationship exists between the two users',
      ...errorSchema('Action not allowed due to a block relationship'),
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Already following this user',
      ...errorSchema('You are already following this user'),
    })
  );
}

export function ApiUnfollowUser() {
  return applyDecorators(
    ApiBearerAuth(),
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
              value: { status: 'error', message: 'user_id must be a valid UUID' },
            },
            selfUnfollow: {
              summary: 'Self-unfollow',
              value: { status: 'error', message: 'You cannot unfollow yourself' },
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
    ApiBearerAuth(),
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
      ...errorSchema('Action not allowed due to a block relationship'),
    })
  );
}

export function ApiGetFollowers() {
  return applyDecorators(
    ApiBearerAuth(),
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
    ApiBearerAuth(),
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
    ApiBearerAuth(),
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
    ApiBearerAuth(),
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
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Block a user',
      description:
        'Blocks the specified user on behalf of the authenticated user. Enforces mutual invisibility and removes any existing follow relationships between the two users.',
    }),
    ApiParam({
      name: 'user_id',
      description: 'ID of the user to be blocked',
      type: String,
      example: 'usr_456',
    }),

    // Success Response (201 Created)
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Block relationship successfully created',
      schema: {
        example: {
          status: 'success',
          data: {
            blocker_id: 'usr_123',
            blocked_id: 'usr_456',
            created_at: '2025-06-01T12:00:00Z',
          },
        },
      },
    }),

    // Self-block (400 Bad Request)
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'User attempted to block themselves',
      content: {
        'application/json': {
          example: {
            status: 'error',
            message: 'You cannot block yourself',
          },
        },
      },
    }),

    // Unauthorized (401) & Not Found (404)
    ...commonErrorResponses,

    // Already Blocked (409 Conflict)
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Block relationship already exists',
      content: {
        'application/json': {
          example: {
            status: 'error',
            message: 'You have already blocked this user',
          },
        },
      },
    }),

    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Unexpected server error',
      ...errorSchema('Internal server error'),
    })
  );
}

export function ApiUnblockUser() {
  return applyDecorators(
    ApiBearerAuth(),
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
      content: {
        'application/json': {
          example: {
            status: 'error',
            message: 'You cannot unblock yourself',
          },
        },
      },
    }),

    // Unauthorized (401)
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'No valid authentication token provided',
      content: {
        'application/json': {
          example: {
            statusCode: 401,
            message: 'Unauthorized',
          },
        },
      },
    }),

    // Block Not Found (404)
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Block relationship not found',
      content: {
        'application/json': {
          example: {
            status: 'error',
            message: 'You have not blocked this user',
          },
        },
      },
    }),

    // Internal Server Error (500)
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Unexpected server error',
      content: {
        'application/json': {
          example: {
            statusCode: 500,
            message: 'Internal server error',
          },
        },
      },
    })
  );
}

export function ApiGetBlockedUsers() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get blocked users',
      description: 'Retrieves a paginated list of all users blocked by the authenticated user.',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Successfully retrieved blocked users list',
      schema: {
        example: {
          status: 'success',
          data: {
            blocked_users: [
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
    })
  );
}

export function ApiGetBlockStatus() {
  return applyDecorators(
    ApiBearerAuth(),
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
                data: { blockStatus: 'blocked_by', since: '2025-04-22T14:30:00Z' },
              },
            },
            mutualBlock: {
              summary: 'Mutual Block',
              value: { status: 'success', data: { blockStatus: 'mutual_block' } },
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
      ...errorSchema('Cannot check block status with yourself'),
    }),
    ...commonErrorResponses
  );
}
