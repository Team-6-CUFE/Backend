import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { FavoriteGenre } from '../../user/entities/favorite-genre.entity';

@Entity('genres')
export class Genre extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'genre_id' })
  genreId!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  // Relationship
  @OneToMany(() => FavoriteGenre, (favorite) => favorite.genre)
  favoritedBy!: FavoriteGenre[];
}
