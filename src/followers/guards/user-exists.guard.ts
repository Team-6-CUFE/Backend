import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRepository } from '../../user/user.repository';

export const USER_EXISTS_PARAMS_KEY = 'userExistsParams';

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepository: UserRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramNames: string[] = this.reflector.get<string[]>(
      USER_EXISTS_PARAMS_KEY,
      context.getHandler()
    ) ?? ['user_id'];

    const request = context.switchToHttp().getRequest();

    const users = await Promise.all(
      paramNames.map((paramName) => {
        const userId: string = request.params[paramName];
        return this.userRepository.findById(userId).then((user) => ({ paramName, user }));
      })
    );

    request.resolvedUsers = {};

    users.forEach(({ paramName, user }) => {
      if (!user) throw new NotFoundException('User not found');
      request.resolvedUsers[paramName] = user;
    });

    return true;
  }
}
