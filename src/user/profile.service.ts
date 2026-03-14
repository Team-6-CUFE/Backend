import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  updateMyProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    throw new Error('Method not implemented.');
  }
  findProfile(username: string) {
    throw new Error('Method not implemented.');
  }

  findMyProfile(userId: any) {
    throw new Error('Method not implemented.');
  }
}