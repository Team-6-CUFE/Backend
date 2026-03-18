import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { UsernameAvailabilityService } from './username-availability.service';

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

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hash_password(createUserDto.password);
    this.usernameAvailabilityService.addToFilter(createUserDto.username);
    return this.userRepository.createUser(createUserDto, hashedPassword);
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

  async getPrimaryEmail(userId: string): Promise<string | null> {
    return this.userRepository.getPrimaryEmail(userId);
  }
}
