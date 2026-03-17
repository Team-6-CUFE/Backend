import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email or Profile Link is required' })
  credential!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Invalid password.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Invalid password.',
  })
  password!: string;
}
