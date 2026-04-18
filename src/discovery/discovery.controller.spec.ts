import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { FollowersRepository } from '../followers/followers.repository';
import { ActivityService } from '../activity/activity.service';
import { TrackRepository } from '../track/track.repository';
import { TrackService } from '../track/track.service';
import { PlaylistRepository } from '../playlist/playlist.repository';

describe('DiscoveryController', () => {
  let controller: DiscoveryController;

  const mockDiscoveryService = {
    getFeed: jest.fn(),
    getTrackStation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        { provide: DiscoveryService, useValue: mockDiscoveryService },
        { provide: FollowersRepository, useValue: {} },
        { provide: ActivityService, useValue: {} },
        { provide: TrackRepository, useValue: {} },
        { provide: TrackService, useValue: {} },
        { provide: PlaylistRepository, useValue: {} },
      ],
    }).compile();

    controller = module.get<DiscoveryController>(DiscoveryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
