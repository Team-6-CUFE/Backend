import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class StorageService {
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
