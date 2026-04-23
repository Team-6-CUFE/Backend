import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Settings } from './entities/settings.entity';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>
  ) {}

  async getPrivacySettings(userId: string): Promise<Settings | null> {
    return this.settingsRepository.findOne({ where: { userId } });
  }

  async createDefaultSettings(userId: string): Promise<Settings> {
    const defaultSettings = this.settingsRepository.create({
      userId,
    });
    return this.settingsRepository.save(defaultSettings);
  }

  async updatePrivacySettings(
    userId: string,
    updateDto: Partial<Settings>
  ): Promise<Settings | null> {
    const settings = await this.getPrivacySettings(userId);
    if (!settings) {
      return null;
    }
    await this.settingsRepository.update({ userId }, updateDto);
    return this.getPrivacySettings(userId);
  }

  async delete(userId: string): Promise<void> {
    await this.settingsRepository.delete({ userId });
  }

  async updateNotificationSettings(
    userId: string,
    updateDto: Partial<Settings>
  ): Promise<Settings | null> {
    const settings = await this.getPrivacySettings(userId);

    if (!settings) {
      return null;
    }

    await this.settingsRepository.update({ userId }, updateDto);

    return this.getPrivacySettings(userId);
  }
}
