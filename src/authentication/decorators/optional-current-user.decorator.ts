import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * Like @CurrentUser but never throws — returns undefined if no JWT is present.
 * Use on @Public routes where auth is optional but affects response shape.
 */
export const OptionalCurrentUser = createParamDecorator(
  (key: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;
    if (!user) return undefined;
    return key ? user?.[key] : user;
  }
);
