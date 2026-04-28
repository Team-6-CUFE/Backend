import { SetMetadata } from '@nestjs/common';
import { UserPlan } from '../strategies/jwt.strategy';

export const PLANS_KEY = 'plans';

/**
 * Restrict a route to specific plans.
 */
export const Plans = (...plans: UserPlan[]) => SetMetadata(PLANS_KEY, plans);
