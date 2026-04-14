import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { ActivitiesService } from './activities.service';

@Module({
  controllers: [DiscoveryController],
  providers: [DiscoveryService, ActivitiesService],
  exports: [DiscoveryService, ActivitiesService],
})
export class DiscoveryModule {}
