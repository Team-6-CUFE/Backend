import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Playlist } from './playlist.entity';
import { Genre } from '../../genre/entities/genre.entity';

@Entity('playlist_tags')
export class PlaylistTag {
  @PrimaryColumn({ name: 'playlist_id', type: 'uuid' })
  playlistId!: string;

  @PrimaryColumn({ name: 'tag_id', type: 'uuid' })
  tagId!: string;

  @ManyToOne(() => Playlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Playlist;

  @ManyToOne(() => Genre, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag!: Genre;
}
