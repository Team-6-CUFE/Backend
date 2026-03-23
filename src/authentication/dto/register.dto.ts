import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from '../../user/dto/create-user.dto';

export class RegisterDto extends CreateUserDto {
  @ApiProperty({
    description: 'CAPTCHA token from the frontend CAPTCHA widget',
    example: '03AGdBq24PpVCBd...',
  })
  @IsString()
  @IsNotEmpty({ message: 'CAPTCHA token is required' })
  captcha_token!: string;
}
