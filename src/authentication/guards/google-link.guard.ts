import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { isAllowedRedirectUri } from './oauth.constants';

@Injectable()
export class GoogleLinkGuard extends AuthGuard('google-link') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Only validate identity on the initiation request, not the OAuth callback.
    // The callback is identified by the presence of a `code` query param from Google.
    const isCallback = !!request.query?.code;
    if (!isCallback) {
      await this.validateAndStoreUserId(request);

      const redirectUri = request.query?.redirect_uri as string | undefined;
      if (redirectUri) {
        if (!isAllowedRedirectUri(redirectUri)) {
          throw new BadRequestException('Invalid redirect_uri');
        }
        request.session.oauthLinkRedirectUri = redirectUri;
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  private async validateAndStoreUserId(request: any): Promise<void> {
    const secret = this.configService.get<string>('JWT_SECRET');

    // Mobile path: a short-lived link token was issued by GET /auth/oauth/link-token
    const linkToken = request.query?.link_token as string | undefined;
    if (linkToken) {
      try {
        const payload = this.jwtService.verify<{ sub: string; type: string }>(linkToken, {
          secret,
        });
        if (payload.type !== 'oauth-link') throw new Error('wrong type');
        request.session.linkUserId = payload.sub;
      } catch {
        throw new UnauthorizedException('Invalid or expired link token');
      }
      return;
    }

    // Web path: the logged-in browser sends the access_token cookie automatically
    const accessToken = request.cookies?.access_token as string | undefined;
    if (!accessToken) {
      throw new UnauthorizedException('Authentication required to link a social account');
    }
    try {
      const payload = this.jwtService.verify<{ sub: string }>(accessToken, { secret });
      request.session.linkUserId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
