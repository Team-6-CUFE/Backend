import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { FollowersRepository } from '../followers/followers.repository';
import { ActivityService } from '../activity/activity.service';
import { TrackRepository } from '../track/track.repository';
import { TrackService } from '../track/track.service';
import { PlaylistRepository } from '../playlist/playlist.repository';
import { UserService } from '../user/user.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  const mockFollowersRepository = { getFollowingIds: jest.fn() };
  const mockActivityService = { getActivitiesByUserIds: jest.fn() };
  const mockTrackRepository = { findById: jest.fn(), findRelated: jest.fn() };
  const mockTrackService = { getRelatedTracks: jest.fn() };
  const mockPlaylistRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
  };
  const mockUserService = { findByUsername: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: FollowersRepository, useValue: mockFollowersRepository },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: TrackRepository, useValue: mockTrackRepository },
        { provide: TrackService, useValue: mockTrackService },
        { provide: PlaylistRepository, useValue: mockPlaylistRepository },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
