import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient } from 'redis';
import { FanRepository, FanRow } from '../fan.repository';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { Track } from '../entities/track.entity';
import { Settings } from '../../settings/entities/settings.entity';

const TOP_FANS_TTL_SECS = 25 * 60 * 60;
const FIRST_FANS_TTL_SECS = 25 * 60 * 60;
const FIRST_FANS_LIVE_TTL_SECS = 60 * 60; // 1h cache while window is still open

export interface FanResult {
  rank: number;
  playCount: number;
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

@Injectable()
export class FansService {
  private readonly logger = new Logger(FansService.name);

  constructor(
    private readonly fanRepository: FanRepository,

    @Inject(REDIS_CLIENT)
    private readonly redis: ReturnType<typeof createClient>,

    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,

    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>
  ) {}

  private toFanResults(fans: FanRow[]): FanResult[] {
    return fans.map((fan, index) => ({
      rank: index + 1,
      playCount: fan.playCount,
      user: {
        userId: fan.userId,
        username: fan.username,
        displayName: fan.displayName,
        avatarUrl: fan.avatarUrl,
      },
    }));
  }

  async getTopFans(trackId: string): Promise<FanResult[]> {
    const track = await this.trackRepository.findOne({ where: { trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const artistSettings = await this.settingsRepository.findOne({
      where: { userId: track.userId },
    });
    if (!artistSettings?.showMyTrackTopAndFirstFans) return [];

    const cached = await this.redis.get(`top_fans:${trackId}`);
    if (cached) return JSON.parse(cached) as FanResult[];

    return this.refreshTopFans(trackId);
  }

  async getFirstFans(trackId: string): Promise<FanResult[]> {
    const track = await this.trackRepository.findOne({ where: { trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const artistSettings = await this.settingsRepository.findOne({
      where: { userId: track.userId },
    });
    if (!artistSettings?.showMyTrackTopAndFirstFans) return [];

    const cached = await this.redis.get(`first_fans:${trackId}`);
    if (cached) return JSON.parse(cached) as FanResult[];

    const windowEnd = new Date(track.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const windowClosed = Date.now() >= windowEnd.getTime();

    if (!windowClosed) {
      // Window still open — compute live and cache for 1h (no DB write)
      const fans = await this.fanRepository.computeFirstFans(trackId);
      const result = this.toFanResults(fans.slice(0, 5));
      await this.redis.set(`first_fans:${trackId}`, JSON.stringify(result), {
        EX: FIRST_FANS_LIVE_TTL_SECS,
      });
      return result;
    }

    // Window closed — load permanent snapshot from DB
    const hasSnapshot = await this.fanRepository.hasSnapshot(trackId);
    if (hasSnapshot) {
      const fans = await this.fanRepository.findStoredFirstFans(trackId);
      const result = this.toFanResults(fans);
      await this.redis.set(`first_fans:${trackId}`, JSON.stringify(result), {
        EX: FIRST_FANS_TTL_SECS,
      });
      return result;
    }

    // Snapshot missing (4am job hasn't run yet) — compute, persist, cache
    return this.triggerFirstFansSnapshot(trackId);
  }

  async refreshTopFans(trackId: string): Promise<FanResult[]> {
    const fans = await this.fanRepository.computeTopFans(trackId);
    const result = this.toFanResults(fans);
    await this.redis.set(`top_fans:${trackId}`, JSON.stringify(result), {
      EX: TOP_FANS_TTL_SECS,
    });
    return result;
  }

  async triggerFirstFansSnapshot(trackId: string): Promise<FanResult[]> {
    const fans = await this.fanRepository.computeFirstFans(trackId);
    await this.fanRepository.saveSnapshot(trackId, fans); // saves up to 20 for future replacement support
    const result = this.toFanResults(fans.slice(0, 5));
    await this.redis.set(`first_fans:${trackId}`, JSON.stringify(result), {
      EX: FIRST_FANS_TTL_SECS,
    });
    return result;
  }

  async refreshAllTopFans(): Promise<void> {
    const trackIds = await this.fanRepository.findActiveTrackIds();
    this.logger.log(`Refreshing top fans for ${trackIds.length} active tracks`);

    const batchSize = 50;
    const batches = Array.from({ length: Math.ceil(trackIds.length / batchSize) }, (_, i) =>
      trackIds.slice(i * batchSize, (i + 1) * batchSize)
    );

    await batches.reduce<Promise<void>>(
      (chain, batch) =>
        chain.then(() =>
          Promise.allSettled(batch.map((id) => this.refreshTopFans(id))).then(() => undefined)
        ),
      Promise.resolve()
    );
  }

  async snapshotAllPendingFirstFans(): Promise<void> {
    const trackIds = await this.fanRepository.findTracksNeedingSnapshot();
    this.logger.log(`Snapshotting first fans for ${trackIds.length} pending tracks`);

    const results = await Promise.allSettled(
      trackIds.map((id) => this.triggerFirstFansSnapshot(id))
    );

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        this.logger.error(`Failed to snapshot first fans for track ${trackIds[i]}`, result.reason);
      }
    });
  }
}
