import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { ExternalProfile } from './entities/external-profile.entity';
import { SocialAccount } from './entities/social-account.entity';
import { FavoriteGenre } from './entities/favorite-genre.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserEmail, ExternalProfile, SocialAccount, FavoriteGenre]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
