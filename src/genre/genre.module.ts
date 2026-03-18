import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';
import { Genre } from './entities/genre.entity';
import { FavoriteGenre } from '../user/entities/favorite-genre.entity';
import { GenreRepository } from './genre.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Genre, FavoriteGenre])],
  controllers: [GenreController],
  providers: [GenreService, GenreRepository],
  exports: [GenreService, GenreRepository],
})
export class GenreModule {}
