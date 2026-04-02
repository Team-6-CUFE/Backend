import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { getDatabaseConfig } from './config/database.config';
import { getMailConfig } from './config/mail.config';
import { UserModule } from './user/user.module';
import { GenreModule } from './genre/genre.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { MailModule } from './mail/mail.module';
import { FollowersModule } from './followers/followers.module';
import { RedisModule } from './redis/redis.module';
import { AudioStorageModule } from './audio/audio_storage.module';
import { PlaylistModule } from './playlist/playlist.module';
import { TrackModule } from './track/track.module';
import { LegalModule } from './legal/legal.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    RedisModule,

    // Database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // Email configuration
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getMailConfig,
      inject: [ConfigService],
    }),

    // Feature modules
    UserModule,

    GenreModule,

    AuthenticationModule,

    MailModule,

    FollowersModule,

    AudioStorageModule,

    PlaylistModule,

    TrackModule,

    LegalModule,
  ],
})
export class AppModule {}
