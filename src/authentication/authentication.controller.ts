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
import { ApiTags } from '@nestjs/swagger';
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
import {
  ApiDeleteAccount,
  ApiRegister,
  ApiLogin,
  ApiLogout,
  ApiRefreshToken,
  ApiVerifyEmail,
  ApiResendVerification,
  ApiGetEmails,
  ApiAddEmail,
  ApiRemoveEmail,
  ApiSetPrimaryEmail,
  ApiVerifyPrimaryEmailChange,
  ApiChangePasswordRequest,
  ApiResetPassword,
  ApiForgotPassword,
  ApiGoogleLogin,
  ApiGoogleCallback,
  ApiFacebookLogin,
  ApiFacebookCallback,
  ApiCompleteOAuth,
  ApiUnlinkSocialAccount,
  ApiGetSocialAccounts,
  ApiGoogleLink,
  ApiGoogleLinkCallback,
  ApiFacebookLink,
  ApiFacebookLinkCallback,
} from './authentication.swagger';
import { GoogleLinkGuard } from './guards/google-link.guard';
import { FacebookLinkGuard } from './guards/facebook-link.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @ApiDeleteAccount()
  @Delete('account')
  remove(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authenticationService.removeUser(userId, response, refreshToken);
  }

  @ApiRegister()
  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    return this.authenticationService.register(registerDto, ip);
  }

  @ApiLogin()
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.authenticationService.login(loginDto, response);
  }

  @ApiLogout()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authenticationService.logout(response, refreshToken);
  }

  @ApiRefreshToken()
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

  @ApiVerifyEmail()
  @Public()
  @Get('verify-email/:token')
  verifyemail(@Param('token') token: string) {
    return this.authenticationService.verifyEmail(token);
  }

  @ApiResendVerification()
  @Public()
  @Post('resend-verification')
  resendVerificationEmail(@Body('email') email: string) {
    return this.authenticationService.resendVerificationEmail(email);
  }

  @ApiVerifyPrimaryEmailChange()
  @Post('/emails/verify-primary-change')
  verifyPrimaryEmailChange(@CurrentUser('sub') userId: string, @Body('code') code: string) {
    return this.authenticationService.verifyPrimaryEmailChange(userId, code);
  }

  @ApiSetPrimaryEmail()
  @Post('emails/:email/set-primary')
  setPrimaryEmail(@CurrentUser('sub') userId: string, @Param('email') email: string) {
    return this.authenticationService.setPrimaryEmail(userId, email);
  }

  @ApiAddEmail()
  @Post('emails')
  addEmail(@CurrentUser('sub') userId: string, @Body() emailDto: EmailDto) {
    return this.authenticationService.addEmail(userId, emailDto.email);
  }

  @ApiRemoveEmail()
  @Delete('emails/:email')
  removeEmail(@CurrentUser('sub') userId: string, @Param('email') email: string) {
    return this.authenticationService.removeEmail(userId, email);
  }

  @ApiGetEmails()
  @Get('emails')
  getEmails(@CurrentUser('sub') userId: string) {
    return this.authenticationService.getEmails(userId);
  }

  @ApiChangePasswordRequest()
  @Post('change-password-request')
  @HttpCode(HttpStatus.OK)
  changePasswordRequest(@CurrentUser('sub') userId: string) {
    return this.authenticationService.changePasswordRequest(userId);
  }

  @ApiResetPassword()
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authenticationService.changePassword(
      changePasswordDto.token,
      changePasswordDto.newPassword
    );
  }

  @ApiForgotPassword()
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authenticationService.forgotPassword(email);
  }

  @ApiCompleteOAuth()
  @Public()
  @Post('oauth/complete')
  completeOAuth(
    @Body() oauthData: CompleteOAuthProfileDto,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request
  ) {
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    return this.authenticationService.completeOAuthProfile(oauthData, response, ip);
  }

  @ApiGoogleLogin()
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    // NestJS/Passport handles the redirect — this method body never executes
  }

  @ApiGoogleCallback()
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @CurrentUser() googleUser: OAuthProfile,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authenticationService.handleOAuthCallback(googleUser, response);
  }

  @ApiFacebookLogin()
  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  facebookLogin() {
    // Passport handles the redirect — body never executes
  }

  @ApiFacebookCallback()
  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/callback')
  async facebookCallback(
    @CurrentUser() facebookUser: OAuthProfile,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authenticationService.handleOAuthCallback(facebookUser, response);
  }

  @ApiGoogleLink()
  @UseGuards(GoogleLinkGuard)
  @Get('google/link')
  googleLink() {}

  @ApiGoogleLinkCallback()
  @UseGuards(GoogleLinkGuard)
  @Get('google/link/callback')
  async googleLinkCallback(@CurrentUser() profile: OAuthProfile & { userId: string }) {
    return this.authenticationService.linkSocialAccount(profile.userId, profile);
  }

  @ApiFacebookLink()
  @UseGuards(FacebookLinkGuard)
  @Get('facebook/link')
  facebookLink() {}

  @ApiFacebookLinkCallback()
  @UseGuards(FacebookLinkGuard)
  @Get('facebook/link/callback')
  async facebookLinkCallback(@CurrentUser() profile: OAuthProfile & { userId: string }) {
    return this.authenticationService.linkSocialAccount(profile.userId, profile);
  }

  @ApiUnlinkSocialAccount()
  @Delete('unlink-social/:provider/:providerId')
  unlinkSocialAccount(
    @CurrentUser('sub') userId: string,
    @Param('provider') provider: string,
    @Param('providerId') providerId: string
  ) {
    return this.authenticationService.unlinkSocialAccount(userId, provider, providerId);
  }

  @ApiGetSocialAccounts()
  @Get('social-accounts')
  getSocialAccounts(@CurrentUser('sub') userId: string) {
    return this.authenticationService.getSocialAccounts(userId);
  }
}
