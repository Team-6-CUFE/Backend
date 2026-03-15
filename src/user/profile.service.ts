import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { MyProfileDataDto } from './dto/my-profile-data.dto.ts';
import { PublicProfileDataDto } from './dto/public-profile.dto.js';
import { UpdateProfileReqDto } from './dto/update-profile-req.dto';
import { UpdateBirthdateReqDto } from './dto/update-birthdate.dto.js';
import { UpdateGenderReqDto } from './dto/update-gender.dto.js';
import { UpdatePrivacyReqDto } from './dto/update-privacy.dto.js';
import { UpdateProfileResDto } from './dto/update-profile-res.dto';
import { User } from './entities/user.entity';
import { GenreRepository } from '../genre/genre.repository';

@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly genreRepository: GenreRepository
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
      changes_remaining: number;
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
        birthdate: updated.birthdate.toISOString(),
        age: new Date().getFullYear() - updated.birthdate.getFullYear(),
        changes_remaining: 2, // this needs to be added to db
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

    const { favoriteGenres, ...rest } = updateProfileReqDto;
    const userData: Partial<User> = {
      ...rest,
      birthdate: updateProfileReqDto.birthdate
        ? new Date(updateProfileReqDto.birthdate)
        : undefined,
    };
    if (favoriteGenres !== undefined) {
      const genres = await this.genreRepository.findByNames(favoriteGenres);
      await this.userRepository.updateFavoriteGenres(userId, genres);
    }
    const updated = await this.userRepository.update(userId, userData);
    return {
      status: 'Success',
      message: 'Profile updated successfully',
      data: {
        ...updated!,
        favoriteGenres: updated!.favorite_genres?.map((fg) => fg.genre.name) ?? [],
      },
    };
  }

  async findProfile(username: string): Promise<{ status: string; data: PublicProfileDataDto }> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');
    const data: PublicProfileDataDto = {
      ...user,
      favorite_genres: user.favorite_genres?.map((fg) => fg.genre.name) ?? [],
      favorites_count: 0,
      playlist_count: 0,
      track_count: 0,
      followings_count: 0,
      followers_count: 0,
      reposts_count: 0,
    };
    return { status: 'Success', data };
  }

  async findMyProfile(userId: string): Promise<{ status: string; data: MyProfileDataDto }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const data: MyProfileDataDto = {
      ...user,
      email: user.emails.find((e) => e.is_primary)?.email ?? null,
      birthdate: user.birthdate?.toISOString().split('T')[0] ?? null,
      favorite_genres: user.favorite_genres?.map((fg) => fg.genre.name) ?? [],
      favorites_count: 0,
      playlist_count: 0,
      track_count: 0,
      followings_count: 0,
      followers_count: 0,
      reposts_count: 0,
    };
    return { status: 'Success', data };
  }
}
