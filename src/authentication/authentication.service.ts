import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { generateVerificationToken, getExpiryDate } from '../common/utilities/tokens.util';
import { AuthenticationRepository } from './authentication.repositry';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, UserPlan } from './strategies/jwt.strategy';
import { UserRole } from './decorators/roles.decorator';
import { verifyCaptcha } from '../common/utilities/captcha.util';

// Access token lifetime
const ACCESS_TOKEN_EXPIRY = '15m';

// Cookie max-age in milliseconds (match ACCESS_TOKEN_EXPIRY)
const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const VERIFICATION_TOKEN_EXPIRY_MINUTES = 24 * 60;
const MAX_RESEND_ATTEMPTS = 3;
@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly authRepository: AuthenticationRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(registerDto: RegisterDto) {
    const { email } = registerDto;
    const { username } = registerDto;
    const isValidCaptcha = await verifyCaptcha(registerDto.captchaToken);
    if (!isValidCaptcha) {
      throw new BadRequestException('Captcha verification failed. Please try again.');
    }
    console.log('captcha verification passed');
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

  async login(loginDto: LoginDto, response: Response) {
    const { identifier, password } = loginDto;

    // Find user
    const foundUser =
      (await this.userService.findByEmail(identifier)) ??
      (await this.userService.findByUsername(identifier));

    if (!foundUser) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    const user = await this.userService.findById(foundUser.user_id);

    if (!user) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    // If login with email check that the email is verified
    const usedEmail = user.emails.find((e) => e.email === identifier);
    if (usedEmail && !usedEmail.is_verified) {
      throw new ForbiddenException({
        message: 'Please verify your email address before logging in',
        email_verified: false,
        email: identifier,
      });
    }

    // Get primary email
    const primaryEmail = user.emails.find((e) => e.is_primary);

    if (!primaryEmail) {
      throw new ForbiddenException({
        message: 'This account has no email.',
      });
    }

    // Check primary email is verified
    if (!primaryEmail?.is_verified) {
      throw new ForbiddenException({
        message: 'Please verify your email address before logging in',
        email_verified: false,
        email: primaryEmail?.email,
      });
    }

    // Check account is not suspended
    if (user.is_suspended) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await this.userService.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    // Build payload and sign access token
    const payload: JwtPayload = {
      sub: user.user_id,
      email: primaryEmail?.email,
      role: user.role as UserRole,
      plan: user.plan as UserPlan,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Sign refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Save refresh token in DB
    const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.authRepository.saveRefreshToken(user.user_id, tokenHash, expiresAt);

    // Set httpOnly cookies
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    return {
      status: 'success',
      message: 'Login successful',
      data: {
        user_id: user.user_id,
        email: primaryEmail.email,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        role: user.role,
        plan: user.plan,
      },
    };
  }

  async refreshTokens(
    userId: string,
    email: string,
    role: UserRole,
    plan: UserPlan,
    oldRefreshToken: string,
    response: Response
  ) {
    // Verify the token exists in DB
    const oldTokenHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
    const storedToken = await this.authRepository.findValidRefreshToken(oldTokenHash);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token is invalid or has been revoked');
    }

    // Check expiry
    if (storedToken.expires_at < new Date()) {
      await this.authRepository.revokeRefreshToken(oldTokenHash);
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Rotate: revoke old token, issue new pair
    await this.authRepository.revokeRefreshToken(oldTokenHash);

    const payload: JwtPayload = { sub: userId, email, role, plan };

    const newAccessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const newRefreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);
    const tokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await this.authRepository.saveRefreshToken(userId, tokenHash, expiresAt);

    response.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    response.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    return { status: 'success', message: 'Token refreshed successfully' };
  }

  async logout(response: Response, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.authRepository.revokeRefreshToken(tokenHash).catch(() => null);
    }
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return {
      status: 'success',
      message: 'Logged out successfully',
    };
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

  async removeUser(userId: string, response: Response, refreshToken?: string) {
    await this.logout(response, refreshToken);
    await this.userService.remove(userId);
    return {
      status: 'success',
      message: 'Your account has been deleted successfully.',
    };
  }

  async addEmail(userId: string, email: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (await this.userService.checkEmailExists(email)) {
      throw new BadRequestException(`Email ${email} is already associated with an account`);
    }

    const newEmailRecord = await this.userService.addEmail(userId, email);

    const verificationToken = generateVerificationToken();
    const expiryDate = getExpiryDate(VERIFICATION_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createVerificationToken(userId, verificationToken, email, expiryDate);

    await this.mailService.sendEmailAddedNotification(
      user.emails.find((e) => e.is_primary)?.email || '',
      email,
      user.display_name
    );
    // await new Promise((resolve) => setTimeout(resolve, 10000)); // for testing with mailtrap
    await this.mailService.sendEmailVerification(email, verificationToken);

    return {
      status: 'success',
      message: 'Email added successfully. Please check your inbox to verify.',
      data: {
        email: newEmailRecord.email,
        is_primary: newEmailRecord.is_primary,
        is_verified: newEmailRecord.is_verified,
        verification_sent: true,
        notification_sent_to_primary: false,
        created_at: newEmailRecord.created_at,
      },
    };
  }

  async removeEmail(userId: string, email: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const emailRecord = user.emails.find((e) => e.email === email);
    if (!emailRecord) {
      throw new NotFoundException(`Email not found`);
    }

    if (user.emails.length <= 1) {
      throw new BadRequestException('Cannot delete your only email address');
    }

    if (emailRecord.is_primary) {
      throw new BadRequestException(
        'Cannot delete primary email. Please set another email as primary first.'
      );
    }

    await this.userService.removeEmail(userId, email);
    return {
      status: 'success',
      message: 'Email removed successfully',
    };
  }
}
