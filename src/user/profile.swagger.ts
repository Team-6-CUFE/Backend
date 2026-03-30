import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

export function ApiGetMyProfile() {
  return applyDecorators(
    ApiBearerAuth(),
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
    ApiBearerAuth(),
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
    ApiBearerAuth(),
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
    ApiBearerAuth(),
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
    ApiBearerAuth(),
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
          message: 'Privacy updated successfully',
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
