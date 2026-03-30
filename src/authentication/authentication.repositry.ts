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

  async verifyEmail(token: string): Promise<{ status: boolean; message: string }> {
    console.log('verifying email with token', token);
    const record = await this.tokenRepository.findOne({ where: { token } });
    if (!record) {
      return { status: false, message: 'Invalid verification token.' };
    }
    if (record.expiresAt < new Date()) {
      console.log('token expired at', record.expiresAt, 'current time', new Date());
      return { status: false, message: 'Verification token has expired.' };
    }
    // mark verified//
    await this.userEmailRepository.update(
      { email: record.email },
      { isVerified: true, verifiedAt: new Date() }
    );
    // delete token
    await this.tokenRepository.delete(record.id);
    return { status: true, message: 'Email verified successfully.' };
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
