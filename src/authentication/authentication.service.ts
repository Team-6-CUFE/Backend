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
import { TokenType } from './entities/emailverficationtokens.entity';

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
      expiryDate,
      TokenType.EMAIL_VERIFICATION
    );
    console.log('will send email now');
    await this.mailService.sendEmailVerification(email, verificationToken);
    console.log('email sent');
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
    console.log('Login attempt with password', password);
    // Find user
    let user = await this.userService.findByEmail(identifier);

    // If login with email check that the email is verified
    if (user) {
      if (!user.emails.find((e) => e.email === identifier)?.is_verified) {
        throw new ForbiddenException({
          message: 'Please verify your email address before logging in',
          email_verified: false,
          email: identifier,
        });
      }
    } else {
      user = await this.userService.findByUsername(identifier);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid identifier or password');
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
      expiryDate,
      TokenType.EMAIL_VERIFICATION
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

  async changePasswordRequest(userId: string) {
    const verifiedPrimaryEmail = await this.userService.getPrimaryEmail(userId);
    if (!verifiedPrimaryEmail) {
      throw new BadRequestException(
        'No verified primary email found. Please verify your email address first.'
      );
    }
    // we will generate a verification
    const verificationToken = generateVerificationToken();
    const expiryDate = getExpiryDate(VERIFICATION_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createVerificationToken(
      userId,
      verificationToken,
      verifiedPrimaryEmail,
      expiryDate,
      TokenType.PASSWORD_RESET
    );
    await this.mailService.sendPasswordReset(verifiedPrimaryEmail, verificationToken);
    return {
      status: 'success',
      message: `Password reset link sent to your primary email address ${verifiedPrimaryEmail}`,
      data: {
        email_sent: true,
        sent_to: `${verifiedPrimaryEmail}`,
      },
    };
  }

  async changePassword(token: string, newPassword: string) {
    console.log('Received password change request with token', token);
    const record = await this.authRepository.findPasswordResetToken(token);
    if (!record) {
      console.log('hi');
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    if (record.expires_at < new Date()) {
      console.log('hello');
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    const user = await this.userService.findById(record.user_id);
    const isSamePassword = await this.userService.verifyPassword(newPassword, user!.password_hash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password.');
    }
    await this.userService.updatePassword(record.user_id, newPassword);
    await this.authRepository.deleteVerificationToken(record.id);
    await this.authRepository.revokeAllForUser(record.user_id);
    return {
      status: 'success',
      message: 'Password has been changed successfully. Please log in with your new password.',
      data: {
        password_changed: true,
        reset_at: new Date(),
      },
    };
  }

  async forgotPassword(email: string) {
    const useremail = await this.userService.findEmailRecord(email);
    if (!useremail || !useremail.is_verified) {
      throw new NotFoundException(`No verified account found with email ${email}.`);
    }
    const userId = useremail.user_id;
    const verificationToken = generateVerificationToken();
    const expiryDate = getExpiryDate(VERIFICATION_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createVerificationToken(
      userId,
      verificationToken,
      email,
      expiryDate,
      TokenType.PASSWORD_RESET
    );
    await this.mailService.sendPasswordReset(email, verificationToken);
    return {
      status: 'success',
      message: `Password reset link sent to your email address ${email}`,
      data: {
        email_sent: true,
        sent_to: `${email}`,
      },
    };
  }
}
