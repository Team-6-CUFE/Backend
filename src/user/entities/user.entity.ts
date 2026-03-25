import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserEmail } from './user-email.entity';
import { ExternalProfile } from './external-profile.entity';
import { SocialAccount } from './social-account.entity';
import { FavoriteGenre } from './favorite-genre.entity';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { PlaylistLike } from '../../playlist/entities/playlist-likes';
import { PlaylistRepost } from '../../playlist/entities/playlist-reposts';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  user_id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  display_name!: string;

  @Column({ type: 'date', nullable: true })
  birthdate!: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover_photo!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string;

  @Column({ type: 'varchar', length: 20, default: 'listener' })
  role!: string; // 'listener' | 'artist' | 'admin'

  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan!: string; // 'free' | 'pro' | 'premium'

  @Column({ type: 'boolean', default: true })
  is_public!: boolean;

  @Column({ type: 'boolean', default: false })
  is_suspended!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  suspension_reason!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  support_link!: string;

  // Relationships
  @OneToMany(() => UserEmail, (email) => email.user)
  emails!: UserEmail[];

  @OneToMany(() => ExternalProfile, (profile) => profile.user)
  external_profiles!: ExternalProfile[];

  @OneToMany(() => SocialAccount, (account) => account.user)
  social_accounts!: SocialAccount[];

  @OneToMany(() => FavoriteGenre, (favorite) => favorite.user)
  favorite_genres!: FavoriteGenre[];

  @OneToMany(() => Playlist, (playlist) => playlist.user)
  playlists!: Playlist[];

  @OneToMany(() => PlaylistLike, (like) => like.user)
  liked_playlists!: PlaylistLike[];

  @OneToMany(() => PlaylistRepost, (repost) => repost.user)
  reposted_playlists!: PlaylistRepost[];
}
