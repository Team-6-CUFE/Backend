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
import { AudioProcessorModule } from './audio/audio-processor.module';
import { PlaylistModule } from './playlist/playlist.module';
import { TrackModule } from './track/track.module';
import { LegalModule } from './legal/legal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    RedisModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getMailConfig,
      inject: [ConfigService],
    }),

    UserModule,
    GenreModule,
    AuthenticationModule,
    MailModule,
    FollowersModule,
    AudioProcessorModule,
    PlaylistModule,
    TrackModule,
    LegalModule,
  ],
})
export class AppModule {}
