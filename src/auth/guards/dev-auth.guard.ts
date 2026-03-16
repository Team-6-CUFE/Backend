import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class DevAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // read user id from a custom header
    const userId = request.headers['x-user-id'];
    if (!userId) return false;
    // attach to req.user same shape as JwtAuthGuard would
    request.user = { user_id: userId, username: 'dev' };
    return true;
  }
}
