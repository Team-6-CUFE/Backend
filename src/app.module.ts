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
import { TrackModule } from './track/track.module';

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

    TrackModule,
  ],
})
export class AppModule {}
