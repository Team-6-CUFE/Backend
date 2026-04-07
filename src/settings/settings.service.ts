import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Settings } from './entities/settings.entity';
import { PrivacySettingsDto } from './dtos/privacy.dto';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  /**
   * Get privacy settings by user ID
   */
  async getPrivacySettings(userId: string): Promise<{
    status: string;
    message: string;
    data: PrivacySettingsDto;
  }> {
    const settings = await this.settingsRepository.getPrivacySettings(userId);

    if (!settings) {
      throw new NotFoundException(`Privacy settings for user ${userId} not found`);
    }

    const data = plainToInstance(PrivacySettingsDto, settings, { excludeExtraneousValues: true });
    return {
      status: 'success',
      message: 'Privacy settings retrieved successfully',
      data,
    };
  }

  /**
   * Create default settings for a new user
   * Should be called when a new user registers
   */
  async createDefaultSettings(userId: string): Promise<Settings> {
    const settings = this.settingsRepository.createDefaultSettings(userId);
    return settings;
  }

  /**
   * Update user privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    updateDto: Partial<PrivacySettingsDto>
  ): Promise<{
    status: string;
    message: string;
    data: PrivacySettingsDto;
  }> {
    const settings = await this.settingsRepository.updatePrivacySettings(userId, updateDto);

    if (!settings) {
      throw new NotFoundException(`Privacy settings for user ${userId} not found`);
    }

    return {
      status: 'success',
      message: 'Privacy settings updated successfully',
      data: plainToInstance(PrivacySettingsDto, settings, { excludeExtraneousValues: true }),
    };
  }

  /**
   * Check if user allows being shown as top/first fan
   */
  async canShowUserAsFan(userId: string): Promise<boolean> {
    const settings = await this.settingsRepository.getPrivacySettings(userId);
    return settings!.showWhenTopOrFirstFan;
  }

  /**
   * Check if artist allows showing top/first fans on their tracks
   */
  async canShowTrackFans(artistId: string): Promise<boolean> {
    const settings = await this.settingsRepository.getPrivacySettings(artistId);
    return settings!.showMyTrackTopAndFirstFans;
  }

  /**
   * Check if both user and artist allow fan visibility
   */
  async canDisplayFanRelationship(userId: string, artistId: string): Promise<boolean> {
    const [userSettings, artistSettings] = await Promise.all([
      this.settingsRepository.getPrivacySettings(userId),
      this.settingsRepository.getPrivacySettings(artistId),
    ]);

    return userSettings!.showWhenTopOrFirstFan && artistSettings!.showMyTrackTopAndFirstFans;
  }

  /**
   * Reset all settings to default
   */
  async resetToDefaults(userId: string): Promise<Settings> {
    await this.settingsRepository.delete(userId);
    return this.createDefaultSettings(userId);
  }
}
