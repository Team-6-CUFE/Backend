import { Module } from '@nestjs/common';
import { StorageController } from './storage_controller';
import { StorageService } from './storage_service';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
})
export class AudioStorageModule {}
