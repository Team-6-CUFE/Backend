import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DownloadedPlaylist } from './entities/downloaded-playlists.entity';
import { DownloadedTrack, DownloadSource } from './entities/downloaded-tracks.entity';
import { DownloadStatus } from './enums/download-status.enum';

@Injectable()
export class DownloadRepository {
  constructor(
    @InjectRepository(DownloadedPlaylist)
    private readonly downloadedPlaylistRepository: Repository<DownloadedPlaylist>,

    @InjectRepository(DownloadedTrack)
    private readonly downloadedTrackRepository: Repository<DownloadedTrack>
  ) {}

  async saveDownloadedTrack(
    userId: string,
    trackId: string,
    sourcePlaylistId?: string,
    source: DownloadSource = DownloadSource.TRACK
  ): Promise<DownloadedTrack> {
    const downloadedTrack = this.downloadedTrackRepository.create({
      userId,
      trackId,
      sourcePlaylistId,
      source,
    });
    return this.downloadedTrackRepository.save(downloadedTrack);
  }

  async saveDownloadedPlaylist(userId: string, playlistId: string): Promise<DownloadedPlaylist> {
    const downloadedPlaylist = this.downloadedPlaylistRepository.create({
      userId,
      playlistId,
    });
    return this.downloadedPlaylistRepository.save(downloadedPlaylist);
  }

  async updateDownloadedPlaylistStatus(playlistId: string, userId: string, status: DownloadStatus) {
    await this.downloadedPlaylistRepository.update({ playlistId, userId }, { status });
  }

  async updateDownloadedTrackStatus(downloadId: string, status: DownloadStatus) {
    await this.downloadedTrackRepository.update({ downloadId }, { status });
  }

  async deleteDownloadedTrack(
    trackId: string,
    userId: string,
    source: DownloadSource = DownloadSource.TRACK
  ) {
    await this.downloadedTrackRepository.delete({ trackId, userId, source });
  }

  async deleteDownloadedPlaylist(playlistId: string, userId: string) {
    const result = await this.downloadedPlaylistRepository.delete({ playlistId, userId });
    if (result.affected && result.affected > 0) {
      // Also delete all tracks associated with this playlist download
      await this.downloadedTrackRepository.delete({ sourcePlaylistId: playlistId, userId });
      return true;
    }
    return false;
  }

  async getDownloadedTracksByPlaylistIds(
    userId: string,
    playlistIds: string[]
  ): Promise<DownloadedTrack[]> {
    if (!playlistIds.length) return [];
    return this.downloadedTrackRepository
      .createQueryBuilder('dt')
      .leftJoinAndSelect('dt.track', 'track')
      .leftJoinAndSelect('track.user', 'artist')
      .leftJoinAndSelect('track.genre', 'genre')
      .where('dt.userId = :userId', { userId })
      .andWhere('dt.source = :source', { source: DownloadSource.PLAYLIST })
      .andWhere('dt.sourcePlaylistId IN (:...playlistIds)', { playlistIds })
      .andWhere('dt.status = :status', { status: DownloadStatus.COMPLETED })
      .orderBy('dt.downloadedAt', 'ASC')
      .getMany();
  }

  async getDownloadedTrack(
    userId: string,
    trackId: string,
    source: DownloadSource
  ): Promise<DownloadedTrack | null> {
    return this.downloadedTrackRepository.findOne({ where: { userId, trackId, source } });
  }

  async getDownloadedPlaylist(
    userId: string,
    playlistId: string
  ): Promise<DownloadedPlaylist | null> {
    return this.downloadedPlaylistRepository.findOne({ where: { userId, playlistId } });
  }
}
