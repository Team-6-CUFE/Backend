import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Genre } from './entities/genre.entity';

@Injectable()
export class GenreRepository {
  constructor(
    @InjectRepository(Genre)
    private repository: Repository<Genre>
  ) {}

  async findAll(): Promise<Genre[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<Genre | null> {
    return this.repository.findOne({ where: { genre_id: id } });
  }

  async findByNames(names: string[]): Promise<Genre[]> {
    return this.repository.findBy({ name: In(names) });
  }

  async create(genreData: Partial<Genre>): Promise<Genre> {
    const genre = this.repository.create(genreData);
    return this.repository.save(genre);
  }

  async update(id: string, genreData: Partial<Genre>): Promise<Genre | null> {
    await this.repository.update(id, genreData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
