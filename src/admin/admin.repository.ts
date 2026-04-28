import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findAllUsers(limit: number, offset: number, search?: string): Promise<[User[], number]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.emails', 'emailRecord');

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('user.username ILIKE :search', { search: `%${search}%` }).orWhere(
            'emailRecord.email ILIKE :search',
            { search: `%${search}%` }
          );
        })
      );
    }

    query.skip(offset).take(limit).orderBy('user.createdAt', 'DESC');

    return query.getManyAndCount();
  }

  async updateUserSuspensionStatus(
    userId: string,
    isSuspended: boolean,
    reason: string
  ): Promise<void> {
    await this.userRepository.update(userId, {
      isSuspended,
      suspensionReason: reason,
    });
  }
}
