import { SetMetadata } from '@nestjs/common';

export type UserRole = 'listener' | 'artist' | 'admin';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to specific roles.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
