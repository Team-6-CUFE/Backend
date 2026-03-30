import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { UsernameAvailabilityService } from './username-availability.service';
import { OAuthUser } from '../authentication/types/oauth-user.type';
import { buildPaginationResponse } from '../common/utilities/pagination.util';
import { TrackService } from '../track/track.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly usernameAvailabilityService: UsernameAvailabilityService,
    private readonly trackService: TrackService
  ) {}

  async remove(id: string) {
    return this.userRepository.delete(id);
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    return this.usernameAvailabilityService.isUsernameTaken(username);
  }

  async checkEmailExists(email: string): Promise<boolean> {
    return this.userRepository.findByEmail(email).then((user) => !!user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async createUser(
    createUserDto: CreateUserDto,
    username: string,
    city: string | null,
    country: string | null
  ): Promise<User> {
    const hashedPassword = await this.hashPassword(createUserDto.password);
    this.usernameAvailabilityService.addToFilter(username);
    return this.userRepository.createUser(createUserDto, hashedPassword, username, city, country);
  }

  async createOAuthUser(createOAuthUser: OAuthUser): Promise<User> {
    this.usernameAvailabilityService.addToFilter(createOAuthUser.username);
    return this.userRepository.createOAuthUser(createOAuthUser);
  }

  async hashPassword(password: string): Promise<string> {
    const saltrounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltrounds);
    return hashedPassword;
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async findEmailRecord(email: string): Promise<UserEmail | null> {
    return this.userRepository.findEmailRecord(email);
  }

  async addEmail(userId: string, email: string): Promise<UserEmail> {
    return this.userRepository.addEmail(userId, email);
  }

  async removeEmail(userId: string, email: string): Promise<void> {
    return this.userRepository.removeEmail(userId, email);
  }

  async getEmails(userId: string): Promise<UserEmail[]> {
    return this.userRepository.getEmails(userId);
  }

  async setPrimaryEmail(userId: string, email: string): Promise<void> {
    return this.userRepository.setPrimaryEmail(userId, email);
  }

  async getPrimaryEmail(userId: string): Promise<string | null> {
    return this.userRepository.getPrimaryEmail(userId);
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  async createSocialAccount(userId: string, provider: string, providerId: string, email: string) {
    return this.userRepository.createSocialAccount(userId, provider, providerId, email);
  }

  async findSocialAccount(provider: string, providerId: string) {
    return this.userRepository.findSocialAccount(provider, providerId);
  }

  async deleteSocialAccount(provider: string, providerId: string) {
    return this.userRepository.deleteSocialAccount(provider, providerId);
  }

  async getSocialAccounts(userId: string) {
    return this.userRepository.getSocialAccounts(userId);
  }

  async getUserTrackReposts(
    userId: string,
    myUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isPublic && user.userId !== myUserId) {
      throw new ForbiddenException('This account is private');
    }

    const cappedLimit = Math.min(limit, 100); // Cap limit to 100
    const [reposts, total] = await this.trackService.getUserTrackReposts(userId, page, cappedLimit);
    const mappedReposts = reposts.map((repost) => ({
      trackId: repost.track.trackId,
      title: repost.track.title,
      coverImage: repost.track.coverImage,
      durationSeconds: repost.track.durationSeconds,
      playCount: repost.track.playCount,
      repostsCount: repost.track.repostsCount,
      artist: {
        userId: repost.track.user.user_id,
        username: repost.track.user.username,
        displayName: repost.track.user.display_name,
      },
      caption: repost.caption,
      repostedAt: repost.createdAt,
    }));
    return buildPaginationResponse(mappedReposts, total, page, limit);
  }
}
