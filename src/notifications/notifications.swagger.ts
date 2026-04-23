import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';

const errorSchema = (statusCode: number, message: string) => ({
  schema: { example: { statusCode, message } },
});

// const invalidUuidResponse = ApiResponse({
//   status: HttpStatus.BAD_REQUEST,
//   description: 'Invalid UUID format',
//   content: {
//     'application/json': {
//       examples: {
//         invalidUuid: {
//           summary: 'Invalid UUID',
//           value: { statusCode: 400, message: 'notification_id must be a valid UUID' },
//         },
//       },
//     },
//   },
// });

const commonErrorResponses = [
  ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No valid authentication token provided',
    ...errorSchema(401, 'Unauthorized'),
  }),
  ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found',
    ...errorSchema(404, 'Notification not found'),
  }),
];

export function ApiGetNotifications() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get user notifications',
      description:
        'Retrieves a paginated list of notifications for the authenticated user, formatted as activity objects.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of items to return (max 50)',
      example: 20,
    }),
    ApiQuery({
      name: 'offset',
      required: false,
      type: Number,
      description: 'Number of items to skip',
      example: 0,
    }),
    ApiQuery({
      name: 'type',
      required: false,
      type: String,
      description: 'Filter by notification type (e.g., NEW_FOLLOWER, TRACK_LIKE)',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Successfully retrieved notifications',
      content: {
        'application/json': {
          examples: {
            success: {
              summary: 'Paginated Notifications List',
              value: {
                status: 'success',
                data: {
                  notifications: [
                    {
                      notification_id: '550e8400-e29b-41d4-a716-446655440001',
                      is_read: false,
                      created_at: '2026-04-23T10:00:00Z',
                      activity: {
                        activity_id: 'act_550e8400-e29b',
                        activity_type: 'NEW_FOLLOWER',
                        actor: {
                          user_id: '123e4567-e89b-12d3-a456-426614174000',
                          username: 'john_doe',
                          display_name: 'John Doe',
                          avatar_url: 'https://example.com/avatar.jpg',
                        },
                        target: null,
                        created_at: '2026-04-23T10:00:00Z',
                      },
                    },
                  ],
                  pagination: {
                    limit: 20,
                    offset: 0,
                    total: 1,
                    has_more: false,
                  },
                },
              },
            },
            empty: {
              summary: 'Empty Notifications List',
              value: {
                status: 'success',
                data: {
                  notifications: [],
                  pagination: { limit: 20, offset: 0, total: 0, has_more: false },
                },
              },
            },
          },
        },
      },
    }),
    ...commonErrorResponses
  );
}
