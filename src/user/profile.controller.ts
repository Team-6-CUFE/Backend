import { Controller, Get, Put, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileReqDto } from './dto/update-profile-req.dto';
import { UpdateBirthdateReqDto } from './dto/update-birthdate.dto';
import { UpdateGenderReqDto } from './dto/update-gender.dto';
import { UpdatePrivacyReqDto } from './dto/update-privacy.dto';
import { CheckUsernameDto } from './dto/check-username.dto';
import { Public } from '../authentication/decorators/public.decorator';
import { CurrentUser } from '../authentication/decorators/current-user.decorator';
import { CreateExternalProfileDto } from './dto/create-external-profile.dto';
import { UpdateExternalProfileDto } from './dto/update-external-profile.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateCoverDto } from './dto/update-cover.dto';
import {
  ApiGetMyProfile,
  ApiGetProfile,
  ApiUpdateProfile,
  ApiUpdateBirthdate,
  ApiUpdateGender,
  ApiUpdatePrivacy,
  ApiCheckUsername,
} from './profile.swagger';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiGetMyProfile()
  @Get('me')
  async findMyProfile(@CurrentUser('sub') userId: string) {
    return this.profileService.findMyProfile(userId);
  }

  @ApiCheckUsername()
  @Get('check-username')
  async isUsernameTaken(@Query() checkUsernameDto: CheckUsernameDto) {
    return this.profileService.isUsernameTaken(checkUsernameDto.username);
  }

  @ApiGetProfile()
  @Public()
  @Get(':username')
  async findProfile(@Param('username') username: string) {
    return this.profileService.findProfile(username);
  }

  @ApiUpdateProfile()
  @Put('me')
  async updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateProfileReqDto: UpdateProfileReqDto
  ) {
    return this.profileService.updateProfile(userId, updateProfileReqDto);
  }

  @ApiUpdateBirthdate()
  @Put('me/birthdate')
  async updateMyBirthdate(
    @CurrentUser('sub') userId: string,
    @Body() updateBirthdateReqDto: UpdateBirthdateReqDto
  ) {
    return this.profileService.updateMyBirthdate(userId, updateBirthdateReqDto);
  }

  @ApiUpdateGender()
  @Put('me/gender')
  async updateMyGender(
    @CurrentUser('sub') userId: string,
    @Body() updateGenderReqDto: UpdateGenderReqDto
  ) {
    return this.profileService.updateMyGender(userId, updateGenderReqDto);
  }

  @ApiUpdatePrivacy()
  @Put('me/privacy')
  async updateMyPrivacy(
    @CurrentUser('sub') userId: string,
    @Body() updatePrivacyReqDto: UpdatePrivacyReqDto
  ) {
    return this.profileService.updateMyPrivacy(userId, updatePrivacyReqDto);
  }

  @Get('me/external-profiles')
  async getMyExternalProfiles(@CurrentUser('sub') userId: string) {
    return this.profileService.getMyExternalProfiles(userId);
  }

  @Post('me/external-profiles')
  async addExternalProfile(
    @CurrentUser('sub') userId: string,
    @Body() createExternalProfileDto: CreateExternalProfileDto
  ) {
    return this.profileService.addExternalProfile(userId, createExternalProfileDto);
  }

  @Patch('me/external-profiles/:id')
  async updateExternalProfile(
    @CurrentUser('sub') userId: string,
    @Param('id') profileId: string,
    @Body() updateExternalProfileDto: UpdateExternalProfileDto
  ) {
    return this.profileService.updateExternalProfile(userId, profileId, updateExternalProfileDto);
  }

  @Delete('me/external-profiles/:id')
  async deleteExternalProfile(@CurrentUser('sub') userId: string, @Param('id') profileId: string) {
    return this.profileService.deleteExternalProfile(userId, profileId);
  }

  @Put('me/avatar')
  async updateAvatar(@CurrentUser('sub') userId: string, @Body() updateAvatarDto: UpdateAvatarDto) {
    return this.profileService.updateAvatar(userId, updateAvatarDto.avatarUrl);
  }

  @Put('me/cover')
  async updateCover(@CurrentUser('sub') userId: string, @Body() updateCoverDto: UpdateCoverDto) {
    return this.profileService.updateCover(userId, updateCoverDto.coverPhoto);
  }
}
