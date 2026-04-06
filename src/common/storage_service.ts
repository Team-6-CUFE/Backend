import { Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as fs from 'node:fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly AWS_S3_BUCKET = process.env.AWS_S3_BUCKET!;

  private s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'ap-south-1',
  });

  async uploadFile(file: Express.Multer.File): Promise<AWS.S3.ManagedUpload.SendData> {
    const { originalname } = file;
    return this.s3_upload(file.buffer, this.AWS_S3_BUCKET, originalname, file.mimetype);
  }

  /** Deletes an object from S3 by its full URL. Non-fatal — logs on failure. */
  async deleteFile(url: string): Promise<void> {
    try {
      const key = decodeURIComponent(new URL(url).pathname.substring(1));
      await this.s3.deleteObject({ Bucket: this.AWS_S3_BUCKET, Key: key }).promise();
      this.logger.log(`Deleted S3 object: ${key}`);
    } catch (e) {
      this.logger.warn(`Failed to delete S3 object (url: ${url}): ${(e as Error).message}`);
    }
  }

  /** Downloads an S3 object by its full URL and writes it to a local temp path. */
  async downloadToTemp(url: string, tempPath: string): Promise<void> {
    const key = decodeURIComponent(new URL(url).pathname.substring(1));
    const data = await this.s3.getObject({ Bucket: this.AWS_S3_BUCKET, Key: key }).promise();
    fs.writeFileSync(tempPath, data.Body as Buffer);
  }

  private async s3_upload(
    file: Buffer,
    bucket: string,
    name: string,
    mimetype: string
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: bucket,
      Key: String(name),
      Body: file,
      ContentType: mimetype,
      ContentDisposition: 'inline',
    };

    try {
      const s3Response = await this.s3.upload(params).promise();
      return s3Response;
    } catch (e) {
      console.error('S3 upload error:', e);
      throw e;
    }
  }
}
