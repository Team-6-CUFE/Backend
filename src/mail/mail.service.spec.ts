import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const mockMailerService = {
  sendMail: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'FRONTEND_URL') return 'https://harmonica.app';
    return null;
  }),
};

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailerService, useValue: mockMailerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  // ─── sendEmailVerification ────────────────────────────────────────────────

  describe('sendEmailVerification', () => {
    it('should send email with correct recipient and subject', async () => {
      await service.sendEmailVerification('user@example.com', 'abc123');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Verify Your Email Address',
          template: 'verify-email',
        })
      );
    });

    it('should include the verification URL with the token in context', async () => {
      await service.sendEmailVerification('user@example.com', 'mytoken');

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.verificationUrl).toBe(
        'https://harmonica.app/api/auth/verify-email/mytoken'
      );
    });

    it('should include the email in context', async () => {
      await service.sendEmailVerification('user@example.com', 'tok');

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.email).toBe('user@example.com');
    });
  });

  // ─── sendPasswordReset ────────────────────────────────────────────────────

  describe('sendPasswordReset', () => {
    it('should send email with correct recipient and subject', async () => {
      await service.sendPasswordReset('user@example.com', 'resettoken');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset Your Password',
          template: 'reset-password',
        })
      );
    });

    it('should include the reset URL with the token as query param in context', async () => {
      await service.sendPasswordReset('user@example.com', 'tok123');

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.resetUrl).toBe('https://harmonica.app/change-password?token=tok123');
    });
  });

  // ─── sendWelcomeEmail ─────────────────────────────────────────────────────

  describe('sendWelcomeEmail', () => {
    it('should send email with correct recipient and subject', async () => {
      await service.sendWelcomeEmail('user@example.com', 'john_doe');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          template: 'welcome',
        })
      );
    });

    it('should include the username and loginUrl in context', async () => {
      await service.sendWelcomeEmail('user@example.com', 'john_doe');

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.username).toBe('john_doe');
      expect(call.context.loginUrl).toBe('https://harmonica.app/login');
    });
  });

  // ─── sendEmailAddedNotification ───────────────────────────────────────────

  describe('sendEmailAddedNotification', () => {
    it('should send to primary email with correct subject', async () => {
      await service.sendEmailAddedNotification(
        'primary@example.com',
        'new@example.com',
        'John Doe'
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'primary@example.com',
          subject: 'New Email Added to Your Account',
          template: 'email-added',
        })
      );
    });

    it('should include display_name and newEmail in context', async () => {
      await service.sendEmailAddedNotification(
        'primary@example.com',
        'new@example.com',
        'John Doe'
      );

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.display_name).toBe('John Doe');
      expect(call.context.newEmail).toBe('new@example.com');
    });

    it('should include the current year in context', async () => {
      await service.sendEmailAddedNotification('p@e.com', 'n@e.com', 'User');

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.year).toBe(new Date().getFullYear());
    });
  });

  // ─── sendPrimaryEmailChangeCode ───────────────────────────────────────────

  describe('sendPrimaryEmailChangeCode', () => {
    it('should send to the specified email with correct subject', async () => {
      await service.sendPrimaryEmailChangeCode(
        'old@example.com',
        '123456',
        'John Doe',
        'new@example.com'
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'old@example.com',
          subject: 'Verify Primary Email Change',
          template: 'primary-email-change',
        })
      );
    });

    it('should include display_name, code, and new_primary_email in context', async () => {
      await service.sendPrimaryEmailChangeCode(
        'old@example.com',
        '654321',
        'Jane Doe',
        'new@example.com'
      );

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.display_name).toBe('Jane Doe');
      expect(call.context.code).toBe('654321');
      expect(call.context.new_primary_email).toBe('new@example.com');
    });
  });

  // ─── sendPrimaryEmailChangeConfirmation ───────────────────────────────────

  describe('sendPrimaryEmailChangeConfirmation', () => {
    it('should send two emails — one to old address, one to new', async () => {
      await service.sendPrimaryEmailChangeConfirmation(
        'old@example.com',
        'new@example.com',
        'john_doe'
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should send to old email with old-address template', async () => {
      await service.sendPrimaryEmailChangeConfirmation(
        'old@example.com',
        'new@example.com',
        'john_doe'
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'old@example.com',
          template: 'primary-email-changed-old',
          context: expect.objectContaining({ username: 'john_doe', newEmail: 'new@example.com' }),
        })
      );
    });

    it('should send to new email with new-address template', async () => {
      await service.sendPrimaryEmailChangeConfirmation(
        'old@example.com',
        'new@example.com',
        'john_doe'
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@example.com',
          template: 'primary-email-changed-new',
          context: expect.objectContaining({ username: 'john_doe' }),
        })
      );
    });
  });

  // ─── sendFirstMessageEmail ────────────────────────────────────────────────

  describe('sendFirstMessageEmail', () => {
    it('should send to recipient email with subject containing sender username', async () => {
      await service.sendFirstMessageEmail('recipient@example.com', 'alice', 'bob');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'bob sent you a message',
        })
      );
    });

    it("should use 'first-message' template", async () => {
      await service.sendFirstMessageEmail('recipient@example.com', 'alice', 'bob');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ template: 'first-message' })
      );
    });

    it('should include recipientUsername, senderUsername, and messagesUrl in context', async () => {
      await service.sendFirstMessageEmail('recipient@example.com', 'alice', 'bob');

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.recipientUsername).toBe('alice');
      expect(call.context.senderUsername).toBe('bob');
      expect(call.context.messagesUrl).toBeDefined();
    });

    it('should build correct messagesUrl from FRONTEND_URL config', async () => {
      await service.sendFirstMessageEmail('recipient@example.com', 'alice', 'bob');

      const call = mockMailerService.sendMail.mock.calls[0][0];
      expect(call.context.messagesUrl).toBe('https://harmonica.app/messages');
    });
  });
});
