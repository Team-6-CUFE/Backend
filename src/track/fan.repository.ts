import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TrackFirstFan } from './entities/track-first-fan.entity';

export interface FanRow {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  playCount: number;
}

const QUALIFICATION_SQL = `
  SELECT
    tp.user_id     AS "userId",
    u.username,
    u.display_name AS "displayName",
    u.avatar_url   AS "avatarUrl",
    COUNT(*)::int  AS "playCount"
  FROM track_plays tp
  JOIN tracks t ON t.track_id = tp.track_id
  JOIN users  u ON u.user_id  = tp.user_id
  WHERE tp.track_id = $1
    AND EXISTS (
      SELECT 1 FROM user_follows uf
      WHERE uf.follower = tp.user_id AND uf.followed = t.user_id
    )
    AND EXISTS (
      SELECT 1 FROM track_likes tl
      WHERE tl.user_id = tp.user_id AND tl.track_id = tp.track_id
    )
    AND u.avatar_url IS NOT NULL AND u.avatar_url <> ''
    AND EXISTS (
      SELECT 1 FROM settings s
      WHERE s.user_id = tp.user_id AND s.show_when_top_or_first_fan = true
    )
  GROUP BY tp.user_id, u.username, u.display_name, u.avatar_url
  ORDER BY "playCount" DESC
  LIMIT 5
`;

const FIRST_FANS_SQL = `
  SELECT
    tp.user_id     AS "userId",
    u.username,
    u.display_name AS "displayName",
    u.avatar_url   AS "avatarUrl",
    COUNT(*)::int  AS "playCount"
  FROM track_plays tp
  JOIN tracks t ON t.track_id = tp.track_id
  JOIN users  u ON u.user_id  = tp.user_id
  WHERE tp.track_id = $1
    AND tp.played_at <= t.created_at + INTERVAL '7 days'
    AND EXISTS (
      SELECT 1 FROM user_follows uf
      WHERE uf.follower = tp.user_id AND uf.followed = t.user_id
    )
    AND EXISTS (
      SELECT 1 FROM track_likes tl
      WHERE tl.user_id = tp.user_id AND tl.track_id = tp.track_id
    )
    AND u.avatar_url IS NOT NULL AND u.avatar_url <> ''
    AND EXISTS (
      SELECT 1 FROM settings s
      WHERE s.user_id = tp.user_id AND s.show_when_top_or_first_fan = true
    )
  GROUP BY tp.user_id, u.username, u.display_name, u.avatar_url
  ORDER BY "playCount" DESC
  LIMIT 20
`;

@Injectable()
export class FanRepository {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(TrackFirstFan)
    private readonly firstFanRepository: Repository<TrackFirstFan>
  ) {}

  async computeTopFans(trackId: string): Promise<FanRow[]> {
    return this.dataSource.query<FanRow[]>(QUALIFICATION_SQL, [trackId]);
  }

  async computeFirstFans(trackId: string): Promise<FanRow[]> {
    return this.dataSource.query<FanRow[]>(FIRST_FANS_SQL, [trackId]);
  }

  async hasSnapshot(trackId: string): Promise<boolean> {
    const count = await this.firstFanRepository.countBy({ trackId });
    return count > 0;
  }

  async saveSnapshot(trackId: string, fans: FanRow[]): Promise<void> {
    if (fans.length === 0) return;

    const entities = fans.map((fan) =>
      this.firstFanRepository.create({
        trackId,
        userId: fan.userId,
        playCount: fan.playCount,
      })
    );

    await this.firstFanRepository.save(entities);
  }

  async findStoredFirstFans(trackId: string): Promise<FanRow[]> {
    const rows = await this.firstFanRepository.find({
      where: { trackId },
      relations: ['user'],
      order: { playCount: 'DESC' },
      take: 5,
    });

    return rows.map((row) => ({
      userId: row.user.userId,
      username: row.user.username,
      displayName: row.user.displayName,
      avatarUrl: row.user.avatarUrl,
      playCount: row.playCount,
    }));
  }

  async findTracksNeedingSnapshot(): Promise<string[]> {
    const rows = await this.dataSource.query<{ track_id: string }[]>(`
      SELECT t.track_id
      FROM tracks t
      WHERE t.created_at + INTERVAL '7 days' <= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM track_first_fans tff WHERE tff.track_id = t.track_id
        )
    `);
    return rows.map((r) => r.track_id);
  }

  async findActiveTrackIds(): Promise<string[]> {
    const rows = await this.dataSource.query<{ track_id: string }[]>(`
      SELECT DISTINCT track_id
      FROM track_plays
      WHERE played_at >= NOW() - INTERVAL '24 hours'
    `);
    return rows.map((r) => r.track_id);
  }
}
