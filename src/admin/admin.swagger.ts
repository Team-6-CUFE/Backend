import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CreateReportDto } from './dto/createReport.dto';
import { ReportStatus } from './report-enums';
import { SuspendUserDto } from './dto/suspend-user.dto';

export function ApiAddReport() {
  return applyDecorators(
    ApiBearerAuth('access_token'),
    ApiOperation({
      summary: 'Submit a report',
      description:
        'Allows an authenticated user to report a user, track, or comment. ' +
        'A user cannot report the same target twice, cannot report themselves, ' +
        'and cannot report their own tracks or comments.',
    }),
    ApiBody({
      type: CreateReportDto,
      description:
        'Report payload. `type` accepts: `user | track | comment`. ' +
        '`reason` accepts: `copyright | inappropriate | spam | harassment`. ' +
        '`targetId` must be a valid UUID of the reported entity. ' +
        '`description` is optional free text for additional context.',
      examples: {
        reportTrack: {
          summary: 'Report a track',
          value: {
            type: 'track',
            targetId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
            reason: 'copyright',
            description: 'This track uses my original composition without permission.',
          },
        },
        reportUser: {
          summary: 'Report a user',
          value: {
            type: 'user',
            targetId: 'c7d8e9f0-1234-5678-abcd-ef0987654321',
            reason: 'harassment',
            description: 'This user has been sending threatening messages.',
          },
        },
        reportComment: {
          summary: 'Report a comment',
          value: {
            type: 'comment',
            targetId: 'd4e5f6a7-b8c9-0123-abcd-ef4567890123',
            reason: 'spam',
            description: null,
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Report submitted successfully.',
      schema: {
        example: {
          status: 'success',
          message: 'Report submitted successfully',
          data: {
            reportId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            reporterId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
            type: 'track',
            targetId: 'c7d8e9f0-1234-5678-abcd-ef0987654321',
            reason: 'copyright',
            description: 'This track uses my original composition without permission.',
            status: 'pending',
            reviewedAt: null,
            createdAt: '2025-04-29T12:00:00.000Z',
            updatedAt: '2025-04-29T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Duplicate report — user has already reported this target.',
      schema: {
        example: { statusCode: 400, message: 'You have already submitted this report' },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'User attempted to report themselves, their own track, or their own comment.',
      schema: {
        example: { statusCode: 403, message: 'You cannot report your own track' },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid access token.' })
  );
}

export function ApiGetAllReports() {
  return applyDecorators(
    ApiBearerAuth('access_token'),
    ApiOperation({
      summary: 'Get all reports (Admin only)',
      description:
        'Returns a paginated list of all reports enriched with reporter and target details. ' +
        'Target details vary by report type: user reports return user profile info, ' +
        'track reports return track title and cover image, ' +
        'comment reports return comment content and author.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of reports per page (default: 20)',
      example: 20,
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of enriched reports.',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              reportId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              type: 'track',
              reason: 'copyright',
              description: 'This track uses my original composition without permission.',
              status: 'pending',
              reviewedBy: null,
              reviewedAt: null,
              createdAt: '2025-04-29T12:00:00.000Z',
              updatedAt: '2025-04-29T12:00:00.000Z',
              reporter: {
                userId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                coverPhoto: 'https://cdn.harmonica.com/covers/dj_nour.jpg',
              },
              target: {
                trackId: 'c7d8e9f0-1234-5678-abcd-ef0987654321',
                title: 'Midnight Drive',
                coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
              },
            },
            {
              reportId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
              type: 'user',
              reason: 'harassment',
              description: 'This user has been sending threatening messages.',
              status: 'reviewed',
              reviewedBy: 'admin-uuid',
              reviewedAt: '2025-04-29T13:00:00.000Z',
              createdAt: '2025-04-29T11:00:00.000Z',
              updatedAt: '2025-04-29T13:00:00.000Z',
              reporter: {
                userId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                coverPhoto: null,
              },
              target: {
                username: 'bad_user',
                displayName: 'Bad User',
                avatarUrl: null,
                coverPhoto: null,
                isPublic: true,
              },
            },
            {
              reportId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
              type: 'comment',
              reason: 'spam',
              description: null,
              status: 'pending',
              reviewedBy: null,
              reviewedAt: null,
              createdAt: '2025-04-29T10:00:00.000Z',
              updatedAt: '2025-04-29T10:00:00.000Z',
              reporter: {
                userId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
                username: 'dj_nour',
                displayName: 'DJ Nour',
                avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
                coverPhoto: null,
              },
              target: {
                commentId: 'd4e5f6a7-b8c9-0123-abcd-ef4567890123',
                userId: 'e5f6a7b8-c9d0-1234-bcde-f67890123456',
                content: 'Buy followers now at spam-site.com!',
              },
            },
          ],
          meta: {
            total: 100,
            page: 1,
            limit: 20,
            totalPages: 5,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid access token.' }),
    ApiResponse({ status: 403, description: 'Forbidden — admin access only.' })
  );
}

export function ApiDeleteReport() {
  return applyDecorators(
    ApiBearerAuth('access_token'),
    ApiOperation({
      summary: 'Delete a report (Admin only)',
      description:
        'Permanently deletes a report by its ID. Throws 400 if the report does not exist.',
    }),
    ApiParam({
      name: 'reportId',
      description: 'UUID of the report to delete.',
      format: 'uuid',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    ApiResponse({
      status: 200,
      description: 'Report deleted successfully.',
      schema: {
        example: {
          status: 'success',
          message: 'Report deleted successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Report not found.',
      schema: {
        example: {
          statusCode: 400,
          message: 'Report not found',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid access token.' }),
    ApiResponse({ status: 403, description: 'Forbidden — admin access only.' })
  );
}

export function ApiUpdateReportStatus() {
  return applyDecorators(
    ApiBearerAuth('access_token'),
    ApiOperation({
      summary: 'Update report status (Admin only)',
      description:
        'Updates the status of a report and sets reviewedAt to the current date. ' +
        'Throws 400 if the report does not exist.',
    }),
    ApiParam({
      name: 'reportId',
      description: 'UUID of the report to update.',
      format: 'uuid',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    ApiQuery({
      name: 'status',
      required: true,
      enum: ReportStatus,
      description:
        'New status to set. Accepted values: `pending | reviewed | resolved | rejected`.',
      example: ReportStatus.RESOLVED,
    }),
    ApiResponse({
      status: 200,
      description: 'Report status updated successfully.',
      schema: {
        example: {
          status: 'success',
          message: 'Report status updated successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Report not found.',
      schema: {
        example: {
          statusCode: 400,
          message: 'Report not found',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid access token.' }),
    ApiResponse({ status: 403, description: 'Forbidden — admin access only.' })
  );
}
export function ApiGetReport() {
  return applyDecorators(
    ApiBearerAuth('access_token'),
    ApiOperation({
      summary: 'Get a report by ID (Admin only)',
      description:
        'Returns a single report enriched with reporter and target details. ' +
        'Target details vary by report type: user reports return user profile info, ' +
        'track reports return track title and cover image, ' +
        'comment reports return comment content and author.',
    }),
    ApiParam({
      name: 'reportId',
      description: 'UUID of the report to retrieve.',
      format: 'uuid',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    ApiResponse({
      status: 200,
      description: 'Report retrieved successfully.',
      schema: {
        example: {
          status: 'success',
          data: {
            reportId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            type: 'track',
            reason: 'copyright',
            description: 'This track uses my original composition without permission.',
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            createdAt: '2025-04-29T12:00:00.000Z',
            updatedAt: '2025-04-29T12:00:00.000Z',
            reporter: {
              userId: 'b6fc3946-ee96-4721-9118-5ca776a874f8',
              username: 'dj_nour',
              displayName: 'DJ Nour',
              avatarUrl: 'https://cdn.harmonica.com/avatars/dj_nour.jpg',
              coverPhoto: 'https://cdn.harmonica.com/covers/dj_nour.jpg',
            },
            target: {
              trackId: 'c7d8e9f0-1234-5678-abcd-ef0987654321',
              title: 'Midnight Drive',
              coverImage: 'https://cdn.harmonica.com/covers/midnight.jpg',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Report not found.',
      schema: {
        example: {
          statusCode: 400,
          message: 'Report not found',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid access token.' }),
    ApiResponse({ status: 403, description: 'Forbidden — admin access only.' })
  );
}

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
