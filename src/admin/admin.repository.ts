import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Track } from '../track/entities/track.entity';
import { Report } from './entities/report.entity';
import { ReportStatus } from './report-enums';
import { RecentlyPlayed } from '../track/entities/recently-played.entity';
import { TrackLikes } from '../track/entities/track-likes.entity';
import { TrackRepost } from '../track/entities/track-reposts.entity';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(RecentlyPlayed)
    private readonly recentlyPlayedRepository: Repository<RecentlyPlayed>,
    @InjectRepository(TrackLikes)
    private readonly trackLikesRepository: Repository<TrackLikes>,
    @InjectRepository(TrackRepost)
    private readonly trackRepostRepository: Repository<TrackRepost>
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

  async getEngagementAnalytics30Days() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [uploadsDb, playsDb, likesDb, repostsDb, activeUsersDb] = await Promise.all([
      this.trackRepository
        .createQueryBuilder('track')
        .select('DATE(track.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('track.createdAt >= :date', { date: thirtyDaysAgo })
        .groupBy('DATE(track.createdAt)')
        .getRawMany(),

      this.recentlyPlayedRepository
        .createQueryBuilder('rp')
        .select('DATE(rp.playedAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('rp.playedAt >= :date', { date: thirtyDaysAgo })
        .groupBy('DATE(rp.playedAt)')
        .getRawMany(),

      this.trackLikesRepository
        .createQueryBuilder('like')
        .select('DATE(like.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('like.createdAt >= :date', { date: thirtyDaysAgo })
        .groupBy('DATE(like.createdAt)')
        .getRawMany(),

      this.trackRepostRepository
        .createQueryBuilder('repost')
        .select('DATE(repost.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('repost.createdAt >= :date', { date: thirtyDaysAgo })
        .groupBy('DATE(repost.createdAt)')
        .getRawMany(),

      this.recentlyPlayedRepository
        .createQueryBuilder('rp')
        .select('DATE(rp.playedAt)', 'date')
        .addSelect('COUNT(DISTINCT rp.userId)', 'count')
        .where('rp.playedAt >= :date', { date: thirtyDaysAgo })
        .groupBy('DATE(rp.playedAt)')
        .getRawMany(),
    ]);

    const last30Days = [];
    const dataMap = new Map();

    // eslint-disable-next-line no-plusplus
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayData = { date: dateStr, activeUsers: 0, uploads: 0, plays: 0, likes: 0, reposts: 0 };
      last30Days.push(dayData);
      dataMap.set(dateStr, dayData);
    }

    const mergeData = (dbResults: any[], key: string) => {
      dbResults.forEach((row) => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        if (dataMap.has(dateStr)) {
          dataMap.get(dateStr)[key] = parseInt(row.count, 10);
        }
      });
    };

    mergeData(uploadsDb, 'uploads');
    mergeData(playsDb, 'plays');
    mergeData(likesDb, 'likes');
    mergeData(repostsDb, 'reposts');
    mergeData(activeUsersDb, 'activeUsers');

    return last30Days;
  }
}
