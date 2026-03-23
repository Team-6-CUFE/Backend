import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { User } from './user.entity';
import { Genre } from '../../genre/entities/genre.entity';

@Entity('favorite_genres')
export class FavoriteGenre {
  // Composite primary key
  @PrimaryColumn({ type: 'uuid' })
  user_id!: string;

  @PrimaryColumn({ type: 'uuid' })
  genre_id!: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.favorite_genres, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Genre, (genre) => genre.favorited_by, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'genre_id' })
  genre!: Relation<Genre>;
}
