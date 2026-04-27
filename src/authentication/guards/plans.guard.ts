import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload, UserPlan } from '../strategies/jwt.strategy';
import { PLANS_KEY } from '../decorators/plans.decorator';

/**
 * Plans guard — checks the authenticated user's plan against @Plans() metadata.
 */
@Injectable()
export class PlansGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlans = this.reflector.getAllAndOverride<UserPlan[]>(PLANS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Plans() decorator — route is accessible to any authenticated user
    if (!requiredPlans || requiredPlans.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user }: { user: JwtPayload } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasPlan = requiredPlans.includes(user.plan);

    if (!hasPlan) {
      throw new ForbiddenException(`Access denied. Required plan(s): ${requiredPlans.join(', ')}`);
    }

    return true;
  }
}
