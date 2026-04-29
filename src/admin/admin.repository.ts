import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Track } from '../track/entities/track.entity';
import { Report } from './entities/report.entity';
import { ReportStatus } from './report-enums';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>
  ) {}

  async findAllUsers(limit: number, offset: number, search?: string): Promise<[User[], number]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.emails', 'emailRecord');

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('user.username ILIKE :search', { search: `%${search}%` }).orWhere(
            'emailRecord.email ILIKE :search',
            { search: `%${search}%` }
          );
        })
      );
    }

    query.skip(offset).take(limit).orderBy('user.createdAt', 'DESC');

    return query.getManyAndCount();
  }

  async updateUserSuspensionStatus(
    userId: string,
    isSuspended: boolean,
    reason: string | null
  ): Promise<void> {
    await this.userRepository.update(userId, {
      isSuspended,
      suspensionReason: reason,
    });
  }

  async getTopTracks(): Promise<Track[]> {
    return this.trackRepository.find({
      order: {
        playCount: 'DESC',
      },
      take: 5,
      relations: ['user'],
      select: {
        trackId: true,
        title: true,
        playCount: true,
        coverImage: true,
        durationSeconds: true,
        user: {
          userId: true,
          username: true,
        },
      },
    });
  }

  async getPlatformStats() {
    const [activeUsers, totalUploads, openReports, totalPlaysResult] = await Promise.all([
      this.userRepository.count({ where: { isSuspended: false } }),

      this.trackRepository.count(),

      this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),

      this.trackRepository
        .createQueryBuilder('track')
        .select('SUM(track.playCount)', 'sum')
        .getRawOne(),
    ]);

    return {
      activeUsers,
      totalPlays: parseInt(totalPlaysResult?.sum || '0', 10),
      totalUploads,
      openReports,
    };
  }
}
