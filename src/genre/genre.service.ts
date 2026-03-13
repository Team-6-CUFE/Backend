import { Injectable } from '@nestjs/common';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Injectable()
export class GenreService {
  create(createGenreDto: CreateGenreDto) {
    return `This action adds a new genre with the following data: ${JSON.stringify(createGenreDto)}`;
  }

  findAll() {
    return `This action returns all genre`;
  }

  findOne(id: number) {
    return `This action returns a #${id} genre`;
  }

  update(id: number, updateGenreDto: UpdateGenreDto) {
    return `This action updates a #${id} genre with the following data: ${JSON.stringify(
      updateGenreDto
    )}`;
  }

  remove(id: number) {
    return `This action removes a #${id} genre`;
  }
}
