import { Controller, Get, Post,Put, Body, Patch, Param, Delete,Request } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

//this is temporary until auth is done :)
interface AuthenticatedRequest extends Request{
  user:{
    user_id: string;
    username: string;
  };
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}


  @Get('me')
  async findMyProfile(@Request() req:AuthenticatedRequest){
    const userId:string=req.user.user_id;
    return this.profileService.findMyProfile(userId);
  }

  @Get(':username')
  async findProfile(@Param('username') username: string){
    return this.profileService.findProfile(username);
  }

  @Put('me')
  async updateMyProfile(@Request() req:AuthenticatedRequest, @Body() updateProfileDto: UpdateProfileDto){
    const userId:string=req.user.user_id;
    return this.profileService.updateMyProfile(userId,updateProfileDto);
  }
}