import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { UpdateAuthenticationDto } from './dto/update-authentication.dto';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { generateVerificationToken, getExpiryDate } from '../common/utilities/tokens.util';
import { AuthenticationRepository } from './authentication.repositry';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, UserPlan } from './strategies/jwt.strategy';
import { UserRole } from './decorators/roles.decorator';

const VERIFICATION_TOKEN_EXPIRY_MINUTES = 60;

// Access token lifetime
const ACCESS_TOKEN_EXPIRY = '15m';

// Cookie max-age in milliseconds (match ACCESS_TOKEN_EXPIRY)
const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly authRepository: AuthenticationRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
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

  async login(loginDto: LoginDto, response: Response) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check email is verified
    if (!user.emails.find((e) => e.email === email)?.is_verified) {
      throw new ForbiddenException({
        message: 'Please verify your email address before logging in',
        email_verified: false,
        email,
      });
    }

    // Check account is not suspended
    if (user.is_suspended) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await this.userService.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

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

    return {
      status: 'success',
      message: 'Login successful',
      data: {
        user_id: user.user_id,
        email,
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

  logout(response: Response, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      this.authRepository.revokeRefreshToken(tokenHash).catch(() => null);
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
}
