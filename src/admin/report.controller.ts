import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CreateReportDto } from './dto/createReport.dto';
import { ApiAddReport } from './admin.swagger';

@ApiTags('Reports')
@Controller('report')
export class ReportController {
  constructor(private readonly adminService: AdminService) {}

  @ApiAddReport()
  @Post('add-report')
  addReport(@CurrentUser('sub') userId: string, @Body() createReportDto: CreateReportDto) {
    return this.adminService.addReport(userId, createReportDto);
  }
}
