import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RecentlyPlayed, RecentlyPlayedItemType } from '../track/entities/recently-played.entity';
import { User } from './entities/user.entity';
import { Playlist } from '../playlist/entities/playlist.entity';

export interface RecentlyPlayedArtistRow {
  type: 'artist';
  playedAt: Date;
  artist: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    followersCount: number;
  } | null;
}

export interface RecentlyPlayedPlaylistRow {
  type: 'playlist';
  playedAt: Date;
  playlist: {
    playlistId: string;
    title: string;
    coverImage: string | undefined;
    tracksCount: number;
    owner: { userId: string; username: string; displayName: string };
  } | null;
}

export type RecentlyPlayedRow = RecentlyPlayedArtistRow | RecentlyPlayedPlaylistRow;

@Injectable()
export class RecentlyPlayedRepository {
  constructor(
    @InjectRepository(RecentlyPlayed)
    private readonly recentlyPlayedRepository: Repository<RecentlyPlayed>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>
  ) {}

  async findByUser(userId: string): Promise<RecentlyPlayedRow[]> {
    const rows = await this.recentlyPlayedRepository.find({
      where: { userId },
      order: { playedAt: 'DESC' },
      take: 6,
    });

    if (rows.length === 0) return [];

    const artistIds = rows
      .filter((r) => r.itemType === RecentlyPlayedItemType.ARTIST)
      .map((r) => r.itemId);

    const playlistIds = rows
      .filter((r) => r.itemType === RecentlyPlayedItemType.PLAYLIST)
      .map((r) => r.itemId);

    const [artists, playlists] = await Promise.all([
      artistIds.length ? this.userRepository.findBy({ userId: In(artistIds) }) : [],
      playlistIds.length
        ? this.playlistRepository.find({
            where: { playlistId: In(playlistIds) },
            relations: ['user'],
          })
        : [],
    ]);

    const artistMap = new Map(artists.map((a) => [a.userId, a]));
    const playlistMap = new Map(playlists.map((p) => [p.playlistId, p]));

    return rows.map((row): RecentlyPlayedRow => {
      if (row.itemType === RecentlyPlayedItemType.ARTIST) {
        const artist = artistMap.get(row.itemId) ?? null;
        return {
          type: 'artist',
          playedAt: row.playedAt,
          artist: artist && {
            userId: artist.userId,
            username: artist.username,
            displayName: artist.displayName,
            avatarUrl: artist.avatarUrl,
            followersCount: artist.followersCount,
          },
        };
      }
      const playlist = playlistMap.get(row.itemId) ?? null;
      return {
        type: 'playlist',
        playedAt: row.playedAt,
        playlist: playlist && {
          playlistId: playlist.playlistId,
          title: playlist.title,
          coverImage: playlist.coverImage,
          tracksCount: playlist.tracksCount,
          owner: {
            userId: playlist.user.userId,
            username: playlist.user.username,
            displayName: playlist.user.displayName,
          },
        },
      };
    });
  }
}
