import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

// ─── Get Privacy Settings ─────────────────────────────────────────────────

export function ApiGetPrivacySettings() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get privacy settings',
      description: `Returns the authenticated user's privacy settings.
These settings control visibility of activities, fan lists, and messaging permissions.`,
    }),
    ApiResponse({
      status: 200,
      description: 'Privacy settings retrieved successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Privacy settings retrieved successfully',
          data: {
            showMyActivities: true,
            allowMessagesFromAnyone: true,
            showWhenTopOrFirstFan: true,
            showMyTrackTopAndFirstFans: true,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Settings not found for this user' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Update Privacy Settings ──────────────────────────────────────────────

export function ApiUpdatePrivacySettings() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Update privacy settings',
      description: `Updates one or more of the authenticated user's privacy settings.
Only the fields included in the request body are updated; omitted fields remain unchanged.

**Field descriptions:**
- \`showMyActivities\`: Whether your activities (follows, likes, reposts, comments) are visible to others
- \`allowMessagesFromAnyone\`: Whether you allow DMs from any user (when false, only followed users can message)
- \`showWhenTopOrFirstFan\`: Whether your profile appears as a "top fan" or "first fan" on tracks you've engaged with
- \`showMyTrackTopAndFirstFans\`: Whether you display top fans and first fans on your own tracks (only users who opt-in to \`showWhenTopOrFirstFan\` appear)`,
    }),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          showMyActivities: {
            type: 'boolean',
            description: 'Show my activities to others',
            example: true,
          },
          allowMessagesFromAnyone: {
            type: 'boolean',
            description: 'Allow messages from anyone',
            example: true,
          },
          showWhenTopOrFirstFan: {
            type: 'boolean',
            description: 'Show when I am a top or first fan',
            example: true,
          },
          showMyTrackTopAndFirstFans: {
            type: 'boolean',
            description: 'Show my track top and first fans',
            example: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Privacy settings updated successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Privacy settings updated successfully',
          data: {
            showMyActivities: false,
            allowMessagesFromAnyone: true,
            showWhenTopOrFirstFan: true,
            showMyTrackTopAndFirstFans: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid request body',
      schema: {
        example: {
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'showMyActivities', message: 'Must be a boolean' }],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Settings not found for this user' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
