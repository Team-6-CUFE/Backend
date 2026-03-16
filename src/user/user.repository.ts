// users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEmail } from './entities/user-email.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
    @InjectRepository(UserEmail)
    private userEmailRepo: Repository<UserEmail>
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { user_id: id },
      relations: ['emails', 'external_profiles', 'social_accounts'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({ where: { username } });
  }

  // async create(userData: Partial<User>): Promise<User> {
  //   const user = this.repository.create(userData);
  //   return this.repository.save(user);
  // }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { emails: { email } },
      relations: ['emails'],
    });
  }

  async createUser(createUserDto: CreateUserDto, hashedPassword: string): Promise<User> {
    // Step 1 — Create user record
    const user = this.repository.create({
      username: createUserDto.username,
      password_hash: hashedPassword,
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      display_name: createUserDto.username, // display_name defaults to username
      birthdate: createUserDto.birthdate,
      gender: createUserDto.gender,
      country: createUserDto.country,
    });

    const savedUser = await this.repository.save(user);

    // Step 2 — Create email record linked to user
    const userEmail = this.userEmailRepo.create({
      email: createUserDto.email,
      user_id: savedUser.user_id, // link to the created user
      is_primary: true,
      is_verified: false,
    });
    await this.userEmailRepo.save(userEmail);
    return savedUser;
  }

  async findEmailRecord(email: string): Promise<UserEmail | null> {
    return this.userEmailRepo.findOne({ where: { email } });
  }
}
