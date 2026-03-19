import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { UserBlock } from './entities/user-blocks.entity';
import { UserFollow } from './entities/user-follows.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserFollow, UserBlock]), UserModule],
  controllers: [FollowersController],
  providers: [FollowersService],
})
export class FollowersModule {}
