import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateReportDto } from './dto/createReport.dto';

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
