/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FavoriteGenre } from './entities/favorite-genre.entity';
import { Genre } from '../genre/entities/genre.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEmail } from './entities/user-email.entity';
import { UserCounts } from './types/user-counts.type';
import { SocialAccount } from './entities/social-account.entity';
import { OAuthUser } from '../authentication/types/oauth-user.type';
import { SettingsService } from '../settings/settings.service';
import { mapUser, addDocuments, updateDocument, deleteDocument } from '../search/indexing';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
    @InjectRepository(FavoriteGenre)
    private favoriteGenreRepository: Repository<FavoriteGenre>,
    @InjectRepository(UserEmail)
    private userEmailRepo: Repository<UserEmail>,
    @InjectRepository(SocialAccount)
    private socialAccountRepo: Repository<SocialAccount>,
    private readonly settingsService: SettingsService
  ) {}

  async findAllUsernames(): Promise<{ username: string }[]> {
    return this.repository.find({ select: { username: true } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { userId: id },
      relations: [
        'emails',
        'externalProfiles',
        'socialAccounts',
        'favoriteGenres',
        'favoriteGenres.genre',
      ],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({
      where: { username },
      relations: [
        'emails',
        'externalProfiles',
        'socialAccounts',
        'favoriteGenres',
        'favoriteGenres.genre',
      ],
    });
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    const user = await this.findById(id);
    if (user) {
      if (user.isPublic) {
        await updateDocument(mapUser(user));
      } else if (!user.isPublic) {
        await deleteDocument(`user_${id}`);
      }
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    await deleteDocument(`user_${id}`);
  }

  async updateFavoriteGenres(userId: string, genres: Genre[]): Promise<void> {
    await this.favoriteGenreRepository.delete({ userId });
    const newEntries = genres.map((genre) =>
      this.favoriteGenreRepository.create({ userId, genreId: genre.genreId })
    );
    await this.favoriteGenreRepository.save(newEntries);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { emails: { email } },
      relations: ['emails'],
    });
  }

  async createUser(
    createUserDto: CreateUserDto,
    hashedPassword: string,
    username: string,
    city: string | null,
    country: string | null
  ): Promise<User> {
    // Step 1 — Create user record
    const user = this.repository.create({
      username,
      passwordHash: hashedPassword,
      displayName: createUserDto.displayName,
      birthdate: createUserDto.birthdate,
      gender: createUserDto.gender,
      city: city ?? undefined,
      country: country ?? undefined,
    });

    const savedUser = await this.repository.save(user);

    // Step 2 — Create email record linked to user
    const userEmail = this.userEmailRepo.create({
      email: createUserDto.email,
      userId: savedUser.userId,
      isPrimary: true,
      isVerified: false,
    });
    await this.userEmailRepo.save(userEmail);

    // Step 3 - create user settings record with defaults
    await this.settingsService.createDefaultSettings(savedUser.userId);
    if (savedUser.isPublic) {
      await addDocuments([mapUser(savedUser)]);
    }
    return savedUser;
  }

  async createOAuthUser(createOAuthUser: OAuthUser): Promise<User> {
    // Step 1 — Create user record
    const user = this.repository.create({
      username: createOAuthUser.username,
      firstName: createOAuthUser.firstName,
      lastName: createOAuthUser.lastName,
      displayName: createOAuthUser.displayName,
      birthdate: createOAuthUser.birthdate,
      gender: createOAuthUser.gender,
      city: createOAuthUser.city ?? undefined,
      country: createOAuthUser.country ?? undefined,
    });

    const savedUser = await this.repository.save(user);

    // Step 2 — Create email record linked to user
    const userEmail = this.userEmailRepo.create({
      email: createOAuthUser.email,
      userId: savedUser.userId,
      isPrimary: true,
      isVerified: true,
    });

    await this.userEmailRepo.save(userEmail);
    savedUser.emails = [userEmail];

    // Step 3 - create user settings record with defaults
    await this.settingsService.createDefaultSettings(savedUser.userId);

    return savedUser;
  }

  async findEmailRecord(email: string): Promise<UserEmail | null> {
    return this.userEmailRepo.findOne({ where: { email } });
  }

  async getUserCounts(userId: string): Promise<UserCounts> {
    const zero: UserCounts = {
      favoritesCount: 0,
      playlistCount: 0,
      trackCount: 0,
      followingsCount: 0,
      followersCount: 0,
      repostsCount: 0,
    };

    const user = await this.repository.findOne({
      where: { userId },
      select: {
        userId: true,
        favoritesCount: true,
        playlistCount: true,
        trackCount: true,
        followingsCount: true,
        followersCount: true,
        repostsCount: true,
      },
    });

    if (!user) return zero;

    return {
      favoritesCount: user.favoritesCount,
      playlistCount: user.playlistCount,
      trackCount: user.trackCount,
      followingsCount: user.followingsCount,
      followersCount: user.followersCount,
      repostsCount: user.repostsCount,
    };
  }

  async addEmail(userId: string, email: string): Promise<UserEmail> {
    const newEmail = this.userEmailRepo.create({
      email,
      userId,
      isPrimary: false,
      isVerified: false,
    });
    return this.userEmailRepo.save(newEmail);
  }

  async removeEmail(userId: string, email: string): Promise<void> {
    await this.userEmailRepo.delete({ userId, email });
  }

  async getEmails(userId: string): Promise<UserEmail[]> {
    return this.userEmailRepo.find({ where: { userId } });
  }

  async setPrimaryEmail(userId: string, email: string): Promise<void> {
    // Unset current primary email
    await this.userEmailRepo.update({ userId, isPrimary: true }, { isPrimary: false });
    // Set new primary email
    await this.userEmailRepo.update({ userId, email }, { isPrimary: true });
  }

  async getPrimaryEmail(userId: string): Promise<string | null> {
    const emailRecord = await this.userEmailRepo.findOne({
      where: {
        userId,
        isPrimary: true,
        isVerified: true,
      },
    });
    return emailRecord?.email ?? null;
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.repository.update(userId, { passwordHash: newPasswordHash });
  }

  async createSocialAccount(userId: string, provider: string, providerId: string, email: string) {
    const socialAccount = this.socialAccountRepo.create({
      providerId,
      userId,
      provider,
      providerEmail: email,
    });

    const savedSocialAccount = await this.socialAccountRepo.save(socialAccount);
    return savedSocialAccount;
  }

  async findSocialAccount(provider: string, providerId: string) {
    return this.socialAccountRepo.findOne({
      where: { provider, providerId },
    });
  }

  async deleteSocialAccount(provider: string, providerId: string) {
    return this.socialAccountRepo.delete({ provider, providerId });
  }

  async getSocialAccounts(userId: string) {
    return this.socialAccountRepo.find({ where: { userId } });
  }

  async findbyIds(ids: string[]): Promise<User[]> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.userId IN (:...ids)', { ids })
      .getMany();
  }
}
