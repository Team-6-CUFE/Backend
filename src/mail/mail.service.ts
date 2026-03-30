import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService
  ) {}

  /**
   * Send email verification link
   */
  async sendEmailVerification(email: string, token: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email/${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify Your Email Address',
      template: 'verify-email',
      context: {
        verificationUrl,
        email,
      },
    });
  }

  /**
   * Send password reset link
   */
  async sendPasswordReset(email: string, token: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Your Password',
      template: 'reset-password',
      context: {
        resetUrl,
        email,
      },
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, username: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to SoundCloud Clone!',
      template: 'welcome',
      context: {
        username,
        loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
      },
    });
  }

  /**
   * Send notification when new email is added
   */
  async sendEmailAddedNotification(primaryEmail: string, newEmail: string, displayName: string) {
    await this.mailerService.sendMail({
      to: primaryEmail,
      subject: 'New Email Added to Your Account',
      template: 'email-added',
      context: {
        display_name: displayName,
        newEmail,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send primary email change verification code
   */
  async sendPrimaryEmailChangeCode(
    email: string,
    code: string,
    displayName: string,
    newPrimaryEmail: string
  ) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify Primary Email Change',
      template: 'primary-email-change',
      context: {
        display_name: displayName,
        code,
        new_primary_email: newPrimaryEmail,
      },
    });
  }

  /**
   * Send confirmation after primary email change
   */
  async sendPrimaryEmailChangeConfirmation(oldEmail: string, newEmail: string, username: string) {
    // Send to old email
    await this.mailerService.sendMail({
      to: oldEmail,
      subject: 'Your Primary Email Has Been Changed',
      template: 'primary-email-changed-old',
      context: {
        username,
        newEmail,
      },
    });

    // Send to new email
    await this.mailerService.sendMail({
      to: newEmail,
      subject: 'You Are Now the Primary Email',
      template: 'primary-email-changed-new',
      context: {
        username,
      },
    });
  }
}
