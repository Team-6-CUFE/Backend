import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';

export function ApiGetMyProfile() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get my profile',
      description:
        'Returns the full profile of the currently authenticated user, including private fields like birthdate, gender, email, plan, and favorite genres.',
    }),
    ApiResponse({
      status: 200,
      description: 'Profile retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440001',
            username: 'moaaz_dev',
            firstName: 'Moaaz',
            lastName: 'Dev',
            displayName: 'Moaaz Dev',
            bio: 'Backend dev and music lover.',
            avatarUrl: 'https://cdn.example.com/avatars/moaaz.jpg',
            coverPhoto: 'https://cdn.example.com/covers/moaaz.jpg',
            country: 'EG',
            city: 'Cairo',
            role: 'artist',
            isPublic: true,
            favoriteGenres: ['Rock', 'Jazz'],
            supportLink: 'https://ko-fi.com/moaaz',
            createdAt: '2025-01-10T08:00:00.000Z',
            email: 'moaaz@example.com',
            birthdate: '1999-05-15',
            gender: 'male',
            plan: 'free',
            updatedAt: '2025-03-01T12:00:00.000Z',
            externalProfiles: [
              { id: 'abc-123', name: 'instagram', url: 'https://instagram.com/moaaz' },
            ],
            favoritesCount: 0,
            playlistCount: 0,
            trackCount: 0,
            followingsCount: 0,
            followersCount: 0,
            repostsCount: 0,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiGetProfile() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a public profile by username',
      description:
        'Returns the public profile of a user by their username. Does not require authentication.',
    }),
    ApiParam({
      name: 'username',
      description: 'The username of the profile to fetch',
      example: 'moaaz_dev',
    }),
    ApiResponse({
      status: 200,
      description: 'Public profile retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440001',
            username: 'moaaz_dev',
            firstName: 'Moaaz',
            lastName: 'Dev',
            displayName: 'Moaaz Dev',
            bio: 'Backend dev and music lover.',
            avatarUrl: 'https://cdn.example.com/avatars/moaaz.jpg',
            coverPhoto: 'https://cdn.example.com/covers/moaaz.jpg',
            country: 'EG',
            city: 'Cairo',
            role: 'artist',
            isPublic: true,
            favoriteGenres: ['Rock', 'Jazz'],
            supportLink: 'https://ko-fi.com/moaaz',
            createdAt: '2025-01-10T08:00:00.000Z',
            externalProfiles: [{ name: 'instagram', url: 'https://instagram.com/moaaz' }],
            favoritesCount: 0,
            playlistCount: 0,
            trackCount: 0,
            followingsCount: 0,
            followersCount: 0,
            repostsCount: 0,
          },
        },
      },
    }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiUpdateProfile() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Update my profile',
      description:
        'Updates editable profile fields. All fields are optional — only send what you want to change. Favorite genres are replaced entirely when provided.',
    }),
    ApiResponse({
      status: 200,
      description: 'Profile updated successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Profile updated successfully',
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440001',
            username: 'moaaz_dev',
            firstName: 'Moaaz',
            lastName: 'Dev',
            displayName: 'Moaaz Updated',
            bio: 'Backend dev by day.',
            country: 'EG',
            city: 'Alexandria',
            gender: 'male',
            favoriteGenres: ['Electronic', 'Hip-Hop'],
            supportLink: null,
            isPublic: true,
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error',
      schema: {
        example: {
          status: 'error',
          message: 'Validation failed',
          errors: [
            {
              field: 'username',
              message:
                'Username must start with a letter and can only contain letters, numbers, and underscores',
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiUpdateBirthdate() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Update my birthdate',
      description:
        "Updates the authenticated user's birthdate. Must be in YYYY-MM-DD format, not in the future, and the user must be at least 13 years old.",
    }),
    ApiResponse({
      status: 200,
      description: 'Birthdate updated successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Birthdate updated successfully',
          data: {
            birthdate: '1999-05-15',
            age: 90,
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid format, future date, or age restriction',
      content: {
        'application/json': {
          examples: {
            invalidFormat: {
              summary: 'Wrong format',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'birthdate', message: 'Birthdate must be in YYYY-MM-DD format' }],
              },
            },
            futureDate: {
              summary: 'Date is in the future',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'birthdate', message: 'Birthdate cannot be in the future' }],
              },
            },
            tooYoung: {
              summary: 'User under 13',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'birthdate', message: 'You must be at least 13 years old' }],
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiUpdateGender() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Update my gender',
      description:
        "Updates the authenticated user's gender. Accepted values: 'male', 'female', 'preferNotToSay'.",
    }),
    ApiResponse({
      status: 200,
      description: 'Gender updated successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Gender updated successfully',
          data: {
            gender: 'female',
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid gender value',
      schema: {
        example: {
          status: 'error',
          message: 'Validation failed',
          errors: [
            { field: 'gender', message: "Gender must be one of: 'male','female','preferNotToSay'" },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiUpdatePrivacy() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Change account privacy',
      description:
        "Toggles the authenticated user's account between public and private. Private accounts hide their content from non-followers.",
    }),
    ApiResponse({
      status: 200,
      description: 'Privacy setting updated successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Privacy settings updated successfully',
          data: {
            isPublic: false,
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error',
      schema: {
        example: {
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'isPublic', message: 'isPublic must be a boolean' }],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiUpdateAvatar() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Update profile picture',
      description:
        "Updates the authenticated user's avatar/profile picture. The image is optimized, converted to WebP, and saved to S3.",
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Image file (JPEG, PNG, WebP) max 5MB',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Profile picture updated successfully',
      schema: {
        example: {
          status: 'Success',
          message: 'Profile picture updated successfully',
          data: {
            avatarUrl:
              'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/profiles/1f2561b1-adbc-4319-b5bb-53102bb92ab2/avatar_1775521418796.webp',
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid file or size limit exceeded',
      schema: {
        example: {
          status: 'error',
          message: 'Invalid file',
          errors: [{ field: 'file', message: 'File size exceeds 5MB limit or invalid file type' }],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiUpdateCover() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Update cover photo',
      description: "Updates the authenticated user's cover photo and saves it to S3.",
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Image file (JPEG, PNG, WebP) max 5MB',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Cover photo updated successfully',
      schema: {
        example: {
          status: 'Success',
          message: 'Cover photo updated successfully',
          data: {
            coverPhoto:
              'https://harmonica-s3-storage-287109772507-us-east-1-an.s3.amazonaws.com/profiles/1f2561b1-adbc-4319-b5bb-53102bb92ab2/cover_1775522879552.jpeg',
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid file or size limit exceeded',
      schema: {
        example: {
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'file', message: 'File size exceeds 5MB limit or invalid file type' }],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiGetExternalProfiles() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get my external profiles',
      description:
        'Returns all external profile links saved by the authenticated user (e.g. Instagram, Twitter). Up to 10 entries.',
    }),
    ApiResponse({
      status: 200,
      description: 'External profiles retrieved successfully',
      schema: {
        example: {
          status: 'Success',
          data: [
            {
              id: 'abc-uuid-1',
              userId: '550e8400-e29b-41d4-a716-446655440001',
              name: 'instagram',
              url: 'https://instagram.com/moaaz',
              createdAt: '2025-03-01T12:00:00.000Z',
              updatedAt: '2025-03-01T12:00:00.000Z',
            },
            {
              id: 'abc-uuid-2',
              userId: '550e8400-e29b-41d4-a716-446655440001',
              name: 'soundcloud',
              url: 'https://soundcloud.com/moaaz',
              createdAt: '2025-03-02T09:00:00.000Z',
              updatedAt: '2025-03-02T09:00:00.000Z',
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiAddExternalProfile() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Add an external profile link',
      description:
        'Adds a new external profile link for the authenticated user. The user may have at most 10 links. Both name and URL must be unique per user — duplicate names or URLs are rejected.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['name', 'url'],
        properties: {
          name: {
            type: 'string',
            maxLength: 50,
            example: 'instagram',
            description: 'Label for the link (e.g. "instagram", "twitter", "personal site")',
          },
          url: {
            type: 'string',
            format: 'uri',
            maxLength: 255,
            example: 'https://instagram.com/moaaz',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'External profile added successfully',
      schema: {
        example: {
          status: 'Success',
          message: 'External profile added successfully',
          data: {
            id: 'abc-uuid-1',
            userId: '550e8400-e29b-41d4-a716-446655440001',
            name: 'instagram',
            url: 'https://instagram.com/moaaz',
            createdAt: '2025-03-01T12:00:00.000Z',
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error or maximum links reached',
      content: {
        'application/json': {
          examples: {
            maxReached: {
              summary: 'Maximum of 10 links reached',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [
                  {
                    field: 'general',
                    message: 'You can only have a maximum of 10 external links.',
                  },
                ],
              },
            },
            invalidUrl: {
              summary: 'Invalid URL format',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'url', message: 'Must be a valid URL format' }],
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Duplicate name or URL',
      content: {
        'application/json': {
          examples: {
            duplicateName: {
              summary: 'Name already exists',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'name', message: 'You already have a link named instagram.' }],
              },
            },
            duplicateUrl: {
              summary: 'URL already saved',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'url', message: 'You already saved this exact URL.' }],
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiUpdateExternalProfile() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Edit an external profile link',
      description:
        "Updates the name and/or URL of one of the authenticated user's external profile links. Both fields are optional — only send what you want to change. Duplicate name or URL across the user's existing links is rejected.",
    }),
    ApiParam({
      name: 'id',
      description: 'UUID of the external profile link to update',
      example: 'abc-uuid-1',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            maxLength: 50,
            example: 'twitter',
          },
          url: {
            type: 'string',
            format: 'uri',
            maxLength: 255,
            example: 'https://twitter.com/moaaz',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'External profile updated successfully',
      schema: {
        example: {
          status: 'Success',
          message: 'External profile updated successfully',
          data: {
            id: 'abc-uuid-1',
            userId: '550e8400-e29b-41d4-a716-446655440001',
            name: 'twitter',
            url: 'https://twitter.com/moaaz',
            createdAt: '2025-03-01T12:00:00.000Z',
            updatedAt: '2025-03-10T09:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error',
      schema: {
        example: {
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'url', message: 'Must be a valid URL format' }],
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'External profile not found',
      schema: {
        example: {
          status: 'error',
          message: 'Resource not found',
          errors: [{ field: 'profileId', message: 'External profile not found.' }],
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Duplicate name or URL',
      content: {
        'application/json': {
          examples: {
            duplicateName: {
              summary: 'Name already exists',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'name', message: 'You already have a link named twitter.' }],
              },
            },
            duplicateUrl: {
              summary: 'URL already saved',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'url', message: 'You already saved this exact URL.' }],
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiDeleteExternalProfile() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove an external profile link',
      description: "Permanently deletes one of the authenticated user's external profile links.",
    }),
    ApiParam({
      name: 'id',
      description: 'UUID of the external profile link to delete',
      example: 'abc-uuid-1',
    }),
    ApiResponse({
      status: 200,
      description: 'External profile deleted successfully',
      schema: {
        example: {
          status: 'Success',
          message: 'External profile deleted successfully',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' }),
    ApiResponse({ status: 404, description: 'External profile not found' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiCheckUsername() {
  return applyDecorators(
    ApiOperation({
      summary: 'Check username availability',
      description:
        'Checks whether a given username is available for use. Uses a Bloom filter for fast negative lookups with a DB fallback on false positives. Case-insensitive. Must start with a letter, 3–50 characters, letters/numbers/underscores only, no consecutive underscores.',
    }),
    ApiQuery({
      name: 'username',
      description: 'The username to check',
      example: 'moaaz_dev',
    }),
    ApiResponse({
      status: 200,
      description: 'Username availability result',
      content: {
        'application/json': {
          examples: {
            available: {
              summary: 'Username is available',
              value: {
                status: 'success',
                data: {
                  username: 'moaaz_dev',
                  available: true,
                  message: 'Username is available',
                },
              },
            },
            taken: {
              summary: 'Username is already taken',
              value: {
                status: 'success',
                data: {
                  username: 'moaaz_dev',
                  available: false,
                  message: 'Username is already taken',
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Missing or invalid username query parameter',
      content: {
        'application/json': {
          examples: {
            empty: {
              summary: 'Username not provided',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [{ field: 'username', message: 'Username parameter is required' }],
              },
            },
            invalidFormat: {
              summary: 'Invalid format',
              value: {
                status: 'error',
                message: 'Validation failed',
                errors: [
                  {
                    field: 'username',
                    message:
                      'Username must start with a letter and can only contain letters, numbers, and underscores',
                  },
                ],
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
