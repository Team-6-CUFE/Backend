import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalProfile } from './entities/external-profile.entity';
import { CreateExternalProfileDto } from './dto/create-external-profile.dto';

@Injectable()
export class ExternalProfileRepository {
  constructor(
    @InjectRepository(ExternalProfile)
    private readonly repo: Repository<ExternalProfile>
  ) {}

  async create(userId: string, dto: CreateExternalProfileDto): Promise<ExternalProfile> {
    const profile = this.repo.create({
      ...dto,
      user: { id: userId }, // Link it via the User ID
    });
    return this.repo.save(profile);
  }

  async findAllByUserId(userId: string): Promise<ExternalProfile[]> {
    return this.repo.find({
      where: { user: { id: userId } },
    });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
