// followers/guards/no-block.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FollowersRepository } from '../followers.repository';

@Injectable()
export class NoBlockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly followersRepository: FollowersRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const currentUserId: string = request.user.sub;
    const targetUserId: string = request.params.user_id;

    if (currentUserId === targetUserId) return true;

    const blocked = await this.followersRepository.hasBlockRelationship(
      currentUserId,
      targetUserId
    );

    if (blocked) throw new ForbiddenException('Action not allowed due to a block relationship');

    return true;
  }
}
