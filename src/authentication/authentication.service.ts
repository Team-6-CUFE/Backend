import { Injectable } from '@nestjs/common';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UpdateAuthenticationDto } from './dto/update-authentication.dto';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { generateVerificationToken, getExpiryDate } from '../common/utilities/tokens.util';
import { AuthenticationRepository } from './authentication.repositry';

const VERIFICATION_TOKEN_EXPIRY_MINUTES = 60;
@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly authRepository: AuthenticationRepository
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
    const { email } = registerDto;
    const { username } = registerDto;
    if (await this.userService.checkEmailExists(email)) {
      return `Email ${email} is already registered.`;
    }
    if (await this.userService.checkUsernameExists(username)) {
      return `Username ${username} is already taken.`;
    }
    const { captchaToken, ...createUserDto } = registerDto;
    const createdUser = await this.userService.createUser(createUserDto);
    const verificationToken = generateVerificationToken();
    const expiryDate = getExpiryDate(VERIFICATION_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createVerificationToken(
      createdUser.user_id,
      verificationToken,
      email,
      expiryDate
    );
    await this.mailService.sendEmailVerification(email, verificationToken);
    return `User registered successfully with email ${email}. Please check your email to verify your account. with captcha token ${captchaToken}`;
  }

  async sendVerificationEmail(email: string, token: string) {
    await this.mailService.sendEmailVerification(email, token);
  }

  async testEmail() {
    await this.mailService.sendWelcomeEmail('email@gmail.com', 'TestUser');
    return 'Test email sent';
  }
}
