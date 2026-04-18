import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

export const OptionalCurrentUser = createParamDecorator(
  (key: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;

    if (user) return key ? user[key] : user;

    // Public route — guard didn't run, manually decode cookie
    const token = request?.cookies?.access_token;
    if (!token) return undefined;

    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      ) as JwtPayload;
      return key ? payload[key] : payload;
    } catch {
      return undefined;
    }
  }
);
