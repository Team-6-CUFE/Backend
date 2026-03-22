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
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisClientType } from 'redis';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import {
  generateVerificationToken,
  getExpiryDate,
  generateSixDigitCode,
} from '../common/utilities/tokens.util';
import { AuthenticationRepository } from './authentication.repositry';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, UserPlan } from './strategies/jwt.strategy';
import { UserRole } from './decorators/roles.decorator';
import { verifyCaptcha } from '../common/utilities/captcha.util';
import { TokenType } from './entities/emailverficationtokens.entity';
import { OAuthProfile } from './types/oauth-profile.type';
import { User } from '../user/entities/user.entity';
import { CompleteOAuthProfileDto } from './dto/complete-oauth-profile.dto';
import { OAuthUser } from './types/oauth-user.type';
import { REDIS_CLIENT } from '../redis/redis.module';
import { getLocationFromIp } from '../common/utilities/geolocation.util';

// Access token lifetime
const ACCESS_TOKEN_EXPIRY = '15m';

// Cookie max-age in milliseconds (match ACCESS_TOKEN_EXPIRY)
const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const VERIFICATION_TOKEN_EXPIRY_MINUTES = 24 * 60;

const VERIFICATION_CODE_EXPIRY_MINUTES = 5;

const PENDING_OAUTH_TOKEN_EXPIRY_MINUTES = 10;
@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly authRepository: AuthenticationRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType
  ) {}

  async register(registerDto: RegisterDto, ip: string) {
    const { email } = registerDto;
    const { city, country } = await getLocationFromIp(ip);
    console.log(`Geolocation for IP ${ip}: city=${city}, country=${country}`);
    const isValidCaptcha = await verifyCaptcha(registerDto.captcha_token);
    if (!isValidCaptcha) {
      throw new BadRequestException('Captcha verification failed. Please try again.');
    }
    if (await this.userService.checkEmailExists(email)) {
      throw new BadRequestException(`Email ${email} is already registered.`);
    }
    // const newregisterDto = { ...registerDto };
    let username = registerDto.display_name.toLowerCase().replace(/\s+/g, '_');
    if (await this.userService.checkUsernameExists(username)) {
      username = await this.generateUniqueUsername(username);
    }
    const { captcha_token: captchaToken, ...createUserDto } = registerDto;
    console.log(captchaToken);
    const createdUser = await this.userService.createUser(
      createUserDto,
      username,
      city ?? '',
      country ?? ''
    );
    const verificationToken = generateVerificationToken();
    const expiryDate = getExpiryDate(VERIFICATION_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createVerificationToken(
      createdUser.user_id,
      verificationToken,
      email,
      expiryDate,
      TokenType.EMAIL_VERIFICATION
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
    const attempts = await this.redis.incr(`rate:verify:${email}`);
    await this.redis.expire(`rate:verify:${email}`, 300); // auto-expire in 5 min
    if (attempts > 3)
      throw new HttpException(
        'Too many verification emails sent. Please try again in 5 minutes.',
        HttpStatus.TOO_MANY_REQUESTS
      );
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

    await this.issueTokens(user, response, primaryEmail?.email);

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

  async issueTokens(user: User, response: Response, email: string) {
    // Build payload and sign access token
    const payload: JwtPayload = {
      sub: user.user_id,
      email,
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
    await this.authRepository.revokeAllForUser(userId);
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
    await this.authRepository.createVerificationToken(
      userId,
      verificationToken,
      email,
      expiryDate,
      TokenType.EMAIL_VERIFICATION
    );

    await this.mailService.sendEmailAddedNotification(
      user.emails.find((e) => e.is_primary)?.email || '',
      email,
      user.display_name
    );
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
      throw new NotFoundException('Email not found');
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

  async getEmails(userId: string) {
    const emails = await this.userService.getEmails(userId);
    if (!emails) {
      throw new NotFoundException('User not found');
    }

    return {
      status: 'success',
      emails: emails.map((e) => ({
        email: e.email,
        is_primary: e.is_primary,
        is_verified: e.is_verified,
        created_at: e.created_at,
        updated_at: e.updated_at,
      })),
    };
  }

  async setPrimaryEmail(userId: string, email: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Email not found');
    }

    const emailRecord = user.emails.find((e) => e.email === email);
    if (!emailRecord) {
      throw new NotFoundException(`Email not found`);
    }

    if (emailRecord.is_primary) {
      throw new BadRequestException('This email is already the primary email');
    }

    if (!emailRecord.is_verified) {
      throw new BadRequestException(
        'Cannot set unverified email as primary. Please verify the email first.'
      );
    }

    const currentPrimary = user.emails.find((e) => e.is_primary);
    if (!currentPrimary) {
      throw new BadRequestException('Current primary email not found');
    }

    await this.authRepository.deleteExistingVerificationCodes(userId); // for resending code
    const attempts = await this.redis.incr(`rate:set-primary:${email}`);
    await this.redis.expire(`rate:set-primary:${email}`, 300); // auto-expire in 5 min
    if (attempts > 3)
      throw new HttpException(
        'Too many verification codes sent. Please try again in 5 minutes.',
        HttpStatus.TOO_MANY_REQUESTS
      );

    const verificationCode = generateSixDigitCode();
    const expiryDate = getExpiryDate(VERIFICATION_CODE_EXPIRY_MINUTES);
    await this.authRepository.createVerificationCode(userId, verificationCode, email, expiryDate);
    await this.mailService.sendPrimaryEmailChangeCode(
      currentPrimary.email,
      verificationCode,
      user.display_name,
      email
    );

    return {
      status: 'success',
      message:
        'Verification code sent to your current primary email. Please verify to complete the change.',
      data: {
        verification_required: true,
        code_sent_to: currentPrimary.email,
        new_primary_email: email,
        expires_in: 600,
      },
    };
  }

  async verifyPrimaryEmailChange(userId: string, code: string) {
    const verificationRecord = await this.authRepository.findValidVerificationCode(userId, code);
    if (!verificationRecord) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (verificationRecord.expires_at < new Date()) {
      this.authRepository.deleteVerificationCode(verificationRecord.id).catch(() => null);
      throw new BadRequestException('Invalid or expired verification code');
    }

    const emailToSetPrimary = verificationRecord.email;
    await this.userService.setPrimaryEmail(userId, emailToSetPrimary);
    await this.authRepository.deleteVerificationCode(verificationRecord.id);

    return {
      status: 'success',
      message: 'Primary email changed successfully',
      data: {
        new_primary: emailToSetPrimary,
        changed_at: Date.now(),
      },
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
    const attempts = await this.redis.incr(`rate:change-password:${userId}`);
    await this.redis.expire(`rate:change-password:${userId}`, 300); // auto-expire in 5 min
    if (attempts > 3)
      throw new HttpException(
        'Too many change password requests sent. Please try again in 5 minutes.',
        HttpStatus.TOO_MANY_REQUESTS
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
    const record = await this.authRepository.findPasswordResetToken(token);
    if (!record) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    if (record.expires_at < new Date()) {
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
      const attempts = await this.redis.incr(`rate:forgot-password:${email}`);
      await this.redis.expire(`rate:forgot-password:${email}`, 300); // auto-expire in 5 min
      if (attempts > 3)
        throw new HttpException(
          'Too many forgot password requests sent. Please try again in 5 minutes.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      return {
        status: 'success',
        message: `Password reset link sent to your email address ${email}`,
        data: {
          email_sent: true,
          sent_to: `${email}`,
        },
      };
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
    const attempts = await this.redis.incr(`rate:forgot-password:${userId}`);
    await this.redis.expire(`rate:forgot-password:${userId}`, 300); // auto-expire in 5 min
    if (attempts > 3)
      throw new HttpException(
        'Too many forgot password requests sent. Please try again in 5 minutes.',
        HttpStatus.TOO_MANY_REQUESTS
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

  async handleOAuthCallback(profile: OAuthProfile, response: Response) {
    // Already linked social account
    const existingSocialAccount = await this.userService.findSocialAccount(
      profile.provider,
      profile.providerId
    );

    if (existingSocialAccount) {
      const user = await this.userService.findById(existingSocialAccount.user_id);
      if (!user) {
        throw new NotFoundException('User not found for the social account.');
      }

      await this.issueTokens(user, response, profile.email);
      return {
        status: 'success',
        type: 'login',
        data: this.buildUserResponse(user),
      };
    }

    // Email already registered
    const existingUser = await this.userService.findByEmail(profile.email);

    if (existingUser) {
      await this.userService.createSocialAccount(
        existingUser.user_id,
        profile.provider,
        profile.providerId,
        profile.email
      );
      await this.issueTokens(existingUser, response, profile.email);
      return {
        status: 'success',
        type: 'login',
        data: this.buildUserResponse(existingUser),
      };
    }

    // Brand new user
    const pendingToken = await this.createPendingOAuthSession(profile);
    return {
      status: 'success',
      type: 'registration_incomplete',
      data: {
        pending_token: pendingToken,
        prefill: {
          display_name: `${profile.firstName} ${profile.lastName}`,
          email: profile.email,
        },
      },
    };
  }

  async createPendingOAuthSession(profile: OAuthProfile) {
    const token = generateVerificationToken();
    const expiryDate = getExpiryDate(PENDING_OAUTH_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createPendingOauthToken(
      token,
      profile.provider,
      profile.providerId,
      profile.email,
      profile.firstName!,
      profile.lastName!,
      expiryDate
    );
    return token;
  }

  private buildUserResponse(user: User) {
    const primaryEmail = user.emails.find((e) => e.is_primary);
    return {
      user_id: user.user_id,
      email: primaryEmail?.email,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      role: user.role,
      plan: user.plan,
    };
  }

  async completeOAuthProfile(oauthData: CompleteOAuthProfileDto, response: Response) {
    const pendingToken = await this.authRepository.findPendingToken(oauthData.pending_token);
    if (!pendingToken) {
      throw new NotFoundException('Invalid or expired pending token');
    }
    if (pendingToken.expires_at < new Date()) {
      throw new BadRequestException('Pending token has expired');
    }
    let username = oauthData.display_name.toLowerCase().replace(/\s+/g, '_');
    if (await this.userService.checkUsernameExists(username)) {
      username = await this.generateUniqueUsername(username);
    }

    const createOAuthUser: OAuthUser = {
      email: pendingToken.email,
      username,
      first_name: pendingToken.first_name,
      last_name: pendingToken.last_name,
      birthdate: oauthData.birthdate,
      gender: oauthData.gender,
      display_name: oauthData.display_name,
    };
    const user = await this.userService.createOAuthUser(createOAuthUser);

    await this.userService.createSocialAccount(
      user.user_id,
      pendingToken.provider,
      pendingToken.provider_id,
      pendingToken.email
    );

    await this.authRepository.deletePendingToken(pendingToken.token);

    await this.issueTokens(user, response, pendingToken.email);

    return {
      status: 'success',
      message: 'Profile completed and logged in successfully',
      data: this.buildUserResponse(user),
    };
  }

  async linkSocialAccount(userId: string, profile: OAuthProfile) {
    // Check if this social account is already linked to anyone
    const existingSocialAccount = await this.userService.findSocialAccount(
      profile.provider,
      profile.providerId
    );

    if (existingSocialAccount) {
      if (existingSocialAccount.user_id === userId) {
        throw new BadRequestException(
          `This ${profile.provider} account is already linked to your account`
        );
      }
      throw new BadRequestException(
        `This ${profile.provider} account is already linked to another user`
      );
    }

    await this.userService.createSocialAccount(
      userId,
      profile.provider,
      profile.providerId,
      profile.email
    );

    return {
      status: 'success',
      message: `${profile.provider} account linked successfully`,
      data: {
        provider: profile.provider,
        provider_email: profile.email,
        linked_at: new Date(),
      },
    };
  }

  async unlinkSocialAccount(userId: string, provider: string, providerId: string) {
    const socialAccount = await this.userService.findSocialAccount(provider, providerId);

    if (!socialAccount) {
      throw new NotFoundException('Social account not found');
    }
    if (socialAccount.user_id !== userId) {
      throw new ForbiddenException('You are not allowed to unlink this social account');
    }
    await this.userService.deleteSocialAccount(provider, providerId);
    return {
      status: 'success',
      message: 'Social account unlinked successfully',
    };
  }

  async getSocialAccounts(userId: string) {
    // we need to return display_name + all data from social accounts
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const socialAccounts = await this.userService.getSocialAccounts(userId);
    return {
      status: 'success',
      data: {
        display_name: user.display_name,
        social_accounts: socialAccounts.map(
          (acc: { provider_id: any; provider: any; provider_email: any; created_at: any }) => ({
            providerid: acc.provider_id,
            provider: acc.provider,
            provider_email: acc.provider_email,
            linked_at: acc.created_at,
          })
        ),
      },
    };
  }
}
