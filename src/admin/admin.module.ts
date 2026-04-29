import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ReportController } from './report.controller';
import { Report } from './entities/report.entity';
import { TrackModule } from '../track/track.module';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { Track } from '../track/entities/track.entity';
import { AdminRepository } from './admin.repository';
import { RecentlyPlayed } from '../track/entities/recently-played.entity';
import { TrackLikes } from '../track/entities/track-likes.entity';
import { TrackRepost } from '../track/entities/track-reposts.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, User, Track, TrackLikes, TrackRepost, RecentlyPlayed]),
    TrackModule,
    UserModule,
  ],
  controllers: [AdminController, ReportController],
  providers: [AdminService, AdminRepository],
})
export class AdminModule {}
