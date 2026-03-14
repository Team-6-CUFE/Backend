import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from '../../user/dto/create-user.dto';

export class RegisterDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'CAPTCHA token is required' })
  captchaToken!: string;
}
