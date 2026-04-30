import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CreateReportDto } from './dto/createReport.dto';
import {
  ApiAddReport,
  ApiDeleteReport,
  ApiGetAllReports,
  ApiGetReport,
  ApiUpdateReportStatus,
} from './admin.swagger';
import { Roles } from '../authentication/decorators/roles.decorator';
import { ReportReason, ReportStatus, ReportType } from './report-enums';

@ApiTags('Reports')
@Controller('report')
export class ReportController {
  constructor(private readonly adminService: AdminService) {}

  @ApiAddReport()
  @Post('add-report')
  addReport(@CurrentUser('sub') userId: string, @Body() createReportDto: CreateReportDto) {
    return this.adminService.addReport(userId, createReportDto);
  }

  @ApiGetAllReports()
  @Roles('admin')
  @Get('/all')
  getAllReports(
    @CurrentUser('sub') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: ReportStatus,
    @Query('type') type?: ReportType,
    @Query('reason') reason?: ReportReason
  ) {
    console.log(userId);
    return this.adminService.getAllReports(page, limit, status, type, reason);
  }

  @Roles('admin')
  @ApiDeleteReport()
  @Delete(':reportId')
  deleteReport(@Param('reportId') reportId: string) {
    return this.adminService.deleteReport(reportId);
  }

  @Roles('admin')
  @ApiUpdateReportStatus()
  @Patch('update-status/:reportId')
  updateReportStatus(@Query('status') status: ReportStatus, @Param('reportId') reportId: string) {
    return this.adminService.updateReportStatus(status, reportId);
  }

  @Roles('admin')
  @ApiGetReport()
  @Get(':reportId')
  getReport(@Param('reportId') reportId: string) {
    return this.adminService.getReport(reportId);
  }
}
