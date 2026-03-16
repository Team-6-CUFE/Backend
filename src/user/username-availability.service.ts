import { Injectable, OnModuleInit } from '@nestjs/common';
import { BloomFilter } from 'bloomfilter';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from './user.repository';

@Injectable()
export class UsernameAvailabilityService implements OnModuleInit {
  private bloomFilter: BloomFilter;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService
  ) {
    this.bloomFilter = new BloomFilter(
      this.configService.get<number>('FILTER_NUM_BITS', 10485760),
      this.configService.get<number>('FILTER_NUM_HASH_FUNCTIONS', 7)
    );
  }

  async onModuleInit() {
    const usernames = await this.userRepository.findAllUsernames();
    usernames.forEach((u) => this.bloomFilter.add(u.username.toLowerCase()));
  }

  async isUsernameTaken(username: string): Promise<boolean> {
    const lower = username.toLowerCase();

    if (!this.bloomFilter.test(lower)) {
      return false;
    }

    const user = await this.userRepository.findByUsername(lower);
    const taken = user !== null;

    return taken;
  }

  addToFilter(username: string) {
    this.bloomFilter.add(username.toLowerCase());
  }
}
