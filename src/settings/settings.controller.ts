import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { PrivacySettingsDto } from './dtos/privacy.dto';
import { ApiGetPrivacySettings, ApiUpdatePrivacySettings } from './settings.swagger';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiGetPrivacySettings()
  @Get('privacy')
  async getSettings(@CurrentUser('sub') userId: string) {
    return this.settingsService.getPrivacySettings(userId);
  }

  @ApiUpdatePrivacySettings()
  @Put('privacy')
  async updateSettings(@CurrentUser('sub') userId: string, @Body() privacyDto: PrivacySettingsDto) {
    return this.settingsService.updatePrivacySettings(userId, privacyDto);
  }
}
