import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
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
import { TrackRepository } from './user_track.repository';
import { buildPaginationResponse } from '../common/utilities/pagination.util';

const MAX_EXTERNAL_PROFILES = 10;

@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly genreRepository: GenreRepository,
    private readonly usernameAvailabilityService: UsernameAvailabilityService,
    private readonly externalProfileRepository: ExternalProfileRepository,
    private readonly trackRepository: TrackRepository
  ) {}

  async updateMyPrivacy(userId: string, updatePrivacyReqDto: UpdatePrivacyReqDto) {
    const userData: Partial<User> = { ...updatePrivacyReqDto };
    const updated = await this.userRepository.update(userId, userData);
    if (!updated) throw new NotFoundException('User not found');
    return {
      status: 'Success',
      message: 'Privacy settings updated successfully',
      data: { isPublic: updated.isPublic, updatedAt: updated.updatedAt },
    };
  }

  async updateMyGender(userId: string, updateGenderReqDto: UpdateGenderReqDto) {
    const userData: Partial<User> = { ...updateGenderReqDto };
    const updated = await this.userRepository.update(userId, userData);
    if (!updated) throw new NotFoundException('User not found');
    return {
      status: 'Success',
      message: 'Gender updated successfully',
      data: { gender: updated.gender, updatedAt: updated.updatedAt },
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
      updatedAt: Date;
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
        updatedAt: updated.updatedAt,
      },
    };
  }

  async updateProfile(userId: string, updateProfileReqDto: UpdateProfileReqDto) {
    const exists = await this.userRepository.findById(userId);
    if (!exists) throw new NotFoundException('User not found');
    const { favoriteGenres, ...rest } = updateProfileReqDto;
    const userData: Partial<User> = { ...rest };
    if (favoriteGenres !== undefined) {
      const genres = await this.genreRepository.findByNames(favoriteGenres);
      await this.userRepository.updateFavoriteGenres(userId, genres);
    }
    const updated = await this.userRepository.update(userId, userData);
    const raw = {
      ...updated!,
      favoriteGenres: updated!.favoriteGenres?.map((fg) => fg.genre.name) ?? [],
    };
    if (updateProfileReqDto.username && updated) {
      this.usernameAvailabilityService.addToFilter(updateProfileReqDto.username);
    }
    const data = plainToInstance(UpdateProfileResDto, raw, { excludeExtraneousValues: true });
    return { status: 'Success', message: 'Profile updated successfully', data };
  }

  async findProfile(username: string): Promise<{ status: string; data: PublicProfileDataDto }> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');
    const raw: PublicProfileDataDto = {
      ...user,
      favoriteGenres: user.favoriteGenres?.map((fg) => fg.genre.name) ?? [],
    };
    const data = plainToInstance(PublicProfileDataDto, raw, { excludeExtraneousValues: true });
    return { status: 'Success', data };
  }

  async findMyProfile(userId: string): Promise<{ status: string; data: MyProfileDataDto }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const raw: MyProfileDataDto = {
      ...user,
      email: user.emails.find((e) => e.isPrimary)?.email ?? null,
      birthdate: user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : null,
      favoriteGenres: user.favoriteGenres?.map((fg) => fg.genre.name) ?? [],
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
      throw new HttpException(
        {
          status: 'error',
          message: 'Validation failed',
          errors: [
            {
              field: 'general',
              message: `You can only have a maximum of ${MAX_EXTERNAL_PROFILES} external links.`,
            },
          ],
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const duplicate = await this.externalProfileRepository.findDuplicateProfile(
      userId,
      createDto.name,
      createDto.url
    );

    if (duplicate) {
      const isNameDuplicate = duplicate.name === createDto.name;
      throw new HttpException(
        {
          status: 'error',
          message: 'Validation failed',
          errors: [
            {
              field: isNameDuplicate ? 'name' : 'url',
              message: isNameDuplicate
                ? `You already have a link named ${createDto.name}.`
                : 'You already saved this exact URL.',
            },
          ],
        },
        HttpStatus.CONFLICT
      );
    }

    const profile = await this.externalProfileRepository.create(userId, {
      ...createDto,
      url: createDto.url,
    });
    return { status: 'Success', message: 'External profile added successfully', data: profile };
  }

  async updateExternalProfile(
    userId: string,
    profileId: string,
    updateDto: UpdateExternalProfileDto
  ) {
    const existing = await this.externalProfileRepository.findById(userId, profileId);

    if (!existing) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Resource not found',
          errors: [
            {
              field: 'profileId',
              message: 'External profile not found.',
            },
          ],
        },
        HttpStatus.NOT_FOUND
      );
    }

    if (updateDto.name || updateDto.url) {
      const checkName = updateDto.name || existing.name;
      const checkUrl = updateDto.url || existing.url;

      const duplicate = await this.externalProfileRepository.findDuplicateProfile(
        userId,
        checkName,
        checkUrl
      );

      if (duplicate && duplicate.id !== profileId) {
        const isNameDuplicate = duplicate.name === checkName;
        throw new HttpException(
          {
            status: 'error',
            message: 'Validation failed',
            errors: [
              {
                field: isNameDuplicate ? 'name' : 'url',
                message: isNameDuplicate
                  ? `You already have a link named ${checkName}.`
                  : 'You already saved this exact URL.',
              },
            ],
          },
          HttpStatus.CONFLICT
        );
      }
    }

    const updated = await this.externalProfileRepository.update(profileId, {
      ...updateDto,
    });

    return { status: 'Success', message: 'External profile updated successfully', data: updated };
  }

  async deleteExternalProfile(userId: string, profileId: string) {
    const existing = await this.externalProfileRepository.findById(userId, profileId);
    if (!existing) throw new NotFoundException('External profile not found');

    await this.externalProfileRepository.delete(profileId);
    return { status: 'Success', message: 'External profile deleted successfully' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    // We match your existing pattern of using Partial<User>
    const userData: Partial<User> = { avatarUrl } as any;
    const updated = await this.userRepository.update(userId, userData);

    if (!updated) throw new NotFoundException('User not found');

    return {
      status: 'Success',
      message: 'Profile picture updated successfully',
      data: {
        avatarUrl,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async updateCover(userId: string, coverPhotoUrl: string) {
    const userData: Partial<User> = { coverPhoto: coverPhotoUrl } as any;
    const updated = await this.userRepository.update(userId, userData);

    if (!updated) throw new NotFoundException('User not found');

    return {
      status: 'Success',
      message: 'Cover photo updated successfully',
      data: {
        coverPhoto: coverPhotoUrl,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async getRecentlyPlayed(userId: string) {
    const data = await this.trackRepository.findByUser(userId);
    return { status: 'success', data };
  }

  async getListeningHistory(userId: string, page: number = 1, limit: number = 10) {
    const cappedLimit = Math.min(limit, 50);
    const [history, total] = await this.trackRepository.getListeningHistory(
      userId,
      page,
      cappedLimit
    );
    const mappedHistory = history.map((play) => ({
      track_play_id: play.trackPlayId,
      playedAt: play.playedAt,
      track: {
        trackId: play.track.trackId,
        title: play.track.title,
        coverImage: play.track.coverImage,
        durationSeconds: play.track.durationSeconds,
        tags: play.track.tags?.map((t) => t.name) || [],
        likesCount: play.track.likesCount,
        repostsCount: play.track.repostsCount,
        playCount: play.track.playCount,
        commentsCount: play.track.commentsCount,
        owner: {
          userId: play.track.user.userId,
          username: play.track.user.username,
          displayName: play.track.user.displayName,
        },
      },
    }));
    return {
      status: 'success',
      ...buildPaginationResponse(mappedHistory, total, page, cappedLimit),
    };
  }

  async deleteUserHistory(userId: string) {
    await this.trackRepository.deleteUserHistory(userId);
    return {
      status: 'success',
      message: 'Listening history and Recently Played cleared successfully',
    };
  }
}
