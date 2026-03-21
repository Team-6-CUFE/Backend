import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiCookieAuth, ApiParam } from '@nestjs/swagger';

// ─── Register ─────────────────────────────────────────────────────────────────

export function ApiRegister() {
  return applyDecorators(
    ApiOperation({
      summary: 'Register a new user',
      description:
        'Creates a new user account with email and password. Sends a verification email to the provided address. Username is auto-generated with a suffix if already taken.',
    }),
    ApiResponse({
      status: 201,
      description: 'User registered successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Registration successful. Please check your email to verify your account.',
          data: {
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'yara@example.com',
            username: 'yara_senousy',
            email_verified: false,
            verification_email_sent: true,
            created_at: '2025-03-20T10:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error, invalid captcha, or email already registered',
      content: {
        'application/json': {
          examples: {
            captchaFailed: {
              summary: 'Invalid captcha',
              value: {
                statusCode: 400,
                message: 'Captcha verification failed. Please try again.',
              },
            },
            emailExists: {
              summary: 'Email already registered',
              value: {
                statusCode: 400,
                message: 'Email yara@example.com is already registered.',
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 429, description: 'Rate limit exceeded' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function ApiLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'Login with email or username',
      description:
        'Authenticates a user with email or username and password. On success, sets httpOnly `access_token` and `refresh_token` cookies.',
    }),
    ApiResponse({
      status: 200,
      description: 'Login successful',
      schema: {
        example: {
          status: 'success',
          message: 'Login successful',
          data: {
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'yara@example.com',
            username: 'yara_senousy',
            display_name: 'Yara Senousy',
            avatar_url: 'https://s3.amazonaws.com/avatars/user_123.jpg',
            role: 'listener',
            plan: 'free',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid credentials',
      schema: {
        example: {
          statusCode: 401,
          message: 'Invalid identifier or password',
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Email not verified or account suspended',
      content: {
        'application/json': {
          examples: {
            unverified: {
              summary: 'Email not verified',
              value: {
                statusCode: 403,
                message: 'Please verify your email address before logging in',
                email_verified: false,
                email: 'yara@example.com',
              },
            },
            noEmail: {
              summary: 'Account has no email',
              value: {
                statusCode: 403,
                message: 'This account has no email.',
              },
            },
            suspended: {
              summary: 'Account suspended',
              value: {
                statusCode: 403,
                message: 'Your account has been suspended. Please contact support.',
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 429, description: 'Too many failed login attempts' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export function ApiLogout() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Logout',
      description:
        'Logs out the user by revoking the refresh token and clearing both httpOnly cookies.',
    }),
    ApiResponse({
      status: 200,
      description: 'Logged out successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Logged out successfully',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export function ApiRefreshToken() {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Generates a new access token and refresh token using the refresh_token cookie. The old refresh token is revoked (rotation). Sets new httpOnly cookies.',
    }),
    ApiResponse({
      status: 200,
      description: 'Token refreshed successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Token refreshed successfully',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid or expired refresh token',
      content: {
        'application/json': {
          examples: {
            revoked: {
              summary: 'Token revoked or not found',
              value: {
                statusCode: 401,
                message: 'Refresh token is invalid or has been revoked',
              },
            },
            expired: {
              summary: 'Token expired',
              value: {
                statusCode: 401,
                message: 'Refresh token has expired',
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export function ApiVerifyEmail() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify email address',
      description:
        'Activates the user account by verifying the email address using the token sent via email after registration.',
    }),
    ApiParam({
      name: 'token',
      description: 'Email verification token from the verification email',
      example: 'a1e4ae8b90f6cd13291249...',
    }),
    ApiResponse({
      status: 200,
      description: 'Email verified successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Email verified successfully.',
          data: {
            email_verified: true,
            verified_at: '2025-03-20T10:30:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid or expired token',
      content: {
        'application/json': {
          examples: {
            invalid: {
              summary: 'Invalid token',
              value: {
                statusCode: 400,
                message: 'Invalid or expired verification token',
              },
            },
            alreadyVerified: {
              summary: 'Already verified',
              value: {
                statusCode: 400,
                message: 'Email is already verified',
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Resend Verification ──────────────────────────────────────────────────────

export function ApiResendVerification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Resend email verification link',
      description:
        'Sends a new verification email if the previous one expired or was not received. Rate limited to 3 emails per hour.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            example: 'yara@example.com',
            description: 'Email address to resend verification to',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Verification email sent',
      schema: {
        example: {
          status: 'success',
          message: 'Verification email resent. Please check your email.',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Email not found or already verified',
      content: {
        'application/json': {
          examples: {
            notFound: {
              summary: 'Email not found',
              value: {
                statusCode: 400,
                message: 'Email yara@example.com is not found.',
              },
            },
            alreadyVerified: {
              summary: 'Already verified',
              value: {
                statusCode: 400,
                message: 'Email yara@example.com is already verified.',
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 429,
      description: 'Rate limit exceeded',
      schema: {
        example: {
          statusCode: 429,
          message: 'Too many verification emails sent. Please try again in 5 minutes.',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Delete Account ───────────────────────────────────────────────────────────

export function ApiDeleteAccount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Delete account',
      description:
        'Permanently deletes the authenticated user account, revokes all refresh tokens, and clears cookies. This action is irreversible.',
    }),
    ApiResponse({
      status: 200,
      description: 'Account deleted successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Your account has been deleted successfully.',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Get Emails ───────────────────────────────────────────────────────────────

export function ApiGetEmails() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get all emails',
      description:
        'Returns all email addresses linked to the authenticated user account with their verification and primary status.',
    }),
    ApiResponse({
      status: 200,
      description: 'Emails retrieved successfully',
      schema: {
        example: {
          status: 'success',
          emails: [
            {
              email: 'yara@example.com',
              is_primary: true,
              is_verified: true,
              created_at: '2025-03-19T11:12:20.662Z',
              updated_at: '2025-03-19T11:56:13.786Z',
            },
            {
              email: 'yara.work@company.com',
              is_primary: false,
              is_verified: false,
              created_at: '2025-03-20T12:04:41.375Z',
              updated_at: '2025-03-20T12:04:41.375Z',
            },
          ],
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: {
        example: { statusCode: 404, message: 'User not found' },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Add Email ────────────────────────────────────────────────────────────────

export function ApiAddEmail() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Add a new email address',
      description:
        'Adds a new email address to the account. Sends a verification email to the new address and a notification to the primary email.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            example: 'yara.work@company.com',
            description: 'New email address to add',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Email added successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Email added successfully. Please check your inbox to verify.',
          data: {
            email: 'yara.work@company.com',
            is_primary: false,
            is_verified: false,
            verification_sent: true,
            notification_sent_to_primary: false,
            created_at: '2025-03-20T12:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Email already associated with an account',
      schema: {
        example: {
          statusCode: 400,
          message: 'Email yara.work@company.com is already associated with an account',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: {
        example: { statusCode: 404, message: 'User not found' },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Remove Email ─────────────────────────────────────────────────────────────

export function ApiRemoveEmail() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Remove an email address',
      description:
        'Removes a secondary email address from the account. Cannot remove the primary email or the only remaining email.',
    }),
    ApiParam({
      name: 'email',
      description: 'Email address to remove',
      example: 'yara.work@company.com',
    }),
    ApiResponse({
      status: 200,
      description: 'Email removed successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Email removed successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Cannot remove email',
      content: {
        'application/json': {
          examples: {
            onlyEmail: {
              summary: 'Only email on account',
              value: {
                statusCode: 400,
                message: 'Cannot delete your only email address',
              },
            },
            primaryEmail: {
              summary: 'Cannot delete primary email',
              value: {
                statusCode: 400,
                message: 'Cannot delete primary email. Please set another email as primary first.',
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'Email not found',
      schema: {
        example: { statusCode: 404, message: 'Email not found' },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Set Primary Email ────────────────────────────────────────────────────────

export function ApiSetPrimaryEmail() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Initiate primary email change',
      description:
        'Sends a 6-digit verification code to the current primary email to confirm the change. Call this endpoint again with the same email to resend the code.',
    }),
    ApiParam({
      name: 'email',
      description: 'Email address to set as primary',
      example: 'yara.work@company.com',
    }),
    ApiResponse({
      status: 201,
      description: 'Verification code sent to current primary email',
      schema: {
        example: {
          status: 'success',
          message:
            'Verification code sent to your current primary email. Please verify to complete the change.',
          data: {
            verification_required: true,
            code_sent_to: 'yara@example.com',
            new_primary_email: 'yara.work@company.com',
            expires_in: 600,
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation error',
      content: {
        'application/json': {
          examples: {
            alreadyPrimary: {
              summary: 'Email is already primary',
              value: {
                statusCode: 400,
                message: 'This email is already the primary email',
              },
            },
            notVerified: {
              summary: 'Email not verified',
              value: {
                statusCode: 400,
                message: 'Cannot set unverified email as primary. Please verify the email first.',
              },
            },
            noPrimary: {
              summary: 'No current primary email found',
              value: {
                statusCode: 400,
                message: 'Current primary email not found',
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'Email not found',
      schema: {
        example: { statusCode: 404, message: 'Email not found' },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Verify Primary Email Change ──────────────────────────────────────────────

export function ApiVerifyPrimaryEmailChange() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Verify primary email change',
      description:
        'Completes the primary email change by verifying the 6-digit code sent to the old primary email.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['code'],
        properties: {
          code: {
            type: 'string',
            example: '482910',
            description: '6-digit verification code sent to the current primary email',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Primary email changed successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Primary email changed successfully',
          data: {
            new_primary: 'yara.work@company.com',
            changed_at: 1742478000000,
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid or expired verification code',
      schema: {
        example: {
          statusCode: 400,
          message: 'Invalid or expired verification code',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Change Password Request ──────────────────────────────────────────────────

export function ApiChangePasswordRequest() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Request password change email',
      description:
        "Sends a password reset link to the authenticated user's verified primary email address.",
    }),
    ApiResponse({
      status: 200,
      description: 'Password reset email sent',
      schema: {
        example: {
          status: 'success',
          message: 'Password reset link sent to your primary email address yara@example.com',
          data: {
            email_sent: true,
            sent_to: 'yara@example.com',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'No verified primary email found',
      schema: {
        example: {
          statusCode: 400,
          message: 'No verified primary email found. Please verify your email address first.',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export function ApiResetPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reset password using token from email',
      description:
        'Resets the user password using the token from the password reset email. Revokes all existing refresh tokens after a successful reset.',
    }),
    ApiResponse({
      status: 200,
      description: 'Password reset successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Password has been changed successfully. Please log in with your new password.',
          data: {
            password_changed: true,
            reset_at: '2025-03-20T13:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid token or same password',
      content: {
        'application/json': {
          examples: {
            invalidToken: {
              summary: 'Invalid or expired token',
              value: {
                statusCode: 400,
                message: 'Invalid or expired password reset token.',
              },
            },
            samePassword: {
              summary: 'New password same as current',
              value: {
                statusCode: 400,
                message: 'New password must be different from current password.',
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export function ApiForgotPassword() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request password reset for unauthenticated user',
      description:
        'Sends a password reset link to the provided email if a verified account exists with that address.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            example: 'yara@example.com',
            description: 'Email address of the account',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Password reset email sent',
      schema: {
        example: {
          status: 'success',
          message: 'Password reset link sent to your email address yara@example.com',
          data: {
            email_sent: true,
            sent_to: 'yara@example.com',
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'No verified account found with that email',
      schema: {
        example: {
          statusCode: 404,
          message: 'No verified account found with email yara@example.com.',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export function ApiGoogleLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'Initiate Google OAuth login',
      description:
        "Redirects to Google's OAuth consent screen. Browser-only — cannot be called directly from Postman.",
    }),
    ApiResponse({ status: 302, description: 'Redirect to Google OAuth consent screen' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiGoogleCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'Google OAuth callback',
      description:
        'Handles the OAuth callback from Google. Returns `type: login` for existing users or `type: registration_incomplete` for new users who need to complete their profile.',
    }),
    ApiResponse({
      status: 200,
      description: 'OAuth handled successfully',
      content: {
        'application/json': {
          examples: {
            login: {
              summary: 'Returning or linked user — sets cookies and returns user data',
              value: {
                status: 'success',
                type: 'login',
                data: {
                  user_id: '550e8400-e29b-41d4-a716-446655440001',
                  email: 'yara@gmail.com',
                  username: 'yara_senousy',
                  display_name: 'Yara Senousy',
                  avatar_url: 'https://lh3.googleusercontent.com/photo.jpg',
                  role: 'listener',
                  plan: 'free',
                },
              },
            },
            registrationIncomplete: {
              summary: 'New user — redirect to complete profile screen',
              value: {
                status: 'success',
                type: 'registration_incomplete',
                data: {
                  pending_token: 'a1e4ae8b90f6cd13291249...',
                  prefill: {
                    display_name: 'Yara Senousy',
                    email: 'yara@gmail.com',
                  },
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found for linked social account',
      schema: {
        example: {
          statusCode: 404,
          message: 'User not found for the social account.',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Facebook OAuth ───────────────────────────────────────────────────────────

export function ApiFacebookLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'Initiate Facebook OAuth login',
      description:
        "Redirects to Facebook's OAuth dialog. Browser-only — cannot be called directly from Postman.",
    }),
    ApiResponse({ status: 302, description: 'Redirect to Facebook OAuth dialog' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

export function ApiFacebookCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'Facebook OAuth callback',
      description:
        'Handles the OAuth callback from Facebook. Returns the same response shape as the Google callback.',
    }),
    ApiResponse({
      status: 200,
      description: 'OAuth handled successfully',
      content: {
        'application/json': {
          examples: {
            login: {
              summary: 'Returning or linked user',
              value: {
                status: 'success',
                type: 'login',
                data: {
                  user_id: '550e8400-e29b-41d4-a716-446655440001',
                  email: 'yara@example.com',
                  username: 'yara_senousy',
                  display_name: 'Yara Senousy',
                  avatar_url: 'https://graph.facebook.com/photo.jpg',
                  role: 'listener',
                  plan: 'free',
                },
              },
            },
            registrationIncomplete: {
              summary: 'New user — redirect to complete profile screen',
              value: {
                status: 'success',
                type: 'registration_incomplete',
                data: {
                  pending_token: 'a1e4ae8b90f6cd13291249...',
                  prefill: {
                    display_name: 'Yara Senousy',
                    email: 'yara@facebook.com',
                  },
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'User not found for linked social account',
      schema: {
        example: {
          statusCode: 404,
          message: 'User not found for the social account.',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}

// ─── Complete OAuth Profile ───────────────────────────────────────────────────
export function ApiCompleteOAuth() {
  return applyDecorators(
    ApiOperation({
      summary: 'Complete OAuth registration',
      description:
        'Called after receiving `registration_incomplete` from the OAuth callback. Submits the pending token along with missing profile fields. The pending token is single-use and expires after 10 minutes.',
    }),
    ApiResponse({
      status: 201,
      description: 'Profile completed and user logged in',
      schema: {
        example: {
          status: 'success',
          message: 'Profile completed and logged in successfully',
          data: {
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'yara@gmail.com',
            username: 'yara_senousy',
            display_name: 'Yara Senousy',
            avatar_url: 'https://lh3.googleusercontent.com/photo.jpg',
            role: 'listener',
            plan: 'free',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Pending token expired',
      schema: {
        example: {
          statusCode: 400,
          message: 'Pending token has expired',
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Pending token not found or already used',
      schema: {
        example: {
          statusCode: 404,
          message: 'Invalid or expired pending token',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
export function ApiUnlinkSocialAccount() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Unlink a social account',
      description:
        'Removes the link between a social account (Google/Facebook) and the authenticated user. The user must have a password set before unlinking to avoid being locked out.',
    }),
    ApiParam({
      name: 'provider',
      description: 'Social provider to unlink',
      example: 'google',
      enum: ['google', 'facebook'],
    }),
    ApiParam({
      name: 'providerId',
      description: 'The provider-specific user ID',
      example: '109801234567890123456',
    }),
    ApiResponse({
      status: 200,
      description: 'Social account unlinked successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Google account unlinked successfully',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Cannot unlink — no password set',
      schema: {
        example: {
          statusCode: 400,
          message: 'Cannot unlink social account. Please set a password first.',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'Social account not linked',
      schema: {
        example: {
          statusCode: 404,
          message: 'Social account not linked',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
export function ApiGetSocialAccounts() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Get linked social accounts',
      description:
        'Returns all social accounts (Google, Facebook) linked to the authenticated user.',
    }),
    ApiResponse({
      status: 200,
      description: 'Social accounts retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: {
            social_accounts: [
              {
                provider: 'google',
                provider_id: '109801234567890123456',
                provider_email: 'yara@gmail.com',
                linked_at: '2025-03-20T13:00:00.000Z',
              },
              {
                provider: 'facebook',
                provider_id: '123456789012345',
                provider_email: 'yara@facebook.com',
                linked_at: '2025-03-21T09:00:00.000Z',
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'No social accounts linked',
      schema: {
        example: {
          status: 'success',
          data: {
            social_accounts: [],
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          statusCode: 404,
          message: 'User not found',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
export function ApiGoogleLink() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Initiate Google account linking',
      description:
        'Redirects the authenticated user to Google OAuth consent screen to link their Google account. Browser-only — cannot be called directly from Postman.',
    }),
    ApiResponse({ status: 302, description: 'Redirect to Google OAuth consent screen' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
export function ApiGoogleLinkCallback() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Google account link callback',
      description:
        'Handles the OAuth callback from Google after the user approves linking. Links the Google account to the authenticated user.',
    }),
    ApiResponse({
      status: 200,
      description: 'Google account linked successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Google account linked successfully',
          data: {
            provider: 'google',
            provider_email: 'yara@gmail.com',
            linked_at: '2025-03-20T13:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Google account already linked to another user',
      schema: {
        example: {
          statusCode: 400,
          message: 'This Google account is already linked to another user',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 409,
      description: 'Provider already linked to this account',
      schema: {
        example: {
          statusCode: 409,
          message: 'You already have a Google account linked',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
export function ApiFacebookLink() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Initiate Facebook account linking',
      description:
        'Redirects the authenticated user to Facebook OAuth dialog to link their Facebook account. Browser-only — cannot be called directly from Postman.',
    }),
    ApiResponse({ status: 302, description: 'Redirect to Facebook OAuth dialog' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
export function ApiFacebookLinkCallback() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'Facebook account link callback',
      description:
        'Handles the OAuth callback from Facebook after the user approves linking. Links the Facebook account to the authenticated user.',
    }),
    ApiResponse({
      status: 200,
      description: 'Facebook account linked successfully',
      schema: {
        example: {
          status: 'success',
          message: 'Facebook account linked successfully',
          data: {
            provider: 'facebook',
            provider_email: 'yara@facebook.com',
            linked_at: '2025-03-20T13:00:00.000Z',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Facebook account already linked to another user',
      schema: {
        example: {
          statusCode: 400,
          message: 'This Facebook account is already linked to another user',
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 409,
      description: 'Provider already linked to this account',
      schema: {
        example: {
          statusCode: 409,
          message: 'You already have a Facebook account linked',
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Unexpected server error' })
  );
}
