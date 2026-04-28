import { Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DownloadService } from './download.service';
import { Plans } from '../authentication/decorators/plans.decorator';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@ApiTags('Download')
@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Plans('pro', 'go+')
  @Post('track/:track_id')
  async downloadTrack(@Param('track_id') trackId: string, @CurrentUser('sub') userId: string) {
    return this.downloadService.downloadTrack(trackId, userId);
  }

  @Plans('pro', 'go+')
  @Delete('track/:track_id')
  async deleteDownloadedTrack(
    @Param('track_id') trackId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.downloadService.deleteDownloadedTrack(trackId, userId);
  }
}
