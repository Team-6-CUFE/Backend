import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
  ApiBody,
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
    ApiOperation({
      summary: 'Update profile picture',
      description: "Updates the authenticated user's avatar/profile picture URL.",
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['avatarUrl'],
        properties: {
          avatarUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://cdn.example.com/avatars/moaaz.jpg',
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
            avatarUrl: 'https://cdn.example.com/avatars/moaaz.jpg',
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid or missing URL',
      schema: {
        example: {
          status: 'error',
          message: 'Invalid file',
          errors: [{ field: 'avatarUrl', message: 'File size exceeds 5MB limit' }],
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
    ApiOperation({
      summary: 'Update cover photo',
      description: "Updates the authenticated user's cover photo URL.",
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['coverPhoto'],
        properties: {
          coverPhoto: {
            type: 'string',
            format: 'uri',
            example: 'https://cdn.example.com/covers/moaaz.jpg',
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
            coverPhoto: 'https://cdn.example.com/covers/moaaz.jpg',
            updatedAt: '2025-03-01T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid or missing URL',
      schema: {
        example: {
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'coverPhoto', message: 'Please provide a valid URL' }],
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

export function ApiGetRecentlyPlayed() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get recently played',
      description: `Returns the authenticated user's 6 most recent artists and playlists they have listened to.
Items are sorted by most recently played first. When a user replays an artist or playlist, it bubbles to the top.
Each item is typed as either \`"artist"\` or \`"playlist"\` — only the matching detail field is populated, the other is absent.`,
    }),
    ApiResponse({
      status: 200,
      description: 'Recently played retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              type: 'artist',
              playedAt: '2026-04-07T00:30:00.000Z',
              artist: {
                userId: '550e8400-e29b-41d4-a716-446655440002',
                username: 'the_weeknd',
                displayName: 'The Weeknd',
                avatarUrl: 'https://cdn.example.com/avatars/the_weeknd.jpg',
                followersCount: 1500000,
              },
            },
            {
              type: 'playlist',
              playedAt: '2026-04-06T22:15:00.000Z',
              playlist: {
                playlistId: '550e8400-e29b-41d4-a716-446655440003',
                title: 'Lo-Fi Study Mix',
                coverImage: 'https://cdn.example.com/playlists/lofi-study.jpg',
                tracksCount: 18,
                owner: {
                  userId: '550e8400-e29b-41d4-a716-446655440005',
                  username: 'lo_fi_vibes',
                  displayName: 'Lo-Fi Vibes',
                },
              },
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiGetListeningHistory() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get paginated listening history',
      description: `Returns the authenticated user's complete track play history with pagination.
Each entry is a raw play event — the same track can appear multiple times if played more than once.
Sorted by most recently played first.`,
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
      description: 'Number of results per page (default: 10, max: 50)',
      type: 'number',
      example: 10,
    }),
    ApiResponse({
      status: 200,
      description: 'Listening history retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              track_play_id: '550e8400-e29b-41d4-a716-446655440001',
              playedAt: '2026-04-07T00:30:00.000Z',
              track: {
                trackId: '550e8400-e29b-41d4-a716-446655440010',
                title: 'Blinding Lights',
                coverImage: 'https://cdn.example.com/covers/blinding_lights.jpg',
                durationSeconds: 200,
                tags: ['pop', 'synthwave'],
                likesCount: 9400,
                repostsCount: 312,
                playCount: 84000,
                commentsCount: 57,
                owner: {
                  userId: '550e8400-e29b-41d4-a716-446655440002',
                  username: 'the_weeknd',
                  displayName: 'The Weeknd',
                },
              },
            },
            {
              track_play_id: '052c8363-22a3-46fa-b7de-94a78c9d5880',
              playedAt: '2026-04-06T23:11:14.957Z',
              track: {
                trackId: '1808095e-5e71-4eae-95df-30a7fc16c9d7',
                title: 'Sweet Georgia Brown',
                coverImage: 'https://picsum.photos/seed/TisV9QlJ/500/500',
                durationSeconds: 460,
                tags: ['meow', 'mahmoud', 'cats'],
                likesCount: 21,
                repostsCount: 8,
                playCount: 70888,
                commentsCount: 9,
                owner: {
                  userId: 'e21ce4d0-600e-4d77-9f1d-bdbcf641b72e',
                  username: 'artist1',
                  displayName: 'John Doe',
                },
              },
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 5,
            totalCount: 47,
            limit: 10,
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiDeleteListeningHistory() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Clear listening history',
      description: `Permanently deletes all of the authenticated user's track play records and their entire recently played list.
This action is irreversible — all play events and the 6-slot recently played cache are wiped in one operation.`,
    }),
    ApiResponse({
      status: 200,
      description: 'History cleared successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Listening history and Recently Played cleared successfully',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
