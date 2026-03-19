import { IsNotEmpty, IsEmail } from 'class-validator';

export class EmailDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;
}
