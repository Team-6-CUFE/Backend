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
import { verifyAppCheckToken, verifyCaptcha } from '../common/utilities/captcha.util';
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

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
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

  async register(registerDto: RegisterDto, ip: string, appCheckToken?: string) {
    const { email } = registerDto;
    const { city, country } = await getLocationFromIp(ip);

    if (appCheckToken) {
      const isValidAppCheck = await verifyAppCheckToken(appCheckToken);
      if (!isValidAppCheck) {
        throw new BadRequestException(
          'App verification failed. Please update your app and try again'
        );
      }
    } else {
      const isValidCaptcha = await verifyCaptcha(registerDto.captchaToken);
      if (!isValidCaptcha) {
        throw new BadRequestException('Captcha verification failed. Please try again.');
      }
    }
    if (await this.userService.checkEmailExists(email)) {
      throw new BadRequestException(`Email ${email} is already registered.`);
    }

    let username = registerDto.displayName.toLowerCase().replace(/\s+/g, '_');
    if (await this.userService.checkUsernameExists(username)) {
      username = await this.generateUniqueUsername(username);
    }
    const { captchaToken, ...createUserDto } = registerDto;
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
      createdUser.userId,
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
        userId: createdUser.userId,
        email,
        username: createdUser.username,
        emailVerified: false,
        verificationEmailSent: true,
        createdAt: createdUser.createdAt,
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
      throw new NotFoundException({ message: 'Signup required', code: 'USER_NOT_REGISTERED' });
    }

    const user = await this.userService.findById(foundUser.userId);

    if (!user) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    // If login with email check that the email is verified
    const usedEmail = user.emails.find((e) => e.email === identifier);
    if (usedEmail && !usedEmail.isVerified) {
      throw new ForbiddenException({
        message: 'Please verify your email address before logging in',
        emailVerified: false,
        email: identifier,
      });
    }

    // Get primary email
    const primaryEmail = user.emails.find((e) => e.isPrimary);

    if (!primaryEmail) {
      throw new ForbiddenException({
        message: 'This account has no email.',
      });
    }

    // Check primary email is verified
    if (!primaryEmail?.isVerified) {
      throw new ForbiddenException({
        message: 'Please verify your email address before logging in',
        emailVerified: false,
        email: primaryEmail?.email,
      });
    }

    // Check account is not suspended
    if (user.isSuspended) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await this.userService.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    await this.issueTokens(user, response, primaryEmail?.email);

    return {
      status: 'success',
      message: 'Login successful',
      data: {
        userId: user.userId,
        email: primaryEmail.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        plan: user.plan,
      },
    };
  }

  async issueTokens(
    user: User,
    response: Response,
    email: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Build payload and sign access token
    const payload: JwtPayload = {
      sub: user.userId,
      email,
      role: user.role as UserRole,
      plan: user.plan as UserPlan,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Sign refresh token — include a unique jti so concurrent logins never
    // produce the same token hash (same payload + same iat second = collision).
    const refreshToken = this.jwtService.sign(
      { ...payload, jti: crypto.randomUUID() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_EXPIRY,
      }
    );

    // Save refresh token in DB
    const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.authRepository.saveRefreshToken(user.userId, tokenHash, expiresAt);

    // Set httpOnly cookies
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    return { accessToken, refreshToken };
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
    if (storedToken.expiresAt < new Date()) {
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
      sameSite: 'none',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    response.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
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
      sameSite: 'none',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
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
    if (useremail.isVerified) {
      throw new BadRequestException(`Email ${email} is already verified.`);
    }

    // delete any existing token for this email//
    await this.authRepository.deleteExistingTokens(email);
    // genetate new token and save
    const newVerificationToken = generateVerificationToken();
    const expiryDate = getExpiryDate(VERIFICATION_TOKEN_EXPIRY_MINUTES);
    await this.authRepository.createVerificationToken(
      useremail.userId,
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
      user.emails.find((e) => e.isPrimary)?.email || '',
      email,
      user.displayName
    );
    await this.mailService.sendEmailVerification(email, verificationToken);

    return {
      status: 'success',
      message: 'Email added successfully. Please check your inbox to verify.',
      data: {
        email: newEmailRecord.email,
        isPrimary: newEmailRecord.isPrimary,
        isVerified: newEmailRecord.isVerified,
        verificationSent: true,
        notificationSentToPrimary: false,
        createdAt: newEmailRecord.createdAt,
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

    if (emailRecord.isPrimary) {
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
        isPrimary: e.isPrimary,
        isVerified: e.isVerified,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
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

    if (emailRecord.isPrimary) {
      throw new BadRequestException('This email is already the primary email');
    }

    if (!emailRecord.isVerified) {
      throw new BadRequestException(
        'Cannot set unverified email as primary. Please verify the email first.'
      );
    }

    const currentPrimary = user.emails.find((e) => e.isPrimary);
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
      user.displayName,
      email
    );

    return {
      status: 'success',
      message:
        'Verification code sent to your current primary email. Please verify to complete the change.',
      data: {
        verificationRequired: true,
        codeSentTo: currentPrimary.email,
        newPrimaryEmail: email,
        expiresIn: 600,
      },
    };
  }

  async verifyPrimaryEmailChange(userId: string, code: string) {
    const verificationRecord = await this.authRepository.findValidVerificationCode(userId, code);
    if (!verificationRecord) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (verificationRecord.expiresAt < new Date()) {
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
        newPrimary: emailToSetPrimary,
        changedAt: Date.now(),
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
        emailSent: true,
        sentTo: `${verifiedPrimaryEmail}`,
      },
    };
  }

  async changePassword(token: string, newPassword: string) {
    const record = await this.authRepository.findPasswordResetToken(token);
    if (!record) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    const user = await this.userService.findById(record.userId);
    const isSamePassword = await this.userService.verifyPassword(newPassword, user!.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password.');
    }
    await this.userService.updatePassword(record.userId, newPassword);
    await this.authRepository.deleteVerificationToken(record.id);
    await this.authRepository.revokeAllForUser(record.userId);
    return {
      status: 'success',
      message: 'Password has been changed successfully. Please log in with your new password.',
      data: {
        passwordChanged: true,
        resetAt: new Date(),
      },
    };
  }

  async forgotPassword(email: string) {
    const useremail = await this.userService.findEmailRecord(email);
    if (!useremail || !useremail.isVerified) {
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
          emailSent: true,
          sentTo: `${email}`,
        },
      };
    }
    const { userId } = useremail;
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
        emailSent: true,
        sentTo: `${email}`,
      },
    };
  }

  async handleOAuthCallback(profile: OAuthProfile, response: Response, redirectUri?: string) {
    const isMobile = !!redirectUri;

    // Already linked social account
    const existingSocialAccount = await this.userService.findSocialAccount(
      profile.provider,
      profile.providerId
    );

    if (existingSocialAccount) {
      const user = await this.userService.findById(existingSocialAccount.userId);
      if (!user) {
        throw new NotFoundException('User not found for the social account.');
      }

      const { accessToken, refreshToken } = await this.issueTokens(user, response, profile.email);
      if (isMobile) {
        return {
          url: `${redirectUri}?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`,
          statusCode: 302,
        };
      }
      return {
        url: `${FRONTEND_URL}/home`,
        statusCode: 302,
      };
    }

    // Email already registered
    const existingUser = await this.userService.findByEmail(profile.email);

    if (existingUser) {
      await this.userService.createSocialAccount(
        existingUser.userId,
        profile.provider,
        profile.providerId,
        profile.email
      );
      const { accessToken, refreshToken } = await this.issueTokens(
        existingUser,
        response,
        profile.email
      );
      if (isMobile) {
        return {
          url: `${redirectUri}?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`,
          statusCode: 302,
        };
      }
      return {
        url: `${FRONTEND_URL}/home`,
        statusCode: 302,
      };
    }

    // Brand new user
    const pendingToken = await this.createPendingOAuthSession(profile);
    const displayName = `${profile.firstName} ${profile.lastName}`;
    const pendingParams = `pendingToken=${pendingToken}&displayName=${encodeURIComponent(displayName)}`;
    return {
      url: isMobile
        ? `${redirectUri}?${pendingParams}`
        : `${FRONTEND_URL}/auth/callback?${pendingParams}`,
      statusCode: 302,
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

  /**
   * Issues a short-lived, single-purpose JWT for mobile account linking.
   * Flutter calls this endpoint (authenticated), then opens the system browser
   * with the returned token as ?link_token=... so the link guard can identify
   * the user without a shared cookie context.
   */
  generateLinkToken(userId: string): { token: string } {
    const token = this.jwtService.sign(
      { sub: userId, type: 'oauth-link' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '5m',
      }
    );
    return { token };
  }

  private buildUserResponse(user: User) {
    const primaryEmail = user.emails.find((e) => e.isPrimary);
    return {
      userId: user.userId,
      email: primaryEmail?.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      plan: user.plan,
    };
  }

  async completeOAuthProfile(oauthData: CompleteOAuthProfileDto, response: Response, ip: string) {
    const pendingToken = await this.authRepository.findPendingToken(oauthData.pendingToken);
    if (!pendingToken) {
      throw new NotFoundException('Invalid or expired pending token');
    }
    if (pendingToken.expiresAt < new Date()) {
      throw new BadRequestException('Pending token has expired');
    }

    const { city, country } = getLocationFromIp(ip);

    let username = oauthData.displayName.toLowerCase().replace(/\s+/g, '_');
    if (await this.userService.checkUsernameExists(username)) {
      username = await this.generateUniqueUsername(username);
    }

    const createOAuthUser: OAuthUser = {
      email: pendingToken.email,
      username,
      firstName: pendingToken.firstName,
      lastName: pendingToken.lastName,
      birthdate: oauthData.birthdate,
      gender: oauthData.gender,
      displayName: oauthData.displayName,
      city: city ?? '',
      country: country ?? '',
    };
    const user = await this.userService.createOAuthUser(createOAuthUser);

    await this.userService.createSocialAccount(
      user.userId,
      pendingToken.provider,
      pendingToken.providerId,
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
      if (existingSocialAccount.userId === userId) {
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
        providerEmail: profile.email,
        linkedAt: new Date(),
      },
    };
  }

  async unlinkSocialAccount(userId: string, provider: string, providerId: string) {
    const socialAccount = await this.userService.findSocialAccount(provider, providerId);

    if (!socialAccount) {
      throw new NotFoundException('Social account not found');
    }
    if (socialAccount.userId !== userId) {
      throw new ForbiddenException('You are not allowed to unlink this social account');
    }
    await this.userService.deleteSocialAccount(provider, providerId);
    return {
      status: 'success',
      message: 'Social account unlinked successfully',
    };
  }

  async getSocialAccounts(userId: string) {
    // we need to return displayName + all data from social accounts
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const socialAccounts = await this.userService.getSocialAccounts(userId);
    return {
      status: 'success',
      data: {
        displayName: user.displayName,
        socialAccounts: socialAccounts.map(
          (acc: { providerId: any; provider: any; providerEmail: any; createdAt: any }) => ({
            providerid: acc.providerId,
            provider: acc.provider,
            providerEmail: acc.providerEmail,
            linkedAt: acc.createdAt,
          })
        ),
      },
    };
  }
}
