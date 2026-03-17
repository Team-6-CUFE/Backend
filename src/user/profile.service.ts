import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UserRepository } from './user.repository';
import { MyProfileDataDto } from './dto/my-profile-data.dto.ts';
import { PublicProfileDataDto } from './dto/public-profile.dto';
import { UpdateProfileReqDto } from './dto/update-profile-req.dto';
import { UpdateBirthdateReqDto } from './dto/update-birthdate.dto';
import { UpdateGenderReqDto } from './dto/update-gender.dto';
import { UpdatePrivacyReqDto } from './dto/update-privacy.dto';
import { UpdateProfileResDto } from './dto/update-profile-res.dto';
import { User } from './entities/user.entity';
import { GenreRepository } from '../genre/genre.repository';
import { UsernameAvailabilityService } from './username-availability.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly genreRepository: GenreRepository,
    private readonly usernameAvailabilityService: UsernameAvailabilityService
  ) {}

  async updateMyPrivacy(
    userId: string,
    updatePrivacyReqDto: UpdatePrivacyReqDto
  ): Promise<{
    status: string;
    message: string;
    data: {
      is_public: boolean;
      updated_at: Date;
    };
  }> {
    const userData: Partial<User> = { ...updatePrivacyReqDto };
    const updated = await this.userRepository.update(userId, userData);

    if (!updated) throw new NotFoundException('User not found');

    return {
      status: 'Success',
      message: 'Privacy settings updated successfully',
      data: {
        is_public: updated.is_public,
        updated_at: updated.updated_at,
      },
    };
  }

  async updateMyGender(
    userId: string,
    updateGenderReqDto: UpdateGenderReqDto
  ): Promise<{
    status: string;
    message: string;
    data: {
      gender: string;
      updated_at: Date;
    };
  }> {
    const userData: Partial<User> = { ...updateGenderReqDto };
    const updated = await this.userRepository.update(userId, userData);

    if (!updated) throw new NotFoundException('User not found');

    return {
      status: 'Success',
      message: 'Gender updated successfully',
      data: {
        gender: updated.gender,
        updated_at: updated.updated_at,
      },
    };
  }

  async updateMyBirthdate(
    userId: string,
    updateBirthdateReqDto: UpdateBirthdateReqDto
  ): Promise<{
    status: string;
    message: string;
    data: {
      birthdate: string;
      age: number;
      updated_at: Date;
    };
  }> {
    const userData: Partial<User> = { birthdate: new Date(updateBirthdateReqDto.birthdate) };
    const updated = await this.userRepository.update(userId, userData);

    if (!updated) throw new NotFoundException('User not found');

    return {
      status: 'Success',
      message: 'Birthdate updated successfully',
      data: {
        birthdate: new Date(updated.birthdate).toISOString().split('T')[0],
        age: new Date().getFullYear() - new Date(updated.birthdate).getFullYear(),
        updated_at: updated.updated_at,
      },
    };
  }

  async updateProfile(
    userId: string,
    updateProfileReqDto: UpdateProfileReqDto
  ): Promise<{ status: string; message: string; data: UpdateProfileResDto }> {
    const exists = await this.userRepository.findById(userId);
    if (!exists) throw new NotFoundException('User not found');

    const { favorite_genres: favoriteGenres, ...rest } = updateProfileReqDto;
    const userData: Partial<User> = { ...rest };
    if (favoriteGenres !== undefined) {
      const genres = await this.genreRepository.findByNames(favoriteGenres);
      await this.userRepository.updateFavoriteGenres(userId, genres);
    }
    const updated = await this.userRepository.update(userId, userData);
    const raw = {
      ...updated!,
      favorite_genres: updated!.favorite_genres?.map((fg) => fg.genre.name) ?? [],
    };
    if (updateProfileReqDto.username && updated) {
      this.usernameAvailabilityService.addToFilter(updateProfileReqDto.username);
    }
    const data = plainToInstance(UpdateProfileResDto, raw, { excludeExtraneousValues: true });
    return {
      status: 'Success',
      message: 'Profile updated successfully',
      data,
    };
  }

  // TODO: switch out mock counts for service function call
  async findProfile(username: string): Promise<{ status: string; data: PublicProfileDataDto }> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');
    const raw: PublicProfileDataDto = {
      ...user,
      favorite_genres: user.favorite_genres?.map((fg) => fg.genre.name) ?? [],
      favorites_count: 0,
      playlist_count: 0,
      track_count: 0,
      followings_count: 0,
      followers_count: 0,
      reposts_count: 0,
    };
    const data = plainToInstance(PublicProfileDataDto, raw, { excludeExtraneousValues: true });
    return { status: 'Success', data };
  }

  // TODO: switch out mock counts for service function call
  async findMyProfile(userId: string): Promise<{ status: string; data: MyProfileDataDto }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const raw: MyProfileDataDto = {
      ...user,
      email: user.emails.find((e) => e.is_primary)?.email ?? null,
      birthdate: user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : null,
      favorite_genres: user.favorite_genres?.map((fg) => fg.genre.name) ?? [],
      favorites_count: 0,
      playlist_count: 0,
      track_count: 0,
      followings_count: 0,
      followers_count: 0,
      reposts_count: 0,
    };
    const data = plainToInstance(MyProfileDataDto, raw, { excludeExtraneousValues: true });
    return { status: 'Success', data };
  }

  async isUsernameTaken(username: string): Promise<{
    status: string;
    data: {
      username: string;
      available: boolean;
      message: string;
    };
  }> {
    const taken = await this.usernameAvailabilityService.isUsernameTaken(username);
    return {
      status: 'success',
      data: {
        username,
        available: !taken,
        message: taken ? 'Username is already taken' : 'Username is available',
      },
    };
  }
}
