import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email address or username',
    examples: {
      email: { value: 'yara@example.com', summary: 'Login with email' },
      username: { value: 'yara_senousy', summary: 'Login with username' },
    },
  })
  @IsNotEmpty({ message: 'Email or username is required' })
  identifier!: string;

  @ApiProperty({
    description:
      'Account password. Min 8 characters, must include uppercase, lowercase, and a number.',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Minimum 8 characters.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'At least one uppercase letter, one lowercase letter, and one number.',
  })
  password!: string;
}
