// users.repository.ts
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
    private socialAccountRepo: Repository<SocialAccount>
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
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
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
    return savedUser;
  }

  async createOAuthUser(createOAuthUser: OAuthUser): Promise<User> {
    // Step 1 — Create user record
    const user = this.repository.create({
      username: createOAuthUser.username,
      firstName: createOAuthUser.first_name,
      lastName: createOAuthUser.last_name,
      displayName: createOAuthUser.display_name,
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
    return savedUser;
  }

  async findEmailRecord(email: string): Promise<UserEmail | null> {
    return this.userEmailRepo.findOne({ where: { email } });
  }

  // IMPORTANT: tables used in this query dont exist yet, dont use this function yet
  async getUserCounts(userId: string): Promise<UserCounts> {
    const result = await this.repository
      .createQueryBuilder('u')
      .select('u.user_id', 'user_id')
      .addSelect(
        (qb) => qb.select('COUNT(*)').from('track_likes', 'tl').where('tl.user_id = u.user_id'),
        'favorites_count'
      )
      .addSelect(
        (qb) => qb.select('COUNT(*)').from('playlists', 'pl').where('pl.user_id = u.user_id'),
        'playlist_count'
      )
      .addSelect(
        (qb) => qb.select('COUNT(*)').from('tracks', 'tr').where('tr.user_id = u.user_id'),
        'track_count'
      )
      .addSelect(
        (qb) =>
          qb.select('COUNT(*)').from('user_follows', 'uf_ing').where('uf_ing.follower = u.user_id'),
        'followings_count'
      )
      .addSelect(
        (qb) =>
          qb.select('COUNT(*)').from('user_follows', 'uf_ed').where('uf_ed.followed = u.user_id'),
        'followers_count'
      )
      .addSelect(
        (qb) => qb.select('COUNT(*)').from('track_reposts', 'rp').where('rp.user_id = u.user_id'),
        'reposts_count'
      )
      .where('u.user_id = :userId', { userId })
      .getRawOne<Record<keyof UserCounts | 'user_id', string>>();

    const zero: UserCounts = {
      favoritesCount: 0,
      playlistCount: 0,
      trackCount: 0,
      followingsCount: 0,
      followersCount: 0,
      repostsCount: 0,
    };

    if (!result) return zero;

    return Object.fromEntries(
      (Object.keys(zero) as (keyof UserCounts)[]).map((k) => [k, parseInt(result[k], 10)])
    ) as UserCounts;
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
}
