import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/createReport.dto';
import { ReportStatus, ReportType } from './report-enums';
import { TrackService } from '../track/track.service';
import { TrackRepository } from '../track/track.repository';
import { UserRepository } from '../user/user.repository';

import { AdminRepository } from './admin.repository';
import { UserService } from '../user/user.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly trackService: TrackService,
    private readonly trackRepository: TrackRepository,
    private readonly userRepository: UserRepository,
    private readonly adminRepository: AdminRepository,
    private readonly userService: UserService
  ) {}

  async addReport(userId: string, createReportDto: CreateReportDto) {
    const existingReport = await this.reportRepository.findOne({
      where: {
        reporterId: userId,
        targetId: createReportDto.targetId,
      },
    });
    if (existingReport) {
      throw new BadRequestException('you have already submitted this report');
    }
    if (createReportDto.type === ReportType.USER && userId === createReportDto.targetId) {
      throw new ForbiddenException('you cannot report yourself');
    }
    if (createReportDto.type === ReportType.TRACK) {
      const track = await this.trackService.getTrackById(createReportDto.targetId);
      if (track.userId === userId) {
        throw new ForbiddenException('you cannot report your own track');
      }
    }
    if (createReportDto.type === ReportType.COMMENT) {
      const comment = await this.trackRepository.findCommentById(createReportDto.targetId);
      if (comment!.userId === userId) {
        throw new ForbiddenException('you cannot report your own comment');
      }
    }
    const report = this.reportRepository.create({
      reporterId: userId,
      type: createReportDto.type,
      targetId: createReportDto.targetId,
      reason: createReportDto.reason,
      description: createReportDto.description,
    });

    await this.reportRepository.save(report);

    return {
      status: 'success',
      message: 'Report submitted successfully',
      data: report,
    };
  }

  async getAllReports(page: number = 1, limit: number = 20) {
    const [reports, total] = await this.reportRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const reporterData = await this.userRepository.findById(report.reporterId);

        const reporter = {
          userId: reporterData?.userId,
          username: reporterData?.username,
          displayName: reporterData?.displayName,
          avatarUrl: reporterData?.avatarUrl,
          coverPhoto: reporterData?.coverPhoto,
        };

        let target = null;

        if (report.type === ReportType.USER) {
          const user = await this.userRepository.findById(report.targetId);
          target = {
            username: user?.username,
            displayName: user?.displayName,
            coverPhoto: user?.coverPhoto,
            avatarUrl: user?.avatarUrl,
            isPublic: user?.isPublic,
          };
        } else if (report.type === ReportType.TRACK) {
          const track = await this.trackService.getTrackById(report.targetId);
          target = { trackId: track.trackId, title: track.title, coverImage: track.coverImage };
        } else if (report.type === ReportType.COMMENT) {
          const comment = await this.trackRepository.findCommentById(report.targetId);
          target = {
            commentId: comment?.commentId,
            userId: comment?.userId,
            content: comment?.content,
          };
        }

        return {
          ...report,
          reporter,
          target,
        };
      })
    );

    return {
      status: 'success',
      data: enrichedReports,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteReport(reportId: string) {
    const report = await this.reportRepository.findOne({ where: { reportId } });
    if (!report) {
      throw new BadRequestException('report not found');
    }
    await this.reportRepository.delete(reportId);
    return {
      status: 'success',
      message: 'report deleted successfully',
    };
  }

  async updateReportStatus(status: ReportStatus, reportId: string) {
    const report = await this.reportRepository.findOne({ where: { reportId } });
    if (!report) {
      throw new BadRequestException('Report not found');
    }

    await this.reportRepository.update(reportId, {
      status,
      reviewedAt: new Date(),
    });

    return {
      status: 'success',
      message: 'Report status updated successfully',
    };
  }

  async getReport(reportId: string) {
    const report = await this.reportRepository.findOne({ where: { reportId } });

    if (!report) {
      throw new BadRequestException('Report not found');
    }

    const reporterData = await this.userRepository.findById(report.reporterId);

    const reporter = {
      userId: reporterData?.userId,
      username: reporterData?.username,
      displayName: reporterData?.displayName,
      avatarUrl: reporterData?.avatarUrl,
      coverPhoto: reporterData?.coverPhoto,
    };

    let target = null;

    if (report.type === ReportType.USER) {
      const user = await this.userRepository.findById(report.targetId);
      target = {
        username: user?.username,
        displayName: user?.displayName,
        coverPhoto: user?.coverPhoto,
        avatarUrl: user?.avatarUrl,
        isPublic: user?.isPublic,
      };
    } else if (report.type === ReportType.TRACK) {
      const track = await this.trackService.getTrackById(report.targetId);
      target = { trackId: track.trackId, title: track.title, coverImage: track.coverImage };
    } else if (report.type === ReportType.COMMENT) {
      const comment = await this.trackRepository.findCommentById(report.targetId);
      target = {
        commentId: comment?.commentId,
        userId: comment?.userId,
        content: comment?.content,
      };
    }

    return {
      status: 'success',
      data: {
        ...report,
        reporter,
        target,
      },
    };
  }

  async getUsers(limit: number, offset: number, search?: string) {
    const [users, total] = await this.adminRepository.findAllUsers(limit, offset, search);
    return { users, total };
  }

  async suspendUser(userId: string, reason: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    await this.adminRepository.updateUserSuspensionStatus(userId, true, reason);
  }

  async reactivateUser(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    await this.adminRepository.updateUserSuspensionStatus(userId, false, null);
  }

  async getTopTracks() {
    return this.adminRepository.getTopTracks();
  }

  async getPlatformStats() {
    return this.adminRepository.getPlatformStats();
  }
}
