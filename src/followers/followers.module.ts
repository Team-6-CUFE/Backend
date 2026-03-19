import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { UserBlock } from './entities/user-blocks.entity';
import { UserFollow } from './entities/user-follows.entity';
import { UserModule } from '../user/user.module';
import { FollowersRepository } from './followers.repository';
import { NoBlockGuard } from './guards/no-block.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserFollow, UserBlock]), UserModule],
  controllers: [FollowersController],
  providers: [FollowersService, FollowersRepository],
  exports: [FollowersRepository, NoBlockGuard],
})
export class FollowersModule {}
