import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Settings } from './entities/settings.entity';
import { PrivacySettingsDto } from './dtos/privacy.dto';
import { SettingsRepository } from './settings.repository';
import { UpdateNotificationsDto } from './dtos/update-notifications.dto';

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

  async getNotificationSettings(userId: string) {
    const settings = await this.settingsRepository.getPrivacySettings(userId);

    if (!settings) {
      throw new NotFoundException(`Notification settings for user ${userId} not found`);
    }

    return {
      status: 'success',
      data: {
        email: {
          newFollower: settings.emailNewFollower,
          repost: settings.emailRepost,
          newPost: settings.emailNewPost,
          likesPlays: settings.emailLikesPlays,
          comment: settings.emailComment,
          recommended: settings.emailRecommended,
          newMessage: settings.emailNewMessage,
        },
        device: {
          newFollower: settings.deviceNewFollower,
          repost: settings.deviceRepost,
          newPost: settings.deviceNewPost,
          likes_plays: settings.deviceLikesPlays,
          comment: settings.deviceComment,
          recommended: settings.deviceRecommended,
          newMessage: settings.deviceNewMessage,
        },
      },
    };
  }

  /**
   * Update notification settings and return the newly formatted object
   */
  async updateNotificationSettings(userId: string, dto: UpdateNotificationsDto) {
    const updatePayload: Partial<Settings> = {};

    // Map nested email DTO (snake_case) to flat DB columns (camelCase)
    if (dto.email) {
      if (dto.email.newFollower !== undefined)
        updatePayload.emailNewFollower = dto.email.newFollower;
      if (dto.email.repost !== undefined) updatePayload.emailRepost = dto.email.repost;
      if (dto.email.newPost !== undefined) updatePayload.emailNewPost = dto.email.newPost;
      if (dto.email.likesPlays !== undefined) updatePayload.emailLikesPlays = dto.email.likesPlays;
      if (dto.email.comment !== undefined) updatePayload.emailComment = dto.email.comment;
      if (dto.email.recommended !== undefined)
        updatePayload.emailRecommended = dto.email.recommended;
      if (dto.email.newMessage !== undefined) updatePayload.emailNewMessage = dto.email.newMessage;
    }

    if (dto.device) {
      if (dto.device.newFollower !== undefined)
        updatePayload.deviceNewFollower = dto.device.newFollower;
      if (dto.device.repost !== undefined) updatePayload.deviceRepost = dto.device.repost;
      if (dto.device.newPost !== undefined) updatePayload.deviceNewPost = dto.device.newPost;
      if (dto.device.likesPlays !== undefined)
        updatePayload.deviceLikesPlays = dto.device.likesPlays;
      if (dto.device.comment !== undefined) updatePayload.deviceComment = dto.device.comment;
      if (dto.device.recommended !== undefined)
        updatePayload.deviceRecommended = dto.device.recommended;
      if (dto.device.newMessage !== undefined)
        updatePayload.deviceNewMessage = dto.device.newMessage;
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.settingsRepository.updateNotificationSettings(userId, updatePayload);
    }

    const updatedSettings = await this.getNotificationSettings(userId);

    return {
      status: 'success',
      message: 'Notification settings updated successfully',
      data: updatedSettings.data,
    };
  }
}
