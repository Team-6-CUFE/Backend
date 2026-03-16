import { IsString, IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';

export class CheckUsernameDto {
  @IsNotEmpty({ message: 'Username parameter is required' })
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be between 3 and 50 characters' })
  @MaxLength(50, { message: 'Username must be between 3 and 50 characters' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message:
      'Username must start with a letter and can only contain letters, numbers, and underscores',
  })
  @Matches(/^(?!.*_{2,})/, { message: 'Username cannot contain consecutive underscores' })
  username!: string;
}
