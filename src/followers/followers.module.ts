import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { UserBlock } from './entities/user-blocks.entity';
import { UserFollow } from './entities/user-follows.entity';
import { UserModule } from '../user/user.module';
import { FollowersRepository } from './followers.repository';
import { NoBlockGuard } from './guards/no-block.guard';
import { UserRepository } from '../user/user.repository';
import { UserExistsGuard } from './guards/user-exists.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserFollow, UserBlock]), UserModule],
  controllers: [FollowersController],
  providers: [FollowersService, FollowersRepository, NoBlockGuard, UserRepository, UserExistsGuard],
  exports: [FollowersRepository, NoBlockGuard],
})
export class FollowersModule {}
