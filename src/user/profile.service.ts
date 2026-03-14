import { Injectable } from '@nestjs/common';
import { MyProfileDataDto } from './dto/my-profile-data.dto.ts';
import { PublicProfileDataDto } from './dto/public-profile.dto.js';
import { UpdateProfileReqDto } from './dto/update-profile-req.dto';
import { UpdateBirthdateReqDto } from './dto/update-birthdate.dto.js';
import { UpdateGenderReqDto } from './dto/update-gender.dto.js';
import { UpdatePrivacyReqDto } from './dto/update-privacy.dto.js';

@Injectable()
export class ProfileService {
  updateMyPrivacy(userId: string, updatePrivacyReqDto: UpdatePrivacyReqDto) {
    return `This action updates a #${userId} user${JSON.stringify(updatePrivacyReqDto)}`;
  }

  updateMyGender(userId: string, updateGenderReqDto: UpdateGenderReqDto) {
    return `This action updates a #${userId} user${JSON.stringify(updateGenderReqDto)}`;
  }

  updateMyBirthdate(userId: string, updateBirthdateReqDto: UpdateBirthdateReqDto) {
    return `This action updates a #${userId} user${JSON.stringify(updateBirthdateReqDto)}`;
  }

  updateMyProfile(userId: string, updateProfileReqDto: UpdateProfileReqDto) {
    return `This action updates a #${userId} user${JSON.stringify(updateProfileReqDto)}`;
  }

  findProfile(username: string) {
    return `This action returns a #${username} user${JSON.stringify(new PublicProfileDataDto())}`;
  }

  findMyProfile(userId: string) {
    return `This action returns a #${userId} user${JSON.stringify(new MyProfileDataDto())}`;
  }
}
