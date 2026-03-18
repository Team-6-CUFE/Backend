import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticationService } from './authentication.service';
import { AuthenticationRepository } from './authentication.repositry';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import * as captchaUtil from '../common/utilities/captcha.util';
import * as tokensUtil from '../common/utilities/tokens.util';
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
} from './test/auth.mock';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let authRepo: ReturnType<typeof mockAuthenticationRepository>;
  let userService: ReturnType<typeof mockUserService>;
  let mailService: ReturnType<typeof mockMailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: AuthenticationRepository, useFactory: mockAuthenticationRepository },
        { provide: UserService, useFactory: mockUserService },
        { provide: MailService, useFactory: mockMailService },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get(AuthenticationService);
    authRepo = module.get(AuthenticationRepository);
    userService = module.get(UserService);
    mailService = module.get(MailService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── register() ──────────────────────────────────────────────────────────────

  describe('register', () => {
    beforeEach(() => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(true);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.checkEmailExists.mockResolvedValue(false);
      userService.checkUsernameExists.mockResolvedValue(false);
      userService.createUser.mockResolvedValue(mockUser());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
    });

    it('should register successfully and return correct response', async () => {
      const result = await service.register(mockRegisterDto() as any);

      expect(result.status).toBe('success');
      expect(result.data.email).toBe(mockEmail);
      expect(result.data.user_id).toBe(mockUserId);
      expect(result.data.email_verified).toBe(false);
      expect(result.data.verification_email_sent).toBe(true);
    });

    it('should call createUser with correct dto (without captchaToken)', async () => {
      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('captchaToken');
      expect(callArg.email).toBe(mockEmail);
      expect(callArg.username).toBe('yara_senousy');
    });

    it('should call createVerificationToken with correct args', async () => {
      await service.register(mockRegisterDto() as any);

      expect(authRepo.createVerificationToken).toHaveBeenCalledWith(
        mockUserId,
        mockVerificationToken,
        mockEmail,
        expect.any(Date)
      );
    });

    it('should call createVerificationToken exactly once', async () => {
      await service.register(mockRegisterDto() as any);

      expect(authRepo.createVerificationToken).toHaveBeenCalledTimes(1);
    });

    it('should send verification email after registration', async () => {
      await service.register(mockRegisterDto() as any);

      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        mockEmail,
        mockVerificationToken
      );
    });

    it('should send verification email exactly once', async () => {
      await service.register(mockRegisterDto() as any);

      expect(mailService.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if captcha is invalid', async () => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(false);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow(BadRequestException);
    });

    it('should not proceed further if captcha fails', async () => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(false);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow();
      expect(userService.checkEmailExists).not.toHaveBeenCalled();
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow(BadRequestException);
    });

    it('should not create user if email already exists', async () => {
      userService.checkEmailExists.mockResolvedValue(true);

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow();
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should generate unique username if username already taken', async () => {
      userService.checkUsernameExists
        .mockResolvedValueOnce(true) // original username taken
        .mockResolvedValueOnce(false); // generated username available

      const result = await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).not.toBe('yara_senousy');
      expect(callArg.username).toMatch(/^yara_senousy_[a-f0-9]{6}$/);
      expect(result.status).toBe('success');
    });

    it('should keep recursing until unique username is found', async () => {
      userService.checkUsernameExists
        .mockResolvedValueOnce(true) // original taken
        .mockResolvedValueOnce(true) // first generated taken
        .mockResolvedValueOnce(false); // second generated available

      await service.register(mockRegisterDto() as any);

      // checkUsernameExists called 3 times total
      expect(userService.checkUsernameExists).toHaveBeenCalledTimes(3);
    });

    it('should not change username if original is available', async () => {
      userService.checkUsernameExists.mockResolvedValue(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toBe('yara_senousy');
    });

    it('should not call createVerificationToken if createUser fails', async () => {
      userService.createUser.mockRejectedValue(new Error('DB error'));

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow('DB error');
      expect(authRepo.createVerificationToken).not.toHaveBeenCalled();
    });

    it('should not send email if createVerificationToken fails', async () => {
      authRepo.createVerificationToken.mockRejectedValue(new Error('DB error'));

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow('DB error');
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should propagate error if sendEmailVerification fails', async () => {
      mailService.sendEmailVerification.mockRejectedValue(new Error('Mail error'));

      await expect(service.register(mockRegisterDto() as any)).rejects.toThrow('Mail error');
    });

    it('should return created_at from the created user', async () => {
      const fixedDate = new Date('2025-01-01T00:00:00Z');
      userService.createUser.mockResolvedValue({ ...mockUser(), created_at: fixedDate });

      const result = await service.register(mockRegisterDto() as any);

      expect(result.data.created_at).toEqual(fixedDate);
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
      authRepo.countRecentVerificationTokens.mockResolvedValue(0);
      authRepo.deleteExistingTokens.mockResolvedValue(undefined);
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
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
        mockUserEmail().user_id,
        mockVerificationToken,
        mockEmail,
        expect.any(Date)
      );
    });

    it('should throw NotFoundException if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(NotFoundException);
    });

    it('should not proceed if email not found', async () => {
      userService.findEmailRecord.mockResolvedValue(null);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(authRepo.countRecentVerificationTokens).not.toHaveBeenCalled();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already verified', async () => {
      userService.findEmailRecord.mockResolvedValue({
        ...mockUserEmail(),
        is_verified: true,
      });

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(BadRequestException);
    });

    it('should not proceed if email already verified', async () => {
      userService.findEmailRecord.mockResolvedValue({
        ...mockUserEmail(),
        is_verified: true,
      });

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow();
      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should throw 429 if rate limit exceeded (count === 3)', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(3);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(
        new HttpException(
          'Too many verification emails sent. Please try again in 5 minutes.',
          HttpStatus.TOO_MANY_REQUESTS
        )
      );
    });

    it('should throw 429 if rate limit exceeded (count > 3)', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(5);

      await expect(service.resendVerificationEmail(mockEmail)).rejects.toThrow(
        new HttpException(
          'Too many verification emails sent. Please try again in 5 minutes.',
          HttpStatus.TOO_MANY_REQUESTS
        )
      );
    });

    it('should NOT throw if count is exactly 2 (boundary — still allowed)', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(2);

      await expect(service.resendVerificationEmail(mockEmail)).resolves.not.toThrow();
    });

    it('should NOT throw if count is 0', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(0);

      await expect(service.resendVerificationEmail(mockEmail)).resolves.not.toThrow();
    });

    it('should not send email if rate limit exceeded', async () => {
      authRepo.countRecentVerificationTokens.mockResolvedValue(3);

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

  // ─── generateUniqueUsername() ─────────────────────────────────────────────────

  describe('generateUniqueUsername (via register)', () => {
    beforeEach(() => {
      jest.spyOn(captchaUtil, 'verifyCaptcha').mockResolvedValue(true);
      jest.spyOn(tokensUtil, 'generateVerificationToken').mockReturnValue(mockVerificationToken);
      userService.checkEmailExists.mockResolvedValue(false);
      userService.createUser.mockResolvedValue(mockUser());
      authRepo.createVerificationToken.mockResolvedValue(undefined);
      mailService.sendEmailVerification.mockResolvedValue(undefined);
    });

    it('should not modify username if original is available', async () => {
      userService.checkUsernameExists.mockResolvedValue(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toBe('yara_senousy');
    });

    it('should generate username with correct pattern if taken once', async () => {
      userService.checkUsernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy_[a-f0-9]{6}$/);
    });

    it('should recurse until a unique username is found', async () => {
      userService.checkUsernameExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.register(mockRegisterDto() as any);

      expect(userService.checkUsernameExists).toHaveBeenCalledTimes(3);
    });

    it('generated username should always start with base username', async () => {
      userService.checkUsernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.register(mockRegisterDto() as any);

      const callArg = userService.createUser.mock.calls[0][0];
      expect(callArg.username).toMatch(/^yara_senousy_/);
    });
  });
});
