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

@Module({
  imports: [TypeOrmModule.forFeature([Report, User, Track]), TrackModule, UserModule],
  controllers: [AdminController, ReportController],
  providers: [AdminService],
})
export class AdminModule {}
