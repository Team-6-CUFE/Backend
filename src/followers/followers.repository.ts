import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFollow } from './entities/user-follows.entity';
import { UserBlock } from './entities/user-blocks.entity';

@Injectable()
export class FollowersRepository {
  constructor(
    @InjectRepository(UserFollow)
    private followRepository: Repository<UserFollow>,
    @InjectRepository(UserBlock)
    private blockRepository: Repository<UserBlock>
  ) {}

  async hasBlockRelationship(userA: string, userB: string): Promise<boolean> {
    const block = await this.blockRepository.findOne({
      where: [
        { blocker: userA, blocked: userB },
        { blocker: userB, blocked: userA },
      ],
    });

    return block !== null;
  }
}
