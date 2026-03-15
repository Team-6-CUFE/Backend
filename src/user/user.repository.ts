// users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FavoriteGenre } from './entities/favorite-genre.entity';
import { Genre } from '../genre/entities/genre.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
    @InjectRepository(FavoriteGenre)
    private favoriteGenreRepository: Repository<FavoriteGenre>
  ) {}

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
    return this.repository.findOne({ where: { username } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
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
}
