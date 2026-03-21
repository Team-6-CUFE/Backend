import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { UsernameAvailabilityService } from './username-availability.service';
import { OAuthUser } from '../authentication/types/oauth-user.type';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly usernameAvailabilityService: UsernameAvailabilityService
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

  async createUser(createUserDto: CreateUserDto, username: string): Promise<User> {
    const hashedPassword = await this.hash_password(createUserDto.password);
    this.usernameAvailabilityService.addToFilter(username);
    return this.userRepository.createUser(createUserDto, hashedPassword, username);
  }

  async createOAuthUser(createOAuthUser: OAuthUser): Promise<User> {
    this.usernameAvailabilityService.addToFilter(createOAuthUser.username);
    return this.userRepository.createOAuthUser(createOAuthUser);
  }

  async hash_password(password: string): Promise<string> {
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
    const hashedPassword = await this.hash_password(newPassword);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  async createSocialAccount(user_id: string, provider: string, provider_id: string, email: string) {
    return this.userRepository.createSocialAccount(user_id, provider, provider_id, email);
  }

  async findSocialAccount(provider: string, providerId: string) {
    return this.userRepository.findSocialAccount(provider, providerId);
  }

  async deleteSocialAccount(provider: string, providerId: string) {
    return this.userRepository.deleteSocialAccount(provider, providerId);
  }
}
