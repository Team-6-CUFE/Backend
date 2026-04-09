import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { EmailVerificationToken, TokenType } from './entities/emailverficationtokens.entity';
import { EmailVerificationCode } from './entities/emailverificationcodes.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserEmail } from '../user/entities/user-email.entity';
import { PendingOAuthToken } from './entities/pending-oauth.entity';

@Injectable()
export class AuthenticationRepository {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,

    @InjectRepository(EmailVerificationCode)
    private readonly codeRepository: Repository<EmailVerificationCode>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    @InjectRepository(UserEmail)
    private readonly userEmailRepository: Repository<UserEmail>,

    @InjectRepository(PendingOAuthToken)
    private readonly pendingOauthRepository: Repository<PendingOAuthToken>
  ) {}

  async createPendingOauthToken(
    token: string,
    provider: string,
    providerId: string,
    email: string,
    firstName: string,
    lastName: string,
    expiresAt: Date
  ): Promise<PendingOAuthToken> {
    const pendingOauthToken = this.pendingOauthRepository.create({
      token,
      provider,
      providerId,
      email,
      firstName,
      lastName,
      expiresAt,
    });
    return this.pendingOauthRepository.save(pendingOauthToken);
  }

  async findPendingToken(token: string): Promise<PendingOAuthToken | null> {
    return this.pendingOauthRepository.findOne({
      where: { token },
    });
  }

  async deletePendingToken(token: string): Promise<void> {
    await this.pendingOauthRepository.delete({ token });
  }

  async createVerificationToken(
    userId: string,
    token: string,
    email: string,
    expiryDate: Date,
    type: TokenType
  ): Promise<EmailVerificationToken> {
    const verificationToken = this.tokenRepository.create({
      userId,
      token,
      expiresAt: expiryDate,
      email,
      type,
    });
    return this.tokenRepository.save(verificationToken);
  }

  async createVerificationCode(
    userId: string,
    code: string,
    email: string,
    expiryDate: Date
  ): Promise<EmailVerificationCode> {
    const verificationCode = this.codeRepository.create({
      userId,
      code,
      expiresAt: expiryDate,
      email,
    });
    return this.codeRepository.save(verificationCode);
  }

  async findValidVerificationCode(
    userId: string,
    code: string
  ): Promise<EmailVerificationCode | null> {
    return this.codeRepository.findOne({
      where: {
        userId,
        code,
      },
    });
  }

  async deleteVerificationCode(id: string): Promise<void> {
    await this.codeRepository.delete(id);
  }

  async deleteExistingVerificationCodes(userId: string): Promise<void> {
    await this.codeRepository.delete({ userId });
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const entity = this.refreshTokenRepository.create({
      userId,
      token,
      expiresAt,
    });
    await this.refreshTokenRepository.save(entity);
  }

  async findValidRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { token },
    });
  }

  /** Hard-delete one token (logout / rotation) */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.delete({ token });
  }

  /** Hard-delete all tokens for a user (logout-all-devices) */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async verifyEmail(token: string): Promise<string> {
    const getHtmlTemplate = (title: string, message: string, isSuccess: boolean) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: "Interstate","Lucida Grande","Lucida Sans Unicode","Lucida Sans",Garuda,Verdana,Tahoma,sans-serif;
            line-height: 1.6;
            color: #f2f2f2; /* Light text for dark mode */
            background-color: #111111; /* SoundCloud dark background */
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            background-color: #222222; /* Slightly lighter card background */
            border-radius: 4px;
            padding: 40px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border-top: 6px solid #FF5500; /* Signature Orange */
            text-align: center;
          }
          .logo {
            margin-bottom: 25px;
            font-size: 26px;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: -1px;
          }
          .icon {
            font-size: 40px;
            margin-bottom: 10px;
            display: block;
          }
          h2 {
            color: #ffffff;
            margin-top: 0;
            font-weight: 300;
            font-size: 22px;
          }
          .message {
            color: #cccccc;
            margin: 20px 0;
            font-size: 15px;
          }
          .button-container {
            margin-top: 35px;
          }
          .button {
            display: inline-block;
            padding: 12px 28px;
            background-color: #FF5500;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 3px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            transition: background-color 0.2s ease;
          }
          .button:hover {
            background-color: #ff7733;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #333333;
            font-size: 11px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            Harmonica
          </div>
          
          <h2>${title}</h2>
          
          <p class="message">${message}</p>

          ${
            isSuccess
              ? `<div class="button-container">
            <a href="${process.env.FRONTEND_URL}" class="button">
              Launch Player
            </a>
          </div>`
              : ''
          }
          
          <div class="footer">
            <p>&copy; 2026 Harmonica &bull; Berlin &bull; Worldwide</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const record = await this.tokenRepository.findOne({ where: { token } });
    if (!record) {
      return getHtmlTemplate(
        'Invalid Token',
        'The verification link is invalid or has already been used.',
        false
      );
    }
    if (record.expiresAt < new Date()) {
      return getHtmlTemplate('Token Expired', 'The verification token has expired.', false);
    }
    // mark verified//
    await this.userEmailRepository.update(
      { email: record.email },
      { isVerified: true, verifiedAt: new Date() }
    );
    // delete token
    await this.tokenRepository.delete(record.id);
    return getHtmlTemplate(
      'Success!',
      'Your email has been verified successfully. You can now log in to your account.',
      true
    );
  }

  async deleteExistingTokens(email: string): Promise<void> {
    await this.tokenRepository.delete({ email });
  }

  async findPasswordResetToken(token: string): Promise<EmailVerificationToken | null> {
    return this.tokenRepository.findOne({
      where: {
        token,
        type: TokenType.PASSWORD_RESET,
        expiresAt: MoreThanOrEqual(new Date()), // only return if not expired
      },
    });
  }

  async deleteVerificationToken(tokenId: string): Promise<void> {
    await this.tokenRepository.delete(tokenId);
  }
}
