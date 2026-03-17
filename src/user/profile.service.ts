import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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
import { CreateExternalProfileDto } from './dto/create-external-profile.dto';
import { UpdateExternalProfileDto } from './dto/update-external-profile.dto';
import { ExternalProfileRepository } from './external-profile.repository';

const MAX_EXTERNAL_PROFILES = 10;

@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly genreRepository: GenreRepository,
    private readonly usernameAvailabilityService: UsernameAvailabilityService,
    private readonly externalProfileRepository: ExternalProfileRepository
  ) {}

  async updateMyPrivacy(userId: string, updatePrivacyReqDto: UpdatePrivacyReqDto) {
    const userData: Partial<User> = { ...updatePrivacyReqDto };
    const updated = await this.userRepository.update(userId, userData);
    if (!updated) throw new NotFoundException('User not found');
    return {
      status: 'Success',
      message: 'Privacy settings updated successfully',
      data: { is_public: updated.is_public, updated_at: updated.updated_at },
    };
  }

  async updateMyGender(userId: string, updateGenderReqDto: UpdateGenderReqDto) {
    const userData: Partial<User> = { ...updateGenderReqDto };
    const updated = await this.userRepository.update(userId, userData);
    if (!updated) throw new NotFoundException('User not found');
    return {
      status: 'Success',
      message: 'Gender updated successfully',
      data: { gender: updated.gender, updated_at: updated.updated_at },
    };
  }

  async updateMyBirthdate(userId: string, updateBirthdateReqDto: UpdateBirthdateReqDto) {
    const userData: Partial<User> = { birthdate: new Date(updateBirthdateReqDto.birthdate) };
    const updated = await this.userRepository.update(userId, userData);
    if (!updated) throw new NotFoundException('User not found');
    return {
      status: 'Success',
      message: 'Birthdate updated successfully',
      data: {
        birthdate: new Date(updated.birthdate).toISOString().split('T')[0],
        age: new Date().getFullYear() - new Date(updated.birthdate).getFullYear(),
        changes_remaining: 2,
        updated_at: updated.updated_at,
      },
    };
  }

  async updateProfile(userId: string, updateProfileReqDto: UpdateProfileReqDto) {
    const exists = await this.userRepository.findById(userId);
    if (!exists) throw new NotFoundException('User not found');
    const { favorite_genres: favoriteGenres, ...rest } = updateProfileReqDto;
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
    const raw = {
      ...updated!,
      favorite_genres: updated!.favorite_genres?.map((fg) => fg.genre.name) ?? [],
    };
    const data = plainToInstance(UpdateProfileResDto, raw, { excludeExtraneousValues: true });
    return { status: 'Success', message: 'Profile updated successfully', data };
  }

  async findProfile(username: string) {
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

  async findMyProfile(userId: string) {
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

  async isUsernameTaken(username: string) {
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

  async getMyExternalProfiles(userId: string) {
    const data = await this.externalProfileRepository.findAllByUserId(userId);
    return { status: 'Success', data };
  }

  async addExternalProfile(userId: string, createDto: CreateExternalProfileDto) {
    const profileCount = await this.externalProfileRepository.countUserProfiles(userId);
    if (profileCount >= MAX_EXTERNAL_PROFILES) {
      throw new BadRequestException(
        `You can only have a maximum of ${MAX_EXTERNAL_PROFILES} external links.`
      );
    }

    const duplicate = await this.externalProfileRepository.findDuplicateProfile(
      userId,
      createDto.name,
      createDto.url
    );
    if (duplicate) {
      const message =
        duplicate.name === createDto.name
          ? `You already have a link named "${createDto.name}".`
          : 'You already saved this exact URL.';
      throw new ConflictException(message);
    }

    let finalUrl = createDto.url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    const profile = await this.externalProfileRepository.create(userId, {
      ...createDto,
      url: finalUrl,
    });
    return { status: 'Success', message: 'External profile added successfully', data: profile };
  }

  async updateExternalProfile(
    userId: string,
    profileId: string,
    updateDto: UpdateExternalProfileDto
  ) {
    const existing = await this.externalProfileRepository.findById(userId, profileId);
    if (!existing) throw new NotFoundException('External profile not found');

    const updateData = { ...updateDto };

    if (updateData.name || updateData.url) {
      const checkName = updateData.name || existing.name;
      const checkUrl = updateData.url || existing.url;
      const duplicate = await this.externalProfileRepository.findDuplicateProfile(
        userId,
        checkName,
        checkUrl
      );

      if (duplicate && duplicate.id !== profileId) {
        throw new ConflictException('Another profile already uses this name or URL.');
      }
    }

    if (updateData.url && !updateData.url.startsWith('http')) {
      updateData.url = `https://${updateData.url}`;
    }

    const updated = await this.externalProfileRepository.update(profileId, updateData);
    if (!updated) throw new NotFoundException('Failed to update profile');

    return {
      status: 'Success',
      message: 'External profile updated successfully',
      data: updated,
    };
  }

  async deleteExternalProfile(userId: string, profileId: string) {
    const existing = await this.externalProfileRepository.findById(userId, profileId);
    if (!existing) throw new NotFoundException('External profile not found');

    await this.externalProfileRepository.delete(profileId);
    return { status: 'Success', message: 'External profile deleted successfully' };
  }
}
