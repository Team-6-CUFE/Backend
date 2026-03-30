import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { User } from './user.entity';
import { Genre } from '../../genre/entities/genre.entity';

@Entity('favorite_genres')
export class FavoriteGenre {
  // Composite primary key
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'genre_id' })
  genreId!: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.favoriteGenres, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Genre, (genre) => genre.favoritedBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'genre_id' })
  genre!: Relation<Genre>;
}
