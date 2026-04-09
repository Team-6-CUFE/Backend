import { Injectable, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isAllowedRedirectUri } from './oauth.constants';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const redirectUri = request.query?.redirect_uri as string | undefined;

    if (redirectUri) {
      if (!isAllowedRedirectUri(redirectUri)) {
        throw new BadRequestException('Invalid redirect_uri');
      }
      request.session.oauthRedirectUri = redirectUri;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
