import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Track } from './track.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';

@Entity('tags')
export class Tag extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'tag_id' })
  tagId!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @ManyToMany(() => Track, (track) => track.tags)
  tracks!: Track[];

  @ManyToMany(() => Playlist, (playlist) => playlist.tags)
  playlists!: Playlist[];
}
