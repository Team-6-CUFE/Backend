import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/createReport.dto';
import { ReportType } from './report-enums';
import { TrackService } from '../track/track.service';
import { TrackRepository } from '../track/track.repository';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly trackService: TrackService,
    private readonly trackRepository: TrackRepository
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
}
