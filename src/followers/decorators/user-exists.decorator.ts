// followers/decorators/check-user-exists.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserExistsGuard, USER_EXISTS_PARAMS_KEY } from '../guards/user-exists.guard';

/**
 * Checks that the users identified by the given route param names exist.
 * Throws 404 if any user is not found.
 * Attaches loaded users to request.resolvedUsers[paramName] for reuse downstream.
 *
 * Defaults to checking 'user_id' if no param names are passed.
 * Can only be used on JWT-protected routes (cannot combine with @Public).
 *
 * @example
 * @CheckUserExists()                            // checks :user_id
 * @CheckUserExists('user_id', 'other_user_id')  // checks both params
 */
export const CheckUserExists = (...paramNames: string[]) =>
  applyDecorators(
    SetMetadata(USER_EXISTS_PARAMS_KEY, paramNames.length ? paramNames : ['user_id']),
    UseGuards(UserExistsGuard)
  );
