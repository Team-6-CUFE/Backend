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

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
    @InjectRepository(FavoriteGenre)
    private favoriteGenreRepository: Repository<FavoriteGenre>,
    @InjectRepository(UserEmail)
    private userEmailRepo: Repository<UserEmail>
  ) {}

  async findAllUsernames(): Promise<{ username: string }[]> {
    return this.repository.find({ select: { username: true } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { user_id: id },
      relations: [
        'emails',
        'external_profiles',
        'social_accounts',
        'favorite_genres',
        'favorite_genres.genre',
      ],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({
      where: { username },
      relations: [
        'emails',
        'external_profiles',
        'social_accounts',
        'favorite_genres',
        'favorite_genres.genre',
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
    await this.favoriteGenreRepository.delete({ user_id: userId });
    const newEntries = genres.map((genre) =>
      this.favoriteGenreRepository.create({ user_id: userId, genre_id: genre.genre_id })
    );
    await this.favoriteGenreRepository.save(newEntries);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { emails: { email } },
      relations: ['emails'],
    });
  }

  async createUser(createUserDto: CreateUserDto, hashedPassword: string): Promise<User> {
    // Step 1 — Create user record
    const user = this.repository.create({
      username: createUserDto.username,
      password_hash: hashedPassword,
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      display_name: createUserDto.username, // display_name defaults to username
      birthdate: createUserDto.birthdate,
      gender: createUserDto.gender,
      country: createUserDto.country,
    });

    const savedUser = await this.repository.save(user);

    // Step 2 — Create email record linked to user
    const userEmail = this.userEmailRepo.create({
      email: createUserDto.email,
      user_id: savedUser.user_id, // link to the created user
      is_primary: true,
      is_verified: false,
    });
    await this.userEmailRepo.save(userEmail);
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
      favorites_count: 0,
      playlist_count: 0,
      track_count: 0,
      followings_count: 0,
      followers_count: 0,
      reposts_count: 0,
    };

    if (!result) return zero;

    return Object.fromEntries(
      (Object.keys(zero) as (keyof UserCounts)[]).map((k) => [k, parseInt(result[k], 10)])
    ) as UserCounts;
  }

  async addEmail(userId: string, email: string): Promise<UserEmail> {
    const newEmail = this.userEmailRepo.create({
      email,
      user_id: userId,
      is_primary: false,
      is_verified: false,
    });
    return this.userEmailRepo.save(newEmail);
  }

  async removeEmail(userId: string, email: string): Promise<void> {
    await this.userEmailRepo.delete({ user_id: userId, email });
  }

  async getEmails(userId: string): Promise<UserEmail[]> {
    return this.userEmailRepo.find({ where: { user_id: userId } });
  }
}
