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
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { CurrentUser } from './decorators/current-user.decorator';
import { CompleteOAuthProfileDto } from './dto/complete-oauth-profile.dto';

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

  @Public()
  @Post('oauth/complete')
  completeOAuth(
    @Body() oauthData: CompleteOAuthProfileDto,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authenticationService.completeOAuthProfile(oauthData, response);
  }
}
