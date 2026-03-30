import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class BaseProfileDataDto {
  @Expose() userId!: string;

  @Expose() username!: string;

  @Expose() firstName!: string | null;

  @Expose() lastName!: string | null;

  @Expose() displayName!: string | null;

  @Expose() bio!: string | null;

  @Expose() avatarUrl!: string | null;

  @Expose() coverPhoto!: string | null;

  @Expose() country!: string | null;

  @Expose() city!: string | null;

  @Expose() role!: string;

  @Expose() isPublic!: boolean;

  @Expose() favoriteGenres!: string[];

  @Expose() supportLink!: string | null;

  @Expose() createdAt!: Date;

  @Expose() favoritesCount!: number;

  @Expose() playlistCount!: number;

  @Expose() trackCount!: number;

  @Expose() followingsCount!: number;

  @Expose() followersCount!: number;

  @Expose() repostsCount!: number;
}
