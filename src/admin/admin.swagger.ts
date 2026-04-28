import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SuspendUserDto } from './dto/suspend-user.dto';

export function ApiGetAllUsers() {
  return applyDecorators(
    ApiOperation({
      summary: 'Retrieve paginated users',
      description:
        'Fetches a list of all users on the platform. Includes pagination (limit and offset) and an optional search query that matches against both usernames and email addresses.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'The maximum number of users to return. Capped at 50.',
      example: 20,
    }),
    ApiQuery({
      name: 'offset',
      required: false,
      type: Number,
      description: 'The number of users to skip before starting to collect the result set.',
      example: 0,
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description:
        'Optional search term to filter users by username or email address (case-insensitive).',
      example: 'schuyler.kozey-okuneva',
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the list of users.',
      schema: {
        example: {
          status: 'success',
          data: {
            users: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                username: 'schuyler.kozey-okuneva',
                isSuspended: false,
                createdAt: '2026-04-20T10:30:00Z',
                emails: [{ email: 'schuyler@example.com' }],
              },
            ],
            pagination: {
              limit: 20,
              offset: 0,
              total: 145,
              hasMore: true,
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized. The user making the request is not authenticated.',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden. The user does not have the required admin role.',
    })
  );
}

export function ApiSuspendUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Suspend a user account',
      description:
        'Suspends a specific user account by their ID. Requires a detailed reason for the suspension, which will be saved in the database.',
    }),
    ApiParam({
      name: 'user_id',
      type: 'string',
      format: 'uuid',
      description: 'The UUID of the user you want to suspend.',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiBody({
      type: SuspendUserDto,
      description: 'The reason for suspending the user.',
      examples: {
        spam: {
          summary: 'Spam Behavior',
          value: { reason: 'Uploading copyrighted tracks and spamming comments.' },
        },
        harassment: {
          summary: 'Harassment',
          value: { reason: 'Harassing other artists in direct messages.' },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'User was successfully suspended.',
      schema: {
        example: {
          status: 'success',
          message: 'User suspended successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description:
        'Bad Request. Usually happens if the reason is missing or exceeds 500 characters.',
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found. No user exists with the provided UUID.',
    })
  );
}

export function ApiReactivateUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reactivate a suspended user',
      description:
        'Lifts the suspension on a specific user account and clears their suspension reason from the database, restoring their access.',
    }),
    ApiParam({
      name: 'user_id',
      type: 'string',
      format: 'uuid',
      description: 'The UUID of the user you want to reactivate.',
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    ApiResponse({
      status: 200,
      description: 'User was successfully reactivated.',
      schema: {
        example: {
          status: 'success',
          message: 'User reactivated successfully',
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found. No user exists with the provided UUID.',
    })
  );
}
