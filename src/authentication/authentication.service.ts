import {
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UpdateAuthenticationDto } from './dto/update-authentication.dto';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { generateVerificationToken, getExpiryDate } from '../common/utilities/tokens.util';
import { AuthenticationRepository } from './authentication.repositry';

const VERIFICATION_TOKEN_EXPIRY_MINUTES = 24 * 60;
const MAX_RESEND_ATTEMPTS = 3;
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
      throw new BadRequestException(`Email ${email} is already registered.`);
    }
    const newregisterDto = { ...registerDto };
    if (await this.userService.checkUsernameExists(username)) {
      newregisterDto.username = await this.generateUniqueUsername(username);
    }
    const { captchaToken, ...createUserDto } = newregisterDto;
    console.log('captcha token received', captchaToken);
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
    return {
      status: 'success',
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user_id: createdUser.user_id,
        email,
        username: createdUser.username,
        email_verified: false,
        verification_email_sent: true,
        created_at: createdUser.created_at,
      },
    };
  }

  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    const suffix = crypto.randomBytes(3).toString('hex');
    const username = `${baseUsername}_${suffix}`;

    const exists = await this.userService.checkUsernameExists(username);

    if (exists) {
      return this.generateUniqueUsername(baseUsername); // ← recurse if taken
    }

    return username;
  }

  async sendVerificationEmail(email: string, token: string) {
    await this.mailService.sendEmailVerification(email, token);
  }

  async testEmail() {
    await this.mailService.sendWelcomeEmail('email@gmail.com', 'TestUser');
    return 'Test email sent';
  }

  async verifyEmail(verificationToken: string) {
    console.log('verifying token 2', verificationToken);
    return this.authRepository.verifyEmail(verificationToken);
  }

  async resendVerificationEmail(email: string) {
    const useremail = await this.userService.findEmailRecord(email);
    if (!useremail) {
      throw new NotFoundException(`Email ${email} is not found.`);
    }
    if (useremail.is_verified) {
      throw new BadRequestException(`Email ${email} is already verified.`);
    }
    // rate limits//
    const exceededRateLimit = await this.authRepository.countRecentVerificationTokens(email);
    if (exceededRateLimit >= MAX_RESEND_ATTEMPTS) {
      throw new HttpException(
        'Too many verification emails sent. Please try again in 5 minutes.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    // delete any existing token for this email//
    await this.authRepository.deleteExistingTokens(email);
    // genetate new token and save
    const newVerificationToken = generateVerificationToken();
    const expiryDate = getExpiryDate(VERIFICATION_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createVerificationToken(
      useremail.user_id,
      newVerificationToken,
      email,
      expiryDate
    );
    // send email
    await this.sendVerificationEmail(email, newVerificationToken);
    return {
      status: 'success',
      message: 'Verification email resent. Please check your email.',
    };
  }
}
