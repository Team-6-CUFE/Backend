import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class UpdateProfileResDto {
  @Expose() userId!: string;

  @Expose() username!: string;

  @Expose() firstName?: string | null;

  @Expose() lastName?: string | null;

  @Expose() displayName?: string | null;

  @Expose() bio?: string | null;

  @Expose() country?: string | null;

  @Expose() city?: string | null;

  @Expose() gender?: string | null;

  @Expose() favoriteGenres!: string[];

  @Expose() supportLink?: string | null;

  @Expose() isPublic!: boolean;

  @Expose() updatedAt!: Date;
}
