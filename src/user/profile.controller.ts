import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileReqDto } from './dto/update-profile-req.dto';
import { UpdateBirthdateReqDto } from './dto/update-birthdate.dto';
import { UpdateGenderReqDto } from './dto/update-gender.dto';
import { UpdatePrivacyReqDto } from './dto/update-privacy.dto';
import { CheckUsernameDto } from './dto/check-username.dto';
import { Public } from '../authentication/decorators/public.decorator';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async findMyProfile(@CurrentUser('sub') userId: string) {
    return this.profileService.findMyProfile(userId);
  }

  @Get('check-username')
  async isUsernameTaken(@Query() checkUsernameDto: CheckUsernameDto) {
    return this.profileService.isUsernameTaken(checkUsernameDto.username);
  }

  @Public()
  @Get(':username')
  async findProfile(@Param('username') username: string) {
    return this.profileService.findProfile(username);
  }

  @Put('me')
  async updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateProfileReqDto: UpdateProfileReqDto
  ) {
    return this.profileService.updateProfile(userId, updateProfileReqDto);
  }

  @Put('me/birthdate')
  async updateMyBirthdate(
    @CurrentUser('sub') userId: string,
    @Body() updateBirthdateReqDto: UpdateBirthdateReqDto
  ) {
    return this.profileService.updateMyBirthdate(userId, updateBirthdateReqDto);
  }

  @Put('me/gender')
  async updateMyGender(
    @CurrentUser('sub') userId: string,
    @Body() updateGenderReqDto: UpdateGenderReqDto
  ) {
    return this.profileService.updateMyGender(userId, updateGenderReqDto);
  }

  @Put('me/privacy')
  async updateMyPrivacy(
    @CurrentUser('sub') userId: string,
    @Body() updatePrivacyReqDto: UpdatePrivacyReqDto
  ) {
    return this.profileService.updateMyPrivacy(userId, updatePrivacyReqDto);
  }
}
