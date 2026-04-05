import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { PrivacySettingsDto } from './dtos/privacy.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('privacy')
  async getSettings(@CurrentUser('sub') userId: string) {
    return this.settingsService.getPrivacySettings(userId);
  }

  @Put('privacy')
  async updateSettings(@CurrentUser('sub') userId: string, @Body() privacyDto: PrivacySettingsDto) {
    return this.settingsService.updatePrivacySettings(userId, privacyDto);
  }
}
