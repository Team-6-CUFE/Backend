import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookLinkGuard extends AuthGuard('facebook-link') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Store userId in session before redirect
    if (request.user?.sub) {
      request.session.linkUserId = request.user.sub;
    }

    request.options = {
      ...request.options,
      callbackURL: process.env.FACEBOOK_LINK_CALLBACK_URL,
    };

    return super.canActivate(context) as Promise<boolean>;
  }
}
