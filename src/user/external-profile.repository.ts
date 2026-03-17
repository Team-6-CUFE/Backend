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

  async create(userId: string, createDto: CreateExternalProfileDto): Promise<ExternalProfile> {
    const profile = this.repo.create({
      user_id: userId,
      ...createDto,
    });

    return this.repo.save(profile);
  }

  async delete(profileId: string): Promise<void> {
    await this.repo.delete(profileId);
  }
}
