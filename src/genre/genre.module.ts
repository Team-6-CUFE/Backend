import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';
import { Genre } from './entities/genre.entity';
import { FavoriteGenre } from '../user/entities/favorite-genre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Genre, FavoriteGenre])],
  controllers: [GenreController],
  providers: [GenreService],
  exports: [GenreService],
})
export class GenreModule {}
