import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { ExternalProfile } from './entities/external-profile.entity';
import { SocialAccount } from './entities/social-account.entity';
import { FavoriteGenre } from './entities/favorite-genre.entity';
import { GenreModule } from '../genre/genre.module';
import { UsernameAvailabilityService } from './username-availability.service';
import { ExternalProfileRepository } from './external-profile.repository';
import { StorageService } from '../common/storage_service';
import { SettingsService } from '../settings/settings.service';
import { SettingsModule } from '../settings/settings.module';
import { RecentlyPlayed } from '../track/entities/recently-played.entity';
import { Playlist } from '../playlist/entities/playlist.entity';
import { TrackRepository } from './user_track.repository';
import { TrackPlay } from '../track/entities/track-play.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserEmail,
      ExternalProfile,
      SocialAccount,
      FavoriteGenre,
      RecentlyPlayed,
      Playlist,
      TrackPlay,
    ]),
    GenreModule,
    SettingsModule,
  ],
  controllers: [ProfileController],
  providers: [
    UserService,
    UserRepository,
    ProfileService,
    UsernameAvailabilityService,
    ExternalProfileRepository,
    StorageService,
    SettingsService,
    TrackRepository,
  ],
  exports: [UserService, UserRepository, ExternalProfileRepository],
})
export class UserModule {}
