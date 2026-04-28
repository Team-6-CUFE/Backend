import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { UserService } from '../user/user.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userService: UserService
  ) {}

  async getUsers(limit: number, offset: number, search?: string) {
    const [users, total] = await this.adminRepository.findAllUsers(limit, offset, search);
    return { users, total };
  }

  async suspendUser(userId: string, reason: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    await this.adminRepository.updateUserSuspensionStatus(userId, true, reason);
  }

  async reactivateUser(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Set isSuspended to false and clear the reason
    await this.adminRepository.updateUserSuspensionStatus(userId, false, null);
  }
}
