import { Controller, Get, Put, Body, Param, Request } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileReqDto } from './dto/update-profile-req.dto';
import { UpdateBirthdateReqDto } from './dto/update-birthdate.dto';
import { UpdateGenderReqDto } from './dto/update-gender.dto';
import { UpdatePrivacyReqDto } from './dto/update-privacy.dto';

// this is temporary until auth is done :)
interface AuthenticatedRequest extends Request {
  user: {
    user_id: string;
    username: string;
  };
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async findMyProfile(@Request() req: AuthenticatedRequest) {
    const userId: string = req.user.user_id;
    return this.profileService.findMyProfile(userId);
  }

  @Get(':username')
  async findProfile(@Param('username') username: string) {
    return this.profileService.findProfile(username);
  }

  @Put('me')
  async updateMyProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileReqDto: UpdateProfileReqDto
  ) {
    const userId: string = req.user.user_id;
    return this.profileService.updateProfile(userId, updateProfileReqDto);
  }

  @Put('me/birthdate')
  async updateMyBirthdate(
    @Request() req: AuthenticatedRequest,
    @Body() updateBirthdateReqDto: UpdateBirthdateReqDto
  ) {
    const userId: string = req.user.user_id;
    return this.profileService.updateMyBirthdate(userId, updateBirthdateReqDto);
  }

  @Put('me/gender')
  async updateMyGender(
    @Request() req: AuthenticatedRequest,
    @Body() updateGenderReqDto: UpdateGenderReqDto
  ) {
    const userId: string = req.user.user_id;
    return this.profileService.updateMyGender(userId, updateGenderReqDto);
  }

  @Put('me/privacy')
  async updateMyPrivacy(
    @Request() req: AuthenticatedRequest,
    @Body() updatePrivacyReqDto: UpdatePrivacyReqDto
  ) {
    const userId: string = req.user.user_id;
    return this.profileService.updateMyPrivacy(userId, updatePrivacyReqDto);
  }
}
