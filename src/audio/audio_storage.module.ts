import { Module } from '@nestjs/common';
import { StorageController } from './storage_controller';
import { StorageService } from '../common/storage_service';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class AudioStorageModule {}
