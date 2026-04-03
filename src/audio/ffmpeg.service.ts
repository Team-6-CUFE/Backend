import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'node:fs';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';

@Injectable()
export class FfmpegService {
  constructor() {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }

  private transcodeHq(filePath: string, onProgress?: (percent: number) => void): Promise<string> {
    const outputPath = `${filePath}_hq.mp3`;
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioCodec('libmp3lame')
        .audioBitrate('256k')
        .on('progress', (p) => onProgress?.(p.percent ?? 0))
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  private transcodeStandard(
    filePath: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const outputPath = `${filePath}_standard.mp3`;
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .on('progress', (p) => onProgress?.(p.percent ?? 0))
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  private createPreview(standardPath: string, startTime: string): Promise<string> {
    const outputPath = `${standardPath}_preview.mp3`;
    return new Promise((resolve, reject) => {
      ffmpeg(standardPath)
        .audioCodec('libmp3lame')
        .setStartTime(startTime)
        .setDuration(20)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  private async generateWaveform(filePath: string, numSamples = 1000): Promise<number[]> {
    const rawPcmPath = `${filePath}_pcm.raw`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(filePath)
        .audioChannels(1)
        .audioFrequency(8000)
        .format('s16le')
        .on('end', () => resolve())
        .on('error', reject)
        .save(rawPcmPath);
    });

    const buffer = fs.readFileSync(rawPcmPath);
    fs.unlinkSync(rawPcmPath);

    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);

    const chunkSize = Math.floor(samples.length / numSamples);
    const peaks: number[] = [];

    for (let i = 0; i < numSamples; i += 1) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      let peak = 0;
      for (let j = start; j < end; j += 1) {
        const abs = Math.abs(samples[j]);
        if (abs > peak) peak = abs;
      }
      peaks.push(parseFloat((peak / 32767).toFixed(4)));
    }

    return peaks;
  }

  async getDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(Math.floor(metadata.format.duration!));
        return Math.floor(metadata.format.duration!);
      });
    });
  }

  async processAudio(
    filePath: string,
    previewStartTime: string,
    onProgress: (percent: number) => void
  ): Promise<{
    hqPath: string;
    standardPath: string;
    previewPath: string;
    waveform: number[];
    duration: number;
  }> {
    const [hqPath, standardPath, duration] = await Promise.all([
      this.transcodeHq(filePath, (p) => onProgress(p * 0.6)),
      this.transcodeStandard(filePath, (p) => onProgress(p * 0.3)),
      this.getDuration(filePath),
    ]);

    onProgress(70);
    const previewPath = await this.createPreview(standardPath, previewStartTime);

    // Waveform from original file
    onProgress(75);
    const waveform = await this.generateWaveform(filePath);
    onProgress(95);

    return { hqPath, standardPath, previewPath, waveform, duration };
  }
}
