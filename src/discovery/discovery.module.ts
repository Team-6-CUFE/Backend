import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Activity])],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, ActivitiesService],
  exports: [DiscoveryService, ActivitiesService],
})
export class DiscoveryModule {}
