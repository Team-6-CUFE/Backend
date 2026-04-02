import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../common/storage_service';
import { Public } from '../authentication/decorators/public.decorator';

@Controller('audio')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('Upload endpoint hit');
    console.log('File received:', {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    const result = await this.storageService.uploadFile(file);
    console.log('Upload successful:', result?.Location);
    return { url: result?.Location };
  }
}
