import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { CurrentUser } from './decorators/current-user.decorator';
import { EmailDto } from './dto/email.dto';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { CompleteOAuthProfileDto } from './dto/complete-oauth-profile.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OAuthProfile } from './types/oauth-profile.type';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Delete('account')
  remove(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authenticationService.removeUser(userId, response, refreshToken);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authenticationService.register(registerDto);
  }

  @ApiOperation({
    summary: 'Login with email or username',
    description:
      'Authenticates a user with email or username and password. On success, sets httpOnly `access_token` and `refresh_token` cookies.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
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
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials or password',
      },
    },
  })
  @ApiResponse({
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
  })
  @ApiResponse({ status: 429, description: 'Too many failed login attempts' })
  @ApiResponse({ status: 500, description: 'Unexpected server error' })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.authenticationService.login(loginDto, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authenticationService.logout(response, refreshToken);
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  refresh(
    @CurrentUser() user: JwtPayload & { refreshToken: string },
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authenticationService.refreshTokens(
      user.sub,
      user.email,
      user.role,
      user.plan,
      user.refreshToken,
      response
    );
  }

  @Public()
  @Get('verify-email/:token')
  verifyemail(@Param('token') token: string) {
    console.log('Received verification token', token);
    return this.authenticationService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  resendVerificationEmail(@Body('email') email: string) {
    return this.authenticationService.resendVerificationEmail(email);
  }

  @Post('/emails/verify-primary-change')
  verifyPrimaryEmailChange(@CurrentUser('sub') userId: string, @Body('code') code: string) {
    return this.authenticationService.verifyPrimaryEmailChange(userId, code);
  }

  @Post('emails/:email/set-primary')
  setPrimaryEmail(@CurrentUser('sub') userId: string, @Param('email') email: string) {
    return this.authenticationService.setPrimaryEmail(userId, email);
  }

  @Post('emails')
  addEmail(@CurrentUser('sub') userId: string, @Body() emailDto: EmailDto) {
    return this.authenticationService.addEmail(userId, emailDto.email);
  }

  @Delete('emails/:email')
  removeEmail(@CurrentUser('sub') userId: string, @Param('email') email: string) {
    return this.authenticationService.removeEmail(userId, email);
  }

  @Get('emails')
  getEmails(@CurrentUser('sub') userId: string) {
    return this.authenticationService.getEmails(userId);
  }

  @Post('change-password-request')
  @HttpCode(HttpStatus.OK)
  changePasswordRequest(@CurrentUser('sub') userId: string) {
    return this.authenticationService.changePasswordRequest(userId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authenticationService.changePassword(
      changePasswordDto.token,
      changePasswordDto.newPassword
    );
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authenticationService.forgotPassword(email);
  }

  @Public()
  @Post('oauth/complete')
  completeOAuth(
    @Body() oauthData: CompleteOAuthProfileDto,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authenticationService.completeOAuthProfile(oauthData, response);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    // NestJS/Passport handles the redirect — this method body never executes
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @CurrentUser() googleUser: OAuthProfile,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authenticationService.handleOAuthCallback(googleUser, response);
  }

  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  facebookLogin() {
    // Passport handles the redirect — body never executes
  }

  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/callback')
  async facebookCallback(
    @CurrentUser() facebookUser: OAuthProfile,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authenticationService.handleOAuthCallback(facebookUser, response);
    // ↑ exact same method as Google — works for any provider!
  }
}
