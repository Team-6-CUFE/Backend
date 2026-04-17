import { Injectable } from '@nestjs/common';
// import { DiscoveryRepository } from './discovery.repository';
import { FollowersRepository } from '../followers/followers.repository';

@Injectable()
export class DiscoveryService {
  constructor(
    // private readonly discoveryRepository: DiscoveryRepository,
    private readonly followersRepository: FollowersRepository
  ) {}

  async getFeed(userId: string, includeReposts: boolean, page: number = 1, limit: number = 20) {
    const followingIds = this.followersRepository.getFollowingIds(userId);
    console.log(followingIds, page, limit, includeReposts);
  }
}
