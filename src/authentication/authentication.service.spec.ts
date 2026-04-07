import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  HttpException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from './authentication.service';
import { AuthenticationRepository } from './authentication.repositry';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import * as captchaUtil from '../common/utilities/captcha.util';
import * as tokensUtil from '../common/utilities/tokens.util';
import * as geoipUtil from '../common/utilities/geolocation.util';
import {
  mockAuthenticationRepository,
  mockUserService,
  mockMailService,
  mockJwtService,
  mockConfigService,
  mockRegisterDto,
  mockUser,
  mockUserEmail,
  mockUserId,
  mockEmail,
  mockVerificationToken,
  mockUsername,
  mockAccessToken,
  mockRefreshToken,
  mockStoredRefreshToken,
  mockExpiredRefreshToken,
  mockLoginDto,
  mockLoginDtoWithUsername,
  mockResponseWithCookie,
  mockNewEmailRecord,
  mockSecondaryEmail,
  mockUserWithMultipleEmails,
  mockVerificationCode,
  mockVerificationCodeRecord,
  mockExpiredVerificationCodeRecord,
  mockPendingToken,
  mockSocialAccount,
  mockOAuthProfile,
  mockProviderId,
  mockCompleteOAuthProfileDto,
  mockExpiredPendingOAuthSession,
  mockPendingOAuthSession,
  mockRedisClient,
} from './test/auth.mock';
import { REDIS_CLIENT } from '../redis/redis.module';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let authRepo: ReturnType<typeof mockAuthenticationRepository>;
  let userService: ReturnType<typeof mockUserService>;
  let mailService: ReturnType<typeof mockMailService>;
  let jwtService: ReturnType<typeof mockJwtService>;
  let configService: ReturnType<typeof mockConfigService>;
  let redisClient: ReturnType<typeof mockRedisClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: AuthenticationRepository, useFactory: mockAuthenticationRepository },
        { provide: UserService, useFactory: mockUserService },
        { provide: MailService, useFactory: mockMailService },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: REDIS_CLIENT, useFactory: mockRedisClient },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    redisClient = module.get(REDIS_CLIENT);
    authRepo = module.get(AuthenticationRepository);
    userService = module.get(UserService);
    mailService = module.get(MailService);
  });
  afterEach(() => jest.clearAllMocks());

  // ─── register() ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const mockIp = '197.32.45.123';

    beforeEach(() => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(true);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.checkEmailExists.mockResolvedValue(false);
      userService.checkUsernameExists.mockResolvedValue(false);
      userService.createUser.mockResolvedValue(mockUser());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
      jest.spyOn(geoipUtil, 'getLocationFromIp').mockReturnValue({
        country: 'Egypt',
        city: 'Cairo',
      });
    });

    it('should register successfully and return correct response', async () => {
      const result = await service.register(mockRegisterDto() as any, mockIp);

      expect(result.status).toBe('success');
      expect(result.data.email).toBe(mockEmail);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.emailVerified).toBe(false);
      expect(result.data.verificationEmailSent).toBe(true);
    });

    it('should call createUser with correct dto (without captchaToken)', async () => {
      await service.register(mockRegisterDto() as any, mockIp);

      const [createUserDtoArg, usernameArg] = userService.createUser.mock.calls[0];
      expect(createUserDtoArg).not.toHaveProperty('captchaToken');
      expect(createUserDtoArg.email).toBe(mockEmail);
      expect(usernameArg).toBe('yara_senousy');
    });

    it('should call createVerificationToken with correct args', async () => {
      await service.register(mockRegisterDto() as any, mockIp);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserId,
        mockVerificationToken,
        mockEmail,
        expect.any(Date),
        'email_verification'
      );
    });

    it('should call createVerificationToken exactly once', async () => {
      await service.register(mockRegisterDto() as any, mockIp);

      expect(authRepo.createVerificationToken).toHaveBeenCalledTimes(1);
    });

    it('should send verification email after registration', async () => {
      await service.register(mockRegisterDto() as any, mockIp);

      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        mockEmail,
        mockVerificationToken
      );
    });

    it('should send verification email exactly once', async () => {
      await service.register(mockRegisterDto() as any, mockIp);

      expect(mailService.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if captcha is invalid', async () => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(false);

      await expect(service.register(mockRegisterDto() as any, mockIp)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should not proceed further if captcha fails', async () => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(false);

      await expect(service.register(mockRegisterDto() as any, mockIp)).rejects.toThrow();
      expect(userService.checkEmailExists).not.toHaveBeenCalled();
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.register(mockRegisterDto() as any, mockIp)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should not create user if email already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.register(mockRegisterDto() as any, mockIp)).rejects.toThrow();
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should generate unique username if username already taken', async () => {
      userService.checkUsernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await service.register(mockRegisterDto() as any, mockIp);

      const [, usernameArg] = userService.createUser.mock.calls[0];
      expect(usernameArg).not.toBe('yara_senousy');
      expect(usernameArg).toMatch(/^yara_senousy_[a-f0-9]{6}$/);
      expect(result.status).toBe('success');
    });

    it('should keep recursing until unique username is found', async () => {
      userService.checkUsernameExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.register(mockRegisterDto() as any, mockIp);

      expect(userService.checkUsernameExists).toHaveBeenCalledTimes(3);
    });

    it('should not change username if original is available', async () => {
      userService.checkUsernameExists.mockResolvedValue(false);

      await service.register(mockRegisterDto() as any, mockIp);

      const [, usernameArg] = userService.createUser.mock.calls[0];
      expect(usernameArg).toBe('yara_senousy');
    });

    it('should not call createVerificationToken if createUser fails', async () => {
      userService.createUser.mockRejectedValue(new Error('DB error'));

      await expect(service.register(mockRegisterDto() as any, mockIp)).rejects.toThrow('DB error');
      expect(authRepo.createVerificationToken).not.toHaveBeenCalled();
    });

    it('should not send email if createVerificationToken fails', async () => {
      authRepo.createVerificationToken.mockRejectedValue(new Error('DB error'));

      await expect(service.register(mockRegisterDto() as any, mockIp)).rejects.toThrow('DB error');
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should propagate error if sendEmailVerification fails', async () => {
      mailService.sendEmailVerification.mockRejectedValue(new Error('Mail error'));

      await expect(service.register(mockRegisterDto() as any, mockIp)).rejects.toThrow(
        'Mail error'
      );
    });

    it('should return createdAt from the created user', async () => {
      const fixedDate = new Date('2025-01-01T00:00:00Z');
      userService.createUser.mockResolvedValue({ ...mockUser(), createdAt: fixedDate });

      const result = await service.register(mockRegisterDto() as any, mockIp);

      expect(result.data.createdAt).toEqual(fixedDate);
    });

    it('should pass country and city from IP detection to createUser', async () => {
      jest.spyOn(geoipUtil, 'getLocationFromIp').mockReturnValue({
        country: 'Egypt',
        city: 'Cairo',
      });

      await service.register(mockRegisterDto() as any, mockIp);

      const [, , cityArg, countryArg] = userService.createUser.mock.calls[0];
      expect(cityArg).toBe('Cairo');
      expect(countryArg).toBe('Egypt');
    });

    it('should pass empty strings for localhost IP (resolves to test IP)', async () => {
      jest.spyOn(geoipUtil, 'getLocationFromIp').mockReturnValue({
        country: null,
        city: null,
      });

      await service.register(mockRegisterDto() as any, '127.0.0.1');

      const [, , cityArg, countryArg] = userService.createUser.mock.calls[0];
      expect(cityArg).toBe('');
      expect(countryArg).toBe('');
    });

    it('should call getLocationFromIp with the provided IP', async () => {
      const spy = jest.spyOn(geoipUtil, 'getLocationFromIp').mockReturnValue({
        country: 'Egypt',
        city: 'Cairo',
      });

      await service.register(mockRegisterDto() as any, mockIp);

      expect(spy).toHaveBeenCalledWith(mockIp);
    });
  });
  // ─── verifyEmail() ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('should call authRepository.verifyEmail with the token', async () => {
      authRepo.verifyEmail.mockResolvedValue({
        status: 'success',
        message: 'Email verified successfully.',
      });

      await service.verifyEmail(mockVerificationToken);

      expect(authRepo.verifyEmail).toHaveBeenCalledWith(mockVerificationToken);
      expect(authRepo.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it('should return success response from repository', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Email verified successfully.',
      };
      authRepo.verifyEmail.mockResolvedValue(mockResponse);

      const result = await service.verifyEmail(mockVerificationToken);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate BadRequestException if token is invalid', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Invalid token'));

      await expect(service.verifyEmail(mockVerificationToken)).rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException if token is expired', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Token has expired'));

      await expect(service.verifyEmail(mockVerificationToken)).rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException if token not found', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Token not found'));

      await expect(service.verifyEmail(mockVerificationToken)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty token string', async () => {
      authRepo.verifyEmail.mockRejectedValue(new BadRequestException('Invalid token'));

      await expect(service.verifyEmail('')).rejects.toThrow(BadRequestException);
      expect(authRepo.verifyEmail).toHaveBeenCalledWith('');
    });
  });

  // ─── resendVerificationEmail() ────────────────────────────────────────────────

  describe('resendVerificationEmail', () => {
    beforeEach(() => {
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.findEmailRecord.mockResolvedValue(mockUserEmail());
      authRepo.deleteExistingTokens.mockResolvedValue(undefined);
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
      redisClient.incr.mockResolvedValue(1);
      redisClient.expire.mockResolvedValue(1);
    });

    it('should resend verification email successfully', async () => {
      const result = await service.resendVerificationEmail(mockEmail);

      expect(result.status).toBe('success');
    });

    it('should delete existing token before creating new one', async () => {
      await service.resendVerificationEmail(mockEmail);

      expect(authRepo.deleteExistingTokens).toHaveBeenCalledWith(mockEmail);
      expect(authRepo.createVerificationToken).toHaveBeenCalled();
    });

    it('should call deleteExistingTokens before createVerificationToken', async () => {
      const callOrder: string[] = [];
      authRepo.deleteExistingTokens.mockImplementation(async () => {
        callOrder.push('delete');
      });
      authRepo.createVerificationToken.mockImplementation(async () => {
        callOrder.push('create');
      });

      await service.resendVerificationEmail(mockEmail);

      expect(callOrder).toEqual(['delete', 'create']);
    });

    it('should send email with the new verification token', async () => {
      await service.resendVerificationEmail(mockEmail);
      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        mockEmail,
        mockVerificationToken
      );
    });

    it('should create new verification token with correct args', async () => {
      await service.resendVerificationEmail(mockEmail);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserEmail().userId,
        mockVerificationToken,
        mockEmail,
        expect.any(Date),
        'email_verification'
      );
    });

    it('should increment rate limit counter in Redis', async () => {
      await service.resendVerificationEmail(mockEmail);
      expect(redisClient.incr).toHaveBeenCalledWith(`rate:verify:${mockEmail}`);
    });

    it('should set expiry on rate limit key', async () => {
      await service.resendVerificationEmail(mockEmail);
      expect(redisClient.expire).toHaveBeenCalledWith(`rate:verify:${mockEmail}`, 300);
    });

    it('should throw 429 if rate limit exceeded (attempts > 3)', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(HttpException);
    });

    it('should not send email if rate limit exceeded', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should NOT throw if attempts is exactly 3 (boundary — still allowed)', async () => {
      redisClient.incr.mockResolvedValue(3);

      await expect(service.resendVerificationEmail(mockEmail)).resolves.not.toThrow();
    });

    it('should NOT throw if attempts is 1', async () => {
      redisClient.incr.mockResolvedValue(1);

      await expect(service.resendVerificationEmail(mockEmail)).resolves.not.toThrow();
    });

    it('should throw NotFoundException if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);
      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(NotFoundException);
    });

    it('should not proceed if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);
      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already verified', async () => {
      userService.findEmailRecord.mockResolvedValue({ ...mockUserEmail(), isVerified: true });
      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(BadRequestException);
    });

    it('should not proceed if email already verified', async () => {
      userService.findEmailRecord.mockResolvedValue({ ...mockUserEmail(), isVerified: true });
      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should propagate error if deleteExistingTokens fails', async () => {
      authRepo.deleteExistingTokens.mockRejectedValue(new Error('DB error'));
      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow('DB error');
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should propagate error if sendEmailVerification fails', async () => {
      mailService.sendEmailVerification.mockRejectedValue(new Error('Mail error'));

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow('Mail error');
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      userService.findByEmail.mockResolvedValue(mockUser());
      userService.findByUsername.mockResolvedValue(null);
      userService.findById.mockResolvedValue(mockUser());
      userService.verifyPassword.mockResolvedValue(true);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
    });

    it('should return success response with correct user data on valid email login', async () => {
      const result = await service.login(mockLoginDto() as any, res as any);

      expect(result.status).toBe('success');
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.email).toBe(mockEmail);
      expect(result.data.username).toBe(mockUsername);
    });

    it('should find user by username when email lookup returns null', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(mockUser());

      const result = await service.login(mockLoginDtoWithUsername() as any, res as any);

      expect(userService.findByUsername).toHaveBeenCalledWith(mockUsername);
      expect(result.status).toBe('success');
    });

    it('should not call findByUsername if findByEmail succeeds', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(userService.findByUsername).not.toHaveBeenCalled();
    });

    it('should sign access token with correct payload', async () => {
      await service.login(mockLoginDto() as any, res as any);

      const signSpy = jwtService.sign as jest.Mock;
      const firstCallPayload = signSpy.mock.calls[0][0];
      expect(firstCallPayload.sub).toBe(mockUserId);
      expect(firstCallPayload.email).toBe(mockEmail);
      expect(firstCallPayload.role).toBe('listener');
      expect(firstCallPayload.plan).toBe('free');
    });

    it('should sign refresh token with JWT_REFRESH_SECRET', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('test-refresh-secret');

      await service.login(mockLoginDto() as any, res as any);

      const signSpy = jwtService.sign as jest.Mock;
      const secondCallOptions = signSpy.mock.calls[1][1];
      expect(secondCallOptions.secret).toBe('test-refresh-secret');
    });

    it('should save hashed refresh token in DB (not raw token)', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(authRepo.saveRefreshToken).toHaveBeenCalledWith(
        mockUserId,
        expect.not.stringContaining(mockRefreshToken), // stored value is a hash, not the raw token
        expect.any(Date)
      );
    });

    it('should save refresh token exactly once', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should set access_token httpOnly cookie', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockAccessToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set refresh_token httpOnly cookie', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockRefreshToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set both cookies (called exactly twice)', async () => {
      await service.login(mockLoginDto() as any, res as any);

      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it('should use primary email in the response even when logging in with username', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(mockUser());

      const result = await service.login(mockLoginDtoWithUsername() as any, res as any);

      expect(result.data.email).toBe(mockEmail);
    });

    // ── User not found ─────────────────────────────────────────────────────────

    it('should throw UnauthorizedException if neither email nor username matches', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should not set cookies if user is not found', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── Email not verified ─────────────────────────────────────────────────────

    it('should throw ForbiddenException if email login used with unverified email', async () => {
      userService.findByEmail.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, isPrimary: true, isVerified: false, userId: mockUserId }],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, isPrimary: true, isVerified: false, userId: mockUserId }],
      });

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if primary email is not verified (username login)', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, isPrimary: true, isVerified: false, userId: mockUserId }],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, isPrimary: true, isVerified: false, userId: mockUserId }],
      });

      await expect(service.login(mockLoginDtoWithUsername() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if user has no emails at all', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue({ ...mockUser(), emails: [] });
      userService.findById.mockResolvedValue({ ...mockUser(), emails: [] });

      await expect(service.login(mockLoginDtoWithUsername() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException if user has no primary email', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, isPrimary: false, isVerified: true, userId: mockUserId }],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, isPrimary: false, isVerified: true, userId: mockUserId }],
      });

      await expect(service.login(mockLoginDtoWithUsername() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    // ── Suspended account ──────────────────────────────────────────────────────

    it('should throw ForbiddenException if account is suspended', async () => {
      userService.findByEmail.mockResolvedValue({ ...mockUser(), isSuspended: true });
      userService.findById.mockResolvedValue({ ...mockUser(), isSuspended: true });

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should not verify password if account is suspended', async () => {
      userService.findByEmail.mockResolvedValue({ ...mockUser(), isSuspended: true });
      userService.findById.mockResolvedValue({ ...mockUser(), isSuspended: true });

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(userService.verifyPassword).not.toHaveBeenCalled();
    });

    // ── Wrong password ─────────────────────────────────────────────────────────

    it('should throw UnauthorizedException if password is invalid', async () => {
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should not save refresh token if password is invalid', async () => {
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(authRepo.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('should not set cookies if password is invalid', async () => {
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── Secondary email login ──────────────────────────────────────────────────

    it('should login successfully with a verified secondary email', async () => {
      userService.findByEmail.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: true,
            userId: mockUserId,
          },
        ],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: true,
            userId: mockUserId,
          },
        ],
      });

      const result = await service.login(
        { identifier: 'secondary@example.com', password: 'password' } as any,
        res as any
      );

      expect(result.status).toBe('success');
    });

    it('should use primary email in JWT payload even when logging in with secondary email', async () => {
      userService.findByEmail.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: true,
            userId: mockUserId,
          },
        ],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: true,
            userId: mockUserId,
          },
        ],
      });

      await service.login(
        { identifier: 'secondary@example.com', password: 'password' } as any,
        res as any
      );

      const signSpy = jwtService.sign as jest.Mock;
      const firstCallPayload = signSpy.mock.calls[0][0];
      expect(firstCallPayload.email).toBe(mockEmail); // primary, not secondary
    });

    it('should return primary email in response data when logging in with secondary email', async () => {
      userService.findByEmail.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: true,
            userId: mockUserId,
          },
        ],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: true,
            userId: mockUserId,
          },
        ],
      });

      const result = await service.login(
        { identifier: 'secondary@example.com', password: 'password' } as any,
        res as any
      );

      expect(result.data.email).toBe(mockEmail); // primary, not secondary
    });

    it('should throw ForbiddenException if logging in with unverified secondary email', async () => {
      userService.findByEmail.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: false,
            userId: mockUserId,
          },
        ],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: false,
            userId: mockUserId,
          },
        ],
      });

      await expect(
        service.login(
          { identifier: 'secondary@example.com', password: 'password' } as any,
          res as any
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not set cookies when logging in with unverified secondary email', async () => {
      userService.findByEmail.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: false,
            userId: mockUserId,
          },
        ],
      });
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          {
            email: 'secondary@example.com',
            isPrimary: false,
            isVerified: false,
            userId: mockUserId,
          },
        ],
      });

      await expect(
        service.login(
          { identifier: 'secondary@example.com', password: 'password' } as any,
          res as any
        )
      ).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if findById returns null after finding user', async () => {
      userService.findByEmail.mockResolvedValue(mockUser());
      userService.findById.mockResolvedValue(null); // ← findById returns null

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should not set cookies if findById returns null', async () => {
      userService.findByEmail.mockResolvedValue(mockUser());
      userService.findById.mockResolvedValue(null);

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── DB failure ─────────────────────────────────────────────────────────────

    it('should propagate error if saveRefreshToken fails', async () => {
      authRepo.saveRefreshToken.mockRejectedValue(new Error('DB error'));

      await expect(service.login(mockLoginDto() as any, res as any)).rejects.toThrow('DB error');
    });
  });

  // ─── logout() ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
    });

    it('should return success response', async () => {
      const result = await service.logout(res as any, mockRefreshToken);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Logged out successfully');
    });

    it('should clear accessToken cookie', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should clear refreshToken cookie', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should clear both cookies exactly once each', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('should revoke the hashed refresh token in DB when token is provided', async () => {
      await service.logout(res as any, mockRefreshToken);

      expect(authRepo.revokeRefreshToken).toHaveBeenCalledWith(
        expect.not.stringContaining(mockRefreshToken)
      );
      expect(authRepo.revokeRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should not call revokeRefreshToken if no refresh token provided', async () => {
      await service.logout(res as any, undefined);

      expect(authRepo.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('should still clear cookies and return success even if revoke throws', async () => {
      authRepo.revokeRefreshToken.mockRejectedValue(new Error('DB error'));

      const result = await service.logout(res as any, mockRefreshToken);

      expect(result.status).toBe('success');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('should succeed without a refresh token (logout with only access token)', async () => {
      const result = await service.logout(res as any);

      expect(result.status).toBe('success');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  // ─── refreshTokens() ─────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.findValidRefreshToken.mockResolvedValue(mockStoredRefreshToken());
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
    });

    it('should return success response', async () => {
      const result = await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Token refreshed successfully');
    });

    it('should look up the hashed token in DB (not raw)', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(authRepo.findValidRefreshToken).toHaveBeenCalledWith(
        expect.not.stringContaining(mockRefreshToken) // must be a hash
      );
    });

    it('should revoke the old token before issuing a new one', async () => {
      const callOrder: string[] = [];
      authRepo.revokeRefreshToken.mockImplementation(async () => {
        callOrder.push('revoke');
      });
      authRepo.saveRefreshToken.mockImplementation(async () => {
        callOrder.push('save');
      });

      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(callOrder[0]).toBe('revoke');
      expect(callOrder[1]).toBe('save');
    });

    it('should save the new hashed refresh token in DB', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(authRepo.saveRefreshToken).toHaveBeenCalledWith(
        mockUserId,
        expect.any(String),
        expect.any(Date)
      );
    });

    it('should set new access_token cookie', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        mockAccessToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set new refresh_token cookie', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockRefreshToken,
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should sign new access token with correct payload', async () => {
      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      const signSpy = jwtService.sign as jest.Mock;
      const firstCallPayload = signSpy.mock.calls[0][0];
      expect(firstCallPayload.sub).toBe(mockUserId);
      expect(firstCallPayload.email).toBe(mockEmail);
    });

    it('should sign new refresh token with JWT_REFRESH_SECRET', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('test-refresh-secret');

      await service.refreshTokens(
        mockUserId,
        mockEmail,
        'listener' as any,
        'free' as any,
        mockRefreshToken,
        res as any
      );

      const signSpy = jwtService.sign as jest.Mock;
      const secondCallOptions = signSpy.mock.calls[1][1];
      expect(secondCallOptions.secret).toBe('test-refresh-secret');
    });

    // ── Token not found / revoked ──────────────────────────────────────────────

    it('should throw UnauthorizedException if token not found in DB', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not issue new tokens if stored token is not found', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow();
      expect(authRepo.saveRefreshToken).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── Expired token ──────────────────────────────────────────────────────────

    it('should throw UnauthorizedException if stored token is expired', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(mockExpiredRefreshToken());

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke the expired token before throwing', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(mockExpiredRefreshToken());

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow();
      expect(authRepo.revokeRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should not set cookies if token is expired', async () => {
      authRepo.findValidRefreshToken.mockResolvedValue(mockExpiredRefreshToken());

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── DB failure ─────────────────────────────────────────────────────────────

    it('should propagate error if saveRefreshToken fails', async () => {
      authRepo.saveRefreshToken.mockRejectedValue(new Error('DB error'));

      await expect(
        service.refreshTokens(
          mockUserId,
          mockEmail,
          'listener' as any,
          'free' as any,
          mockRefreshToken,
          res as any
        )
      ).rejects.toThrow('DB error');
    });
  });

  // ─── removeUser() ─────────────────────────────────────────────────────────────

  describe('removeUser', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
      userService.remove.mockResolvedValue(undefined);
    });

    it('should return success response', async () => {
      const result = await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Your account has been deleted successfully.');
    });

    it('should call logout before removing user', async () => {
      const callOrder: string[] = [];
      authRepo.revokeRefreshToken.mockImplementation(async () => {
        callOrder.push('logout');
      });
      userService.remove.mockImplementation(async () => {
        callOrder.push('remove');
      });

      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(callOrder[0]).toBe('logout');
      expect(callOrder[1]).toBe('remove');
    });

    it('should clear both cookies as part of logout', async () => {
      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    });

    it('should call userService.remove with the correct userId', async () => {
      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(userService.remove).toHaveBeenCalledWith(mockUserId);
      expect(userService.remove).toHaveBeenCalledTimes(1);
    });

    it('should revoke refresh token during logout', async () => {
      await service.removeUser(mockUserId, res as any, mockRefreshToken);

      expect(authRepo.revokeRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should still remove user even if refresh token is not provided', async () => {
      const result = await service.removeUser(mockUserId, res as any, undefined);

      expect(userService.remove).toHaveBeenCalledWith(mockUserId);
      expect(result.status).toBe('success');
    });

    it('should propagate error if userService.remove fails', async () => {
      userService.remove.mockRejectedValue(new Error('DB error'));

      await expect(service.removeUser(mockUserId, res as any, mockRefreshToken)).rejects.toThrow(
        'DB error'
      );
    });

    it('should not call userService.remove if logout itself throws', async () => {
      authRepo.revokeRefreshToken.mockRejectedValue(new Error('hard failure'));
      res.clearCookie = jest.fn().mockImplementationOnce(() => {
        throw new Error('cookie error');
      });

      await expect(service.removeUser(mockUserId, res as any, mockRefreshToken)).rejects.toThrow(
        'cookie error'
      );
      expect(userService.remove).not.toHaveBeenCalled();
    });
  });
  // ─── addEmail() ───────────────────────────────────────────────────────────────

  describe('addEmail', () => {
    beforeEach(() => {
      userService.findById.mockResolvedValue(mockUser());
      userService.checkEmailExists.mockResolvedValue(false);
      userService.addEmail.mockResolvedValue(mockNewEmailRecord());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailAddedNotification.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
    });

    it('should return success response with email data', async () => {
      const result = await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(result.status).toBe('success');
      expect(result.data.email).toBe(mockSecondaryEmail);
      expect(result.data.isVerified).toBe(false);
      expect(result.data.verificationSent).toBe(true);
    });

    it('should call addEmail on userService with correct args', async () => {
      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(userService.addEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(userService.addEmail).toHaveBeenCalledTimes(1);
    });

    it('should create verification token for the new email', async () => {
      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserId,
        mockVerificationToken,
        mockSecondaryEmail,
        expect.any(Date),
        'email_verification'
      );
    });

    it('should send verification email to the new email', async () => {
      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        mockSecondaryEmail,
        mockVerificationToken
      );
    });

    it('should notify primary email about the new email addition', async () => {
      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(mailService.sendEmailAddedNotification).toHaveBeenCalledWith(
        mockEmail, // primary email
        mockSecondaryEmail,
        mockUser().displayName
      );
    });

    it('should send notification before verification email', async () => {
      const callOrder: string[] = [];
      mailService.sendEmailAddedNotification.mockImplementation(async () => {
        callOrder.push('notification');
      });
      mailService.sendEmailVerification.mockImplementation(async () => {
        callOrder.push('verification');
      });

      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(callOrder[0]).toBe('notification');
      expect(callOrder[1]).toBe('verification');
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.addEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if email already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.addEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should not add email if it already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.addEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow();
      expect(userService.addEmail).not.toHaveBeenCalled();
    });

    it('should propagate error if addEmail on userService fails', async () => {
      userService.addEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.addEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow('DB error');
    });

    it('should not send emails if createVerificationToken fails', async () => {
      authRepo.createVerificationToken.mockRejectedValue(new Error('DB error'));

      await expect(service.addEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow('DB error');
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should use empty string for notification if user has no primary email', async () => {
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [], // ← no emails at all, find returns undefined
      });
      userService.addEmail.mockResolvedValue(mockNewEmailRecord());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailAddedNotification.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);

      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(mailService.sendEmailAddedNotification).toHaveBeenCalledWith(
        '', // ← empty string fallback
        mockSecondaryEmail,
        mockUser().displayName
      );
    });

    it('should use empty string when no email has isPrimary true', async () => {
      userService.findById.mockResolvedValue({
        ...mockUser(),
        emails: [{ email: mockEmail, isPrimary: false, isVerified: true, userId: mockUserId }],
      });
      userService.addEmail.mockResolvedValue(mockNewEmailRecord());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailAddedNotification.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);

      await service.addEmail(mockUserId, mockSecondaryEmail);

      expect(mailService.sendEmailAddedNotification).toHaveBeenCalledWith(
        '',
        mockSecondaryEmail,
        mockUser().displayName
      );
    });
  });

  // ─── removeEmail() ────────────────────────────────────────────────────────────

  describe('removeEmail', () => {
    beforeEach(() => {
      userService.findById.mockResolvedValue(mockUserWithMultipleEmails());
      userService.removeEmail.mockResolvedValue(undefined);
    });

    it('should return success response', async () => {
      const result = await service.removeEmail(mockUserId, mockSecondaryEmail);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Email removed successfully');
    });

    it('should call removeEmail on userService with correct args', async () => {
      await service.removeEmail(mockUserId, mockSecondaryEmail);

      expect(userService.removeEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(userService.removeEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.removeEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if email not found on user', async () => {
      await expect(service.removeEmail(mockUserId, 'nonexistent@example.com')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if trying to delete the only email', async () => {
      userService.findById.mockResolvedValue(mockUser()); // only one email

      await expect(service.removeEmail(mockUserId, mockEmail)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if trying to delete primary email', async () => {
      await expect(service.removeEmail(mockUserId, mockEmail)).rejects.toThrow(BadRequestException);
    });

    it('should not call removeEmail if email is primary', async () => {
      await expect(service.removeEmail(mockUserId, mockEmail)).rejects.toThrow();
      expect(userService.removeEmail).not.toHaveBeenCalled();
    });

    it('should propagate error if removeEmail on userService fails', async () => {
      userService.removeEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.removeEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow('DB error');
    });
  });

  // ─── getEmails() ──────────────────────────────────────────────────────────────

  describe('getEmails', () => {
    beforeEach(() => {
      userService.getEmails.mockResolvedValue(mockUser().emails);
    });

    it('should return success response with emails array', async () => {
      const result = await service.getEmails(mockUserId);

      expect(result.status).toBe('success');
      expect(Array.isArray(result.emails)).toBe(true);
    });

    it('should call getEmails on userService with correct userId', async () => {
      await service.getEmails(mockUserId);

      expect(userService.getEmails).toHaveBeenCalledWith(mockUserId);
      expect(userService.getEmails).toHaveBeenCalledTimes(1);
    });

    it('should return mapped emails without userId', async () => {
      const result = await service.getEmails(mockUserId);

      result.emails.forEach((e) => {
        expect(e).not.toHaveProperty('userId');
        expect(e).toHaveProperty('email');
        expect(e).toHaveProperty('isPrimary');
        expect(e).toHaveProperty('isVerified');
        expect(e).toHaveProperty('createdAt');
        expect(e).toHaveProperty('updatedAt');
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.getEmails.mockResolvedValue(null);

      await expect(service.getEmails(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if user has no emails', async () => {
      userService.getEmails.mockResolvedValue([]);

      const result = await service.getEmails(mockUserId);

      expect(result.emails).toEqual([]);
    });
  });

  // ─── setPrimaryEmail() ────────────────────────────────────────────────────────

  describe('setPrimaryEmail', () => {
    beforeEach(() => {
      userService.findById.mockResolvedValue(mockUserWithMultipleEmails());
      authRepo.deleteExistingVerificationCodes.mockResolvedValue(undefined);
      authRepo.createVerificationCode.mockResolvedValue(undefined);
      mailService.sendPrimaryEmailChangeCode.mockResolvedValue(undefined);
      jest.spyOn(tokensUtil, 'generateSixDigitCode').mockReturnValue(mockVerificationCode);
    });

    it('should return success response with verification data', async () => {
      const result = await service.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(result.status).toBe('success');
      expect(result.data.verificationRequired).toBe(true);
      expect(result.data.newPrimaryEmail).toBe(mockSecondaryEmail);
      expect(result.data.codeSentTo).toBe(mockEmail); // sent to current primary
      expect(result.data.expiresIn).toBe(600);
    });

    it('should delete existing verification codes before creating new one', async () => {
      await service.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(authRepo.deleteExistingVerificationCodes).toHaveBeenCalledWith(mockUserId);
    });

    it('should delete existing code before creating new one (call order)', async () => {
      const callOrder: string[] = [];
      authRepo.deleteExistingVerificationCodes.mockImplementation(async () => {
        callOrder.push('delete');
      });
      authRepo.createVerificationCode.mockImplementation(async () => {
        callOrder.push('create');
      });

      await service.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(callOrder[0]).toBe('delete');
      expect(callOrder[1]).toBe('create');
    });

    it('should create verification code with correct args', async () => {
      await service.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(authRepo.createVerificationCode).toHaveBeenCalledWith(
        mockUserId,
        mockVerificationCode,
        mockSecondaryEmail,
        expect.any(Date)
      );
    });

    it('should send code to current primary email not the new one', async () => {
      await service.setPrimaryEmail(mockUserId, mockSecondaryEmail);

      expect(mailService.sendPrimaryEmailChangeCode).toHaveBeenCalledWith(
        mockEmail, // current primary — code is sent here
        mockVerificationCode,
        mockUser().displayName,
        mockSecondaryEmail // new primary — for context in the email
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if email not found on user', async () => {
      await expect(service.setPrimaryEmail(mockUserId, 'nonexistent@example.com')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if email is already primary', async () => {
      await expect(service.setPrimaryEmail(mockUserId, mockEmail)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if email is not verified', async () => {
      userService.findById.mockResolvedValue({
        ...mockUserWithMultipleEmails(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          { email: mockSecondaryEmail, isPrimary: false, isVerified: false, userId: mockUserId },
        ],
      });

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should not send code if email is not verified', async () => {
      userService.findById.mockResolvedValue({
        ...mockUserWithMultipleEmails(),
        emails: [
          { email: mockEmail, isPrimary: true, isVerified: true, userId: mockUserId },
          { email: mockSecondaryEmail, isPrimary: false, isVerified: false, userId: mockUserId },
        ],
      });

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow();
      expect(mailService.sendPrimaryEmailChangeCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if no current primary email found', async () => {
      userService.findById.mockResolvedValue({
        ...mockUserWithMultipleEmails(),
        emails: [
          { email: mockEmail, isPrimary: false, isVerified: true, userId: mockUserId },
          { email: mockSecondaryEmail, isPrimary: false, isVerified: true, userId: mockUserId },
        ],
      });

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should propagate error if createVerificationCode fails', async () => {
      authRepo.createVerificationCode.mockRejectedValue(new Error('DB error'));

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        'DB error'
      );
      expect(mailService.sendPrimaryEmailChangeCode).not.toHaveBeenCalled();
    });

    it('should throw 429 if rate limit exceeded in setPrimaryEmail (attempts > 3)', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow(
        HttpException
      );
    });

    it('should not send code if rate limit exceeded in setPrimaryEmail', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).rejects.toThrow();
      expect(mailService.sendPrimaryEmailChangeCode).not.toHaveBeenCalled();
    });

    it('should NOT throw if attempts is exactly 3 in setPrimaryEmail (boundary)', async () => {
      redisClient.incr.mockResolvedValue(3);

      await expect(service.setPrimaryEmail(mockUserId, mockSecondaryEmail)).resolves.not.toThrow();
    });
  });

  // ─── verifyPrimaryEmailChange() ───────────────────────────────────────────────

  describe('verifyPrimaryEmailChange', () => {
    beforeEach(() => {
      authRepo.findValidVerificationCode.mockResolvedValue(mockVerificationCodeRecord());
      authRepo.deleteVerificationCode.mockResolvedValue(undefined);
      userService.setPrimaryEmail.mockResolvedValue(undefined);
    });

    it('should return success response with new primary email', async () => {
      const result = await service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Primary email changed successfully');
      expect(result.data.newPrimary).toBe(mockSecondaryEmail);
    });

    it('should call setPrimaryEmail with correct email from verification record', async () => {
      await service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode);

      expect(userService.setPrimaryEmail).toHaveBeenCalledWith(mockUserId, mockSecondaryEmail);
      expect(userService.setPrimaryEmail).toHaveBeenCalledTimes(1);
    });

    it('should delete verification code after successful change', async () => {
      await service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode);

      expect(authRepo.deleteVerificationCode).toHaveBeenCalledWith(mockVerificationCodeRecord().id);
      expect(authRepo.deleteVerificationCode).toHaveBeenCalledTimes(1);
    });

    it('should call setPrimaryEmail before deleting verification code', async () => {
      const callOrder: string[] = [];
      userService.setPrimaryEmail.mockImplementation(async () => {
        callOrder.push('setPrimary');
      });
      authRepo.deleteVerificationCode.mockImplementation(async () => {
        callOrder.push('deleteCode');
      });

      await service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode);

      expect(callOrder[0]).toBe('setPrimary');
      expect(callOrder[1]).toBe('deleteCode');
    });

    it('should throw BadRequestException if verification code not found', async () => {
      authRepo.findValidVerificationCode.mockResolvedValue(null);

      await expect(
        service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode)
      ).rejects.toThrow(BadRequestException);
    });

    it('should not change primary email if code not found', async () => {
      authRepo.findValidVerificationCode.mockResolvedValue(null);

      await expect(
        service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode)
      ).rejects.toThrow();
      expect(userService.setPrimaryEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if verification code is expired', async () => {
      authRepo.findValidVerificationCode.mockResolvedValue(mockExpiredVerificationCodeRecord());

      await expect(
        service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode)
      ).rejects.toThrow(BadRequestException);
    });

    it('should not change primary email if code is expired', async () => {
      authRepo.findValidVerificationCode.mockResolvedValue(mockExpiredVerificationCodeRecord());

      await expect(
        service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode)
      ).rejects.toThrow();
      expect(userService.setPrimaryEmail).not.toHaveBeenCalled();
    });

    it('should attempt to delete expired code after rejecting', async () => {
      authRepo.findValidVerificationCode.mockResolvedValue(mockExpiredVerificationCodeRecord());

      await expect(
        service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode)
      ).rejects.toThrow();
      expect(authRepo.deleteVerificationCode).toHaveBeenCalledWith(
        mockExpiredVerificationCodeRecord().id
      );
    });

    it('should propagate error if setPrimaryEmail fails', async () => {
      userService.setPrimaryEmail.mockRejectedValue(new Error('DB error'));

      await expect(
        service.verifyPrimaryEmailChange(mockUserId, mockVerificationCode)
      ).rejects.toThrow('DB error');
    });
  });
  // ─── changePasswordRequest() ──────────────────────────────────────────────────

  describe('changePasswordRequest', () => {
    beforeEach(() => {
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.getPrimaryEmail.mockResolvedValue(mockEmail);
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendPasswordReset.mockResolvedValue(undefined);
    });

    it('should return success response with masked email', async () => {
      const result = await service.changePasswordRequest(mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.emailSent).toBe(true);
      expect(result.data.sentTo).toBe(mockEmail);
    });

    it('should call getPrimaryEmail with correct userId', async () => {
      await service.changePasswordRequest(mockUserId);

      expect(userService.getPrimaryEmail).toHaveBeenCalledWith(mockUserId);
      expect(userService.getPrimaryEmail).toHaveBeenCalledTimes(1);
    });

    it('should create verification token with PASSWORD_RESET type', async () => {
      await service.changePasswordRequest(mockUserId);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserId,
        mockVerificationToken,
        mockEmail,
        expect.any(Date),
        'password_reset'
      );
    });

    it('should send password reset email with correct args', async () => {
      await service.changePasswordRequest(mockUserId);

      expect(mailService.sendPasswordReset).toHaveBeenCalledWith(mockEmail, mockVerificationToken);
      expect(mailService.sendPasswordReset).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if no verified primary email found', async () => {
      userService.getPrimaryEmail.mockResolvedValue(null);

      await expect(service.changePasswordRequest(mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should not create token if no primary email found', async () => {
      userService.getPrimaryEmail.mockResolvedValue(null);

      await expect(service.changePasswordRequest(mockUserId)).rejects.toThrow();
      expect(authRepo.createVerificationToken).not.toHaveBeenCalled();
    });

    it('should not send email if no primary email found', async () => {
      userService.getPrimaryEmail.mockResolvedValue(null);

      await expect(service.changePasswordRequest(mockUserId)).rejects.toThrow();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should not send email if createVerificationToken fails', async () => {
      authRepo.createVerificationToken.mockRejectedValue(new Error('DB error'));

      await expect(service.changePasswordRequest(mockUserId)).rejects.toThrow('DB error');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should propagate error if sendPasswordReset fails', async () => {
      mailService.sendPasswordReset.mockRejectedValue(new Error('Mail error'));

      await expect(service.changePasswordRequest(mockUserId)).rejects.toThrow('Mail error');
    });

    it('should increment rate limit counter in Redis', async () => {
      await service.changePasswordRequest(mockUserId);

      expect(redisClient.incr).toHaveBeenCalledWith(`rate:change-password:${mockUserId}`);
    });

    it('should set expiry on rate limit key', async () => {
      await service.changePasswordRequest(mockUserId);

      expect(redisClient.expire).toHaveBeenCalledWith(`rate:change-password:${mockUserId}`, 300);
    });

    it('should throw 429 if rate limit exceeded in changePasswordRequest (attempts > 3)', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.changePasswordRequest(mockUserId)).rejects.toThrow(HttpException);
    });

    it('should not send email if rate limit exceeded in changePasswordRequest', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.changePasswordRequest(mockUserId)).rejects.toThrow();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should NOT throw if attempts is exactly 3 in changePasswordRequest (boundary)', async () => {
      redisClient.incr.mockResolvedValue(3);

      await expect(service.changePasswordRequest(mockUserId)).resolves.not.toThrow();
    });
  });

  // ─── changePassword() ─────────────────────────────────────────────────────────

  describe('changePassword', () => {
    const mockPasswordResetToken = {
      id: 'token-id-123',
      userId: mockUserId,
      token: mockVerificationToken,
      email: mockEmail,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      type: 'password_reset',
    };

    beforeEach(() => {
      authRepo.findPasswordResetToken.mockResolvedValue(mockPasswordResetToken);
      userService.findById.mockResolvedValue(mockUser());
      userService.verifyPassword.mockResolvedValue(false); // different password by default
      userService.updatePassword.mockResolvedValue(undefined);
      authRepo.deleteVerificationToken.mockResolvedValue(undefined);
      authRepo.revokeAllForUser.mockResolvedValue(undefined);
    });

    it('should return success response', async () => {
      const result = await service.changePassword(mockVerificationToken, 'NewPassword123!');

      expect(result.status).toBe('success');
      expect(result.data.passwordChanged).toBe(true);
      expect(result.data.resetAt).toBeInstanceOf(Date);
    });

    it('should call findPasswordResetToken with correct token', async () => {
      await service.changePassword(mockVerificationToken, 'NewPassword123!');

      expect(authRepo.findPasswordResetToken).toHaveBeenCalledWith(mockVerificationToken);
      expect(authRepo.findPasswordResetToken).toHaveBeenCalledTimes(1);
    });

    it('should update password with correct userId', async () => {
      await service.changePassword(mockVerificationToken, 'NewPassword123!');

      expect(userService.updatePassword).toHaveBeenCalledWith(mockUserId, 'NewPassword123!');
      expect(userService.updatePassword).toHaveBeenCalledTimes(1);
    });

    it('should delete token after successful password change', async () => {
      await service.changePassword(mockVerificationToken, 'NewPassword123!');

      expect(authRepo.deleteVerificationToken).toHaveBeenCalledWith(mockPasswordResetToken.id);
      expect(authRepo.deleteVerificationToken).toHaveBeenCalledTimes(1);
    });

    it('should revoke all refresh tokens after password change', async () => {
      await service.changePassword(mockVerificationToken, 'NewPassword123!');

      expect(authRepo.revokeAllForUser).toHaveBeenCalledWith(mockUserId);
      expect(authRepo.revokeAllForUser).toHaveBeenCalledTimes(1);
    });

    it('should delete token before revoking refresh tokens', async () => {
      const callOrder: string[] = [];
      authRepo.deleteVerificationToken.mockImplementation(async () => {
        callOrder.push('delete');
      });
      authRepo.revokeAllForUser.mockImplementation(async () => {
        callOrder.push('revoke');
      });

      await service.changePassword(mockVerificationToken, 'NewPassword123!');

      expect(callOrder).toEqual(['delete', 'revoke']);
    });

    it('should throw BadRequestException if token not found', async () => {
      authRepo.findPasswordResetToken.mockResolvedValue(null);

      await expect(
        service.changePassword(mockVerificationToken, 'NewPassword123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should not update password if token not found', async () => {
      authRepo.findPasswordResetToken.mockResolvedValue(null);

      await expect(
        service.changePassword(mockVerificationToken, 'NewPassword123!')
      ).rejects.toThrow();
      expect(userService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token is expired', async () => {
      authRepo.findPasswordResetToken.mockResolvedValue({
        ...mockPasswordResetToken,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      });

      await expect(
        service.changePassword(mockVerificationToken, 'NewPassword123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should not update password if token is expired', async () => {
      authRepo.findPasswordResetToken.mockResolvedValue({
        ...mockPasswordResetToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.changePassword(mockVerificationToken, 'NewPassword123!')
      ).rejects.toThrow();
      expect(userService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      userService.verifyPassword.mockResolvedValue(true); // same password

      await expect(
        service.changePassword(mockVerificationToken, 'SamePassword123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should not update password if same as current', async () => {
      userService.verifyPassword.mockResolvedValue(true);

      await expect(
        service.changePassword(mockVerificationToken, 'SamePassword123!')
      ).rejects.toThrow();
      expect(userService.updatePassword).not.toHaveBeenCalled();
    });

    it('should propagate error if updatePassword fails', async () => {
      userService.updatePassword.mockRejectedValue(new Error('DB error'));

      await expect(
        service.changePassword(mockVerificationToken, 'NewPassword123!')
      ).rejects.toThrow('DB error');
    });

    it('should not delete token if updatePassword fails', async () => {
      userService.updatePassword.mockRejectedValue(new Error('DB error'));

      await expect(
        service.changePassword(mockVerificationToken, 'NewPassword123!')
      ).rejects.toThrow();
      expect(authRepo.deleteVerificationToken).not.toHaveBeenCalled();
    });
  });

  // ─── forgotPassword() ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    beforeEach(() => {
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.findEmailRecord.mockResolvedValue({ ...mockUserEmail(), isVerified: true });
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendPasswordReset.mockResolvedValue(undefined);
      redisClient.incr.mockResolvedValue(1);
      redisClient.expire.mockResolvedValue(1);
    });

    // ── Email exists and is verified (normal flow) ─────────────────────────────

    it('should return success response for valid verified email', async () => {
      const result = await service.forgotPassword(mockEmail);

      expect(result.status).toBe('success');
      expect(result.data.emailSent).toBe(true);
      expect(result.data.sentTo).toBe(mockEmail);
    });

    it('should create verification token with PASSWORD_RESET type', async () => {
      await service.forgotPassword(mockEmail);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserEmail().userId,
        mockVerificationToken,
        mockEmail,
        expect.any(Date),
        'password_reset'
      );
    });

    it('should send password reset email with correct args', async () => {
      await service.forgotPassword(mockEmail);

      expect(mailService.sendPasswordReset).toHaveBeenCalledWith(mockEmail, mockVerificationToken);
      expect(mailService.sendPasswordReset).toHaveBeenCalledTimes(1);
    });

    it('should increment rate limit counter using userId when email exists', async () => {
      await service.forgotPassword(mockEmail);

      expect(redisClient.incr).toHaveBeenCalledWith(
        `rate:forgot-password:${mockUserEmail().userId}`
      );
    });

    it('should throw 429 if rate limit exceeded for valid email (attempts > 3)', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.forgotPassword(mockEmail)).rejects.toThrow(HttpException);
    });

    it('should not send email if rate limit exceeded for valid email', async () => {
      redisClient.incr.mockResolvedValue(4);

      await expect(service.forgotPassword(mockEmail)).rejects.toThrow();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should not send email if createVerificationToken fails', async () => {
      authRepo.createVerificationToken.mockRejectedValue(new Error('DB error'));

      await expect(service.forgotPassword(mockEmail)).rejects.toThrow('DB error');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should propagate error if sendPasswordReset fails', async () => {
      mailService.sendPasswordReset.mockRejectedValue(new Error('Mail error'));

      await expect(service.forgotPassword(mockEmail)).rejects.toThrow('Mail error');
    });

    // ── Email not found or not verified (silent success — security by obscurity) ─

    it('should return success response even if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      const result = await service.forgotPassword(mockEmail);

      expect(result.status).toBe('success');
      expect(result.data.emailSent).toBe(true);
    });

    it('should return success response even if email is not verified', async () => {
      userService.findEmailRecord.mockResolvedValue({ ...mockUserEmail(), isVerified: false });

      const result = await service.forgotPassword(mockEmail);

      expect(result.status).toBe('success');
    });

    it('should not create token if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      await service.forgotPassword(mockEmail);

      expect(authRepo.createVerificationToken).not.toHaveBeenCalled();
    });

    it('should not send email if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      await service.forgotPassword(mockEmail);

      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should not send email if email is not verified', async () => {
      userService.findEmailRecord.mockResolvedValue({ ...mockUserEmail(), isVerified: false });

      await service.forgotPassword(mockEmail);

      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should increment rate limit counter using email when email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      await service.forgotPassword(mockEmail);

      expect(redisClient.incr).toHaveBeenCalledWith(`rate:forgot-password:${mockEmail}`);
    });

    it('should throw 429 if rate limit exceeded for unknown email (attempts > 3)', async () => {
      userService.findEmailRecord.mockResolvedValue(null);
      redisClient.incr.mockResolvedValue(4);

      await expect(service.forgotPassword(mockEmail)).rejects.toThrow(HttpException);
    });
  });

  // ─── handleOAuthCallback() ────────────────────────────────────────────────────

  describe('handleOAuthCallback', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;

    beforeEach(() => {
      res = mockResponseWithCookie();
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.findById.mockResolvedValue(mockUser());
      userService.createSocialAccount.mockResolvedValue(undefined);
      authRepo.createPendingOauthToken.mockResolvedValue(undefined);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockPendingToken);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
    });

    // ── Case 1: Returning user ─────────────────────────────────────────────────

    it('should return login response for returning user (social account found)', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      const result = (await service.handleOAuthCallback(mockOAuthProfile(), res as any)) as {
        url: string;
        statusCode: number;
      };

      expect(result.url).toContain('/home');
    });

    it('should call findById with userId from social account', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(userService.findById).toHaveBeenCalledWith(mockUserId);
    });

    it('should issue tokens for returning user', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it('should not call findByEmail if social account is found', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(userService.findByEmail).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found for social account', async () => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());
      userService.findById.mockResolvedValue(null);

      await expect(service.handleOAuthCallback(mockOAuthProfile(), res as any)).rejects.toThrow(
        NotFoundException
      );
    });

    // ── Case 2: Email already registered ──────────────────────────────────────

    it('should link social account and login if email already registered', async () => {
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser());

      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(result.url).toContain('/home');
      expect(userService.createSocialAccount).toHaveBeenCalledWith(
        mockUserId,
        'google',
        mockProviderId,
        mockEmail
      );
    });

    it('should issue tokens when linking existing account', async () => {
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should not create pending session if email already registered', async () => {
      userService.findSocialAccount.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser());

      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(authRepo.createPendingOauthToken).not.toHaveBeenCalled();
    });

    // ── Case 3: Brand new user ─────────────────────────────────────────────────

    it('should return registrationIncomplete for brand new user', async () => {
      const result = (await service.handleOAuthCallback(mockOAuthProfile(), res as any)) as {
        url: string;
        statusCode: number;
      };

      expect(result.url).toContain('/complete-oauth-profile');
      expect(result.url).toContain('pendingToken=');
      expect(result.url).toContain('displayName=');
    });

    it('should return pendingToken in response for new user', async () => {
      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);
      expect(result.url).toContain(`pendingToken=${mockPendingToken}`);
    });

    it('should return prefill data for new user', async () => {
      const result = await service.handleOAuthCallback(mockOAuthProfile(), res as any);
      expect(result.url).toContain('displayName=Yara%20Senousy');
    });

    it('should call createPendingOauthToken with correct args for new user', async () => {
      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(authRepo.createPendingOauthToken).toHaveBeenCalledWith(
        mockPendingToken,
        'google',
        mockProviderId,
        mockEmail,
        'Yara',
        'Senousy',
        expect.any(Date)
      );
    });

    it('should not issue tokens for new user', async () => {
      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(authRepo.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('should not call createSocialAccount for new user', async () => {
      await service.handleOAuthCallback(mockOAuthProfile(), res as any);

      expect(userService.createSocialAccount).not.toHaveBeenCalled();
    });
  });

  // ─── completeOAuthProfile() ───────────────────────────────────────────────────

  describe('completeOAuthProfile', () => {
    let res: ReturnType<typeof mockResponseWithCookie>;
    const mockIp = '197.32.45.123';

    beforeEach(() => {
      res = mockResponseWithCookie();
      authRepo.findPendingToken.mockResolvedValue(mockPendingOAuthSession());
      authRepo.deletePendingToken.mockResolvedValue(undefined);
      authRepo.saveRefreshToken.mockResolvedValue(undefined);
      userService.checkUsernameExists.mockResolvedValue(false);
      userService.createOAuthUser.mockResolvedValue(mockUser());
      userService.createSocialAccount.mockResolvedValue(undefined);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-token')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
      jest
        .spyOn(geoipUtil, 'getLocationFromIp')
        .mockReturnValue({ country: 'Egypt', city: 'Cairo' });
    });

    it('should return success response after completing profile', async () => {
      const result = await service.completeOAuthProfile(
        mockCompleteOAuthProfileDto() as any,
        res as any,
        mockIp
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Profile completed and logged in successfully');
    });

    it('should create user with correct data from pending session and form', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(userService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          firstName: 'Yara',
          lastName: 'Senousy',
          displayName: 'Yara Senousy',
          birthdate: '1995-06-15',
          gender: 'female',
        })
      );
    });

    it('should create social account after creating user', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(userService.createSocialAccount).toHaveBeenCalledWith(
        mockUserId,
        'google',
        mockProviderId,
        mockEmail
      );
    });

    it('should call createSocialAccount after createOAuthUser', async () => {
      const callOrder: string[] = [];
      userService.createOAuthUser.mockImplementation(async () => {
        callOrder.push('createOAuthUser');
        return mockUser();
      });
      userService.createSocialAccount.mockImplementation(async () => {
        callOrder.push('createSocialAccount');
      });

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(callOrder[0]).toBe('createOAuthUser');
      expect(callOrder[1]).toBe('createSocialAccount');
    });

    it('should delete pending token after creating user', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(authRepo.deletePendingToken).toHaveBeenCalledWith(mockPendingToken);
      expect(authRepo.deletePendingToken).toHaveBeenCalledTimes(1);
    });

    it('should issue tokens after completing profile', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(authRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('should generate username from displayName', async () => {
      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      const callArg = userService.createOAuthUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy/);
    });

    it('should generate unique username if displayName based username is taken', async () => {
      userService.checkUsernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      const callArg = userService.createOAuthUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy_[a-f0-9]{6}$/);
    });

    it('should pass city and country from IP to createOAuthUser', async () => {
      jest
        .spyOn(geoipUtil, 'getLocationFromIp')
        .mockReturnValue({ country: 'Egypt', city: 'Cairo' });

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(userService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ city: 'Cairo', country: 'Egypt' })
      );
    });

    it('should pass empty string for city when getLocationFromIp returns null city', async () => {
      jest.spyOn(geoipUtil, 'getLocationFromIp').mockReturnValue({ country: 'Egypt', city: null });

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(userService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ city: '', country: 'Egypt' })
      );
    });

    it('should pass empty string for country when getLocationFromIp returns null country', async () => {
      jest.spyOn(geoipUtil, 'getLocationFromIp').mockReturnValue({ country: null, city: 'Cairo' });

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(userService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ city: 'Cairo', country: '' })
      );
    });

    it('should pass empty strings for both when getLocationFromIp returns null', async () => {
      jest.spyOn(geoipUtil, 'getLocationFromIp').mockReturnValue({ country: null, city: null });

      await service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp);

      expect(userService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ city: '', country: '' })
      );
    });

    // ── Invalid token ──────────────────────────────────────────────────────────

    it('should throw NotFoundException if pending token not found', async () => {
      authRepo.findPendingToken.mockResolvedValue(null);

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp)
      ).rejects.toThrow(NotFoundException);
    });

    it('should not create user if pending token not found', async () => {
      authRepo.findPendingToken.mockResolvedValue(null);

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp)
      ).rejects.toThrow();
      expect(userService.createOAuthUser).not.toHaveBeenCalled();
    });

    // ── Expired token ──────────────────────────────────────────────────────────

    it('should throw BadRequestException if pending token is expired', async () => {
      authRepo.findPendingToken.mockResolvedValue(mockExpiredPendingOAuthSession());

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp)
      ).rejects.toThrow(BadRequestException);
    });

    it('should not create user if pending token is expired', async () => {
      authRepo.findPendingToken.mockResolvedValue(mockExpiredPendingOAuthSession());

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp)
      ).rejects.toThrow();
      expect(userService.createOAuthUser).not.toHaveBeenCalled();
    });

    it('should not set cookies if pending token is expired', async () => {
      authRepo.findPendingToken.mockResolvedValue(mockExpiredPendingOAuthSession());

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp)
      ).rejects.toThrow();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    // ── DB failures ────────────────────────────────────────────────────────────

    it('should propagate error if createOAuthUser fails', async () => {
      userService.createOAuthUser.mockRejectedValue(new Error('DB error'));

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp)
      ).rejects.toThrow('DB error');
    });

    it('should not issue tokens if createSocialAccount fails', async () => {
      userService.createSocialAccount.mockRejectedValue(new Error('DB error'));

      await expect(
        service.completeOAuthProfile(mockCompleteOAuthProfileDto() as any, res as any, mockIp)
      ).rejects.toThrow('DB error');
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });
  // ─── linkSocialAccount() ──────────────────────────────────────────────────────

  describe('linkSocialAccount', () => {
    beforeEach(() => {
      userService.findSocialAccount.mockResolvedValue(null);
      userService.createSocialAccount.mockResolvedValue(undefined);
    });

    it('should link social account successfully and return correct response', async () => {
      const result = await service.linkSocialAccount(mockUserId, mockOAuthProfile());

      expect(result.status).toBe('success');
      expect(result.data.provider).toBe('google');
      expect(result.data.providerEmail).toBe(mockEmail);
      expect(result.data.linkedAt).toBeInstanceOf(Date);
    });

    it('should call createSocialAccount with correct args', async () => {
      const profile = mockOAuthProfile();
      await service.linkSocialAccount(mockUserId, profile);

      expect(userService.createSocialAccount).toHaveBeenCalledWith(
        mockUserId,
        profile.provider,
        profile.providerId,
        profile.email
      );
      expect(userService.createSocialAccount).toHaveBeenCalledTimes(1);
    });

    it('should call findSocialAccount before creating', async () => {
      const callOrder: string[] = [];
      userService.findSocialAccount.mockImplementation(async () => {
        callOrder.push('find');
        return null;
      });
      userService.createSocialAccount.mockImplementation(async () => {
        callOrder.push('create');
      });

      await service.linkSocialAccount(mockUserId, mockOAuthProfile());

      expect(callOrder).toEqual(['find', 'create']);
    });

    it('should throw BadRequestException if account already linked to this user', async () => {
      userService.findSocialAccount.mockResolvedValue({
        ...mockSocialAccount(),
        userId: mockUserId, // same user
      });

      await expect(service.linkSocialAccount(mockUserId, mockOAuthProfile())).rejects.toThrow(
        BadRequestException
      );
    });

    it('should not call createSocialAccount if already linked to this user', async () => {
      userService.findSocialAccount.mockResolvedValue({
        ...mockSocialAccount(),
        userId: mockUserId,
      });

      await expect(service.linkSocialAccount(mockUserId, mockOAuthProfile())).rejects.toThrow();
      expect(userService.createSocialAccount).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if account already linked to another user', async () => {
      userService.findSocialAccount.mockResolvedValue({
        ...mockSocialAccount(),
        userId: 'different-user-id', // different user
      });

      await expect(service.linkSocialAccount(mockUserId, mockOAuthProfile())).rejects.toThrow(
        BadRequestException
      );
    });

    it('should not call createSocialAccount if already linked to another user', async () => {
      userService.findSocialAccount.mockResolvedValue({
        ...mockSocialAccount(),
        userId: 'different-user-id',
      });

      await expect(service.linkSocialAccount(mockUserId, mockOAuthProfile())).rejects.toThrow();
      expect(userService.createSocialAccount).not.toHaveBeenCalled();
    });

    it('should work correctly for facebook provider', async () => {
      const facebookProfile = { ...mockOAuthProfile(), provider: 'facebook', providerId: 'fb-123' };

      const result = await service.linkSocialAccount(mockUserId, facebookProfile);

      expect(result.data.provider).toBe('facebook');
      expect(userService.createSocialAccount).toHaveBeenCalledWith(
        mockUserId,
        'facebook',
        'fb-123',
        mockEmail
      );
    });

    it('should propagate error if createSocialAccount fails', async () => {
      userService.createSocialAccount.mockRejectedValue(new Error('DB error'));

      await expect(service.linkSocialAccount(mockUserId, mockOAuthProfile())).rejects.toThrow(
        'DB error'
      );
    });
  });

  // ─── unlinkSocialAccount() ────────────────────────────────────────────────────

  describe('unlinkSocialAccount', () => {
    beforeEach(() => {
      userService.findSocialAccount.mockResolvedValue(mockSocialAccount());
      userService.deleteSocialAccount = jest.fn().mockResolvedValue(undefined);
    });

    it('should unlink social account successfully', async () => {
      const result = await service.unlinkSocialAccount(mockUserId, 'google', mockProviderId);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Social account unlinked successfully');
    });

    it('should call findSocialAccount with correct args', async () => {
      await service.unlinkSocialAccount(mockUserId, 'google', mockProviderId);

      expect(userService.findSocialAccount).toHaveBeenCalledWith('google', mockProviderId);
      expect(userService.findSocialAccount).toHaveBeenCalledTimes(1);
    });

    it('should call deleteSocialAccount with correct args', async () => {
      await service.unlinkSocialAccount(mockUserId, 'google', mockProviderId);

      expect(userService.deleteSocialAccount).toHaveBeenCalledWith('google', mockProviderId);
      expect(userService.deleteSocialAccount).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if social account not found', async () => {
      userService.findSocialAccount.mockResolvedValue(null);

      await expect(
        service.unlinkSocialAccount(mockUserId, 'google', mockProviderId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should not call deleteSocialAccount if account not found', async () => {
      userService.findSocialAccount.mockResolvedValue(null);

      await expect(
        service.unlinkSocialAccount(mockUserId, 'google', mockProviderId)
      ).rejects.toThrow();
      expect(userService.deleteSocialAccount).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if account belongs to another user', async () => {
      userService.findSocialAccount.mockResolvedValue({
        ...mockSocialAccount(),
        userId: 'different-user-id',
      });

      await expect(
        service.unlinkSocialAccount(mockUserId, 'google', mockProviderId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not delete account if it belongs to another user', async () => {
      userService.findSocialAccount.mockResolvedValue({
        ...mockSocialAccount(),
        userId: 'different-user-id',
      });

      await expect(
        service.unlinkSocialAccount(mockUserId, 'google', mockProviderId)
      ).rejects.toThrow();
      expect(userService.deleteSocialAccount).not.toHaveBeenCalled();
    });

    it('should propagate error if deleteSocialAccount fails', async () => {
      userService.deleteSocialAccount.mockRejectedValue(new Error('DB error'));

      await expect(
        service.unlinkSocialAccount(mockUserId, 'google', mockProviderId)
      ).rejects.toThrow('DB error');
    });
  });

  // ─── getSocialAccounts() ──────────────────────────────────────────────────────

  describe('getSocialAccounts', () => {
    const mockAccounts = [
      {
        providerId: mockProviderId,
        provider: 'google',
        providerEmail: mockEmail,
        createdAt: new Date('2025-03-20T13:00:00.000Z'),
      },
      {
        providerId: 'fb-123',
        provider: 'facebook',
        providerEmail: 'yara@facebook.com',
        createdAt: new Date('2025-03-21T09:00:00.000Z'),
      },
    ];

    beforeEach(() => {
      userService.findById.mockResolvedValue(mockUser());
      userService.getSocialAccounts = jest.fn().mockResolvedValue(mockAccounts);
    });

    it('should return success response with correct structure', async () => {
      const result = await service.getSocialAccounts(mockUserId);

      expect(result.status).toBe('success');
      expect(result.data.displayName).toBe(mockUsername);
      expect(result.data.socialAccounts).toHaveLength(2);
    });

    it('should map social accounts with correct fields', async () => {
      const result = await service.getSocialAccounts(mockUserId);

      expect(result.data.socialAccounts[0]).toEqual({
        providerid: mockProviderId,
        provider: 'google',
        providerEmail: mockEmail,
        linkedAt: mockAccounts[0].createdAt,
      });
    });

    it('should call findById with correct userId', async () => {
      await service.getSocialAccounts(mockUserId);

      expect(userService.findById).toHaveBeenCalledWith(mockUserId);
      expect(userService.findById).toHaveBeenCalledTimes(1);
    });

    it('should call getSocialAccounts with correct userId', async () => {
      await service.getSocialAccounts(mockUserId);

      expect(userService.getSocialAccounts).toHaveBeenCalledWith(mockUserId);
      expect(userService.getSocialAccounts).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no social accounts linked', async () => {
      userService.getSocialAccounts.mockResolvedValue([]);

      const result = await service.getSocialAccounts(mockUserId);

      expect(result.data.socialAccounts).toEqual([]);
    });

    it('should throw NotFoundException if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.getSocialAccounts(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should not call getSocialAccounts if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.getSocialAccounts(mockUserId)).rejects.toThrow();
      expect(userService.getSocialAccounts).not.toHaveBeenCalled();
    });

    it('should propagate error if getSocialAccounts fails', async () => {
      userService.getSocialAccounts.mockRejectedValue(new Error('DB error'));

      await expect(service.getSocialAccounts(mockUserId)).rejects.toThrow('DB error');
    });
  });
});
