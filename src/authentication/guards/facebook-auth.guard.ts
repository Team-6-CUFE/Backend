import { Injectable, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ALLOWED_MOBILE_SCHEMES } from './oauth.constants';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const redirectUri = request.query?.redirect_uri as string | undefined;

    if (redirectUri) {
      if (!ALLOWED_MOBILE_SCHEMES.some((scheme) => redirectUri.startsWith(scheme))) {
        throw new BadRequestException('Invalid redirect_uri');
      }
      request.session.oauthRedirectUri = redirectUri;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
