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

  async deleteDownloadedTrack(downloadId: string) {
    await this.downloadedTrackRepository.delete({ downloadId });
  }

  async deleteDownloadedPlaylist(playlistId: string, userId: string) {
    await this.downloadedPlaylistRepository.delete({ playlistId, userId });
  }

  async getDownloadedTracksByUser(userId: string): Promise<DownloadedTrack[]> {
    return this.downloadedTrackRepository.find({ where: { userId } });
  }

  async getDownloadedPlaylistsByUser(userId: string): Promise<DownloadedPlaylist[]> {
    return this.downloadedPlaylistRepository.find({ where: { userId } });
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
