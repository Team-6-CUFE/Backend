import { Injectable } from '@nestjs/common';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UpdateAuthenticationDto } from './dto/update-authentication.dto';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthenticationService {
  constructor(
    // private readonly authRepository: AuthenticationRepository,
    private readonly userService: UserService
  ) {}

  create(createAuthenticationDto: CreateAuthenticationDto) {
    return `This action adds a new authentication${JSON.stringify(createAuthenticationDto)}`;
  }

  findAll() {
    return `This action returns all authentication ${JSON.stringify(UpdateAuthenticationDto)}`;
  }

  findOne(id: number) {
    return `This action returns a #${id} authentication`;
  }

  update(id: number, updateAuthenticationDto: UpdateAuthenticationDto) {
    return `This action updates a #${id} authentication ${JSON.stringify(updateAuthenticationDto)}`;
  }

  remove(id: number) {
    return `This action removes a #${id} authentication`;
  }

  async register(registerDto: RegisterDto) {
    // here we will verify CapTCHA.
    const { email } = registerDto;
    const { username } = registerDto;
    if (await this.userService.checkEmailExists(email)) {
      return `Email ${email} is already registered.`;
    }
    if (await this.userService.checkUsernameExists(username)) {
      return `Username ${username} is already taken.`;
    }
    const { captchaToken, ...createUserDto } = registerDto;
    await this.userService.create(createUserDto);
    // now we will need to create a new user///

    return `User registered successfully with email ${email}. Please check your email to verify your account. with captcha token ${captchaToken}`;
    // then we will need to create an authentication token to send via email for verification.
  }
}
