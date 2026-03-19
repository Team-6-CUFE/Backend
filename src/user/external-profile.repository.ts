import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalProfile } from './entities/external-profile.entity';
import { CreateExternalProfileDto } from './dto/create-external-profile.dto';

@Injectable()
export class ExternalProfileRepository {
  constructor(
    @InjectRepository(ExternalProfile)
    private repo: Repository<ExternalProfile>
  ) {}

  async findAllByUserId(userId: string): Promise<ExternalProfile[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'ASC' },
    });
  }

  async findById(userId: string, profileId: string): Promise<ExternalProfile | null> {
    return this.repo.findOne({
      where: { id: profileId, user_id: userId },
    });
  }

  async create(userId: string, createDto: CreateExternalProfileDto): Promise<ExternalProfile> {
    const profile = this.repo.create({
      user_id: userId,
      ...createDto,
    });
    return this.repo.save(profile);
  }

  async update(profileId: string, data: Partial<ExternalProfile>): Promise<ExternalProfile | null> {
    await this.repo.update(profileId, data);
    return this.repo.findOneBy({ id: profileId });
  }

  async delete(profileId: string): Promise<void> {
    await this.repo.delete(profileId);
  }

  async countUserProfiles(userId: string): Promise<number> {
    return this.repo.count({
      where: { user_id: userId },
    });
  }

  async findDuplicateProfile(
    userId: string,
    name: string,
    url: string
  ): Promise<ExternalProfile | null> {
    return this.repo.findOne({
      where: [
        { user_id: userId, name },
        { user_id: userId, url },
      ],
    });
  }
}
