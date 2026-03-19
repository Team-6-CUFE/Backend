import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { EmailVerificationToken } from './entities/emailverficationtokens.entity';
import { EmailVerificationCode } from './entities/emailverificationcodes.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserEmail } from '../user/entities/user-email.entity';

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
    private readonly userEmailRepository: Repository<UserEmail>
  ) {}

  async createVerificationToken(
    userId: string,
    token: string,
    email: string,
    expiryDate: Date
  ): Promise<EmailVerificationToken> {
    const verificationToken = this.tokenRepository.create({
      user_id: userId,
      token,
      expires_at: expiryDate,
      email,
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
      user_id: userId,
      code,
      expires_at: expiryDate,
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
        user_id: userId,
        code,
      },
    });
  }

  async deleteVerificationCode(id: string): Promise<void> {
    await this.codeRepository.delete(id);
  }

  async deleteExistingVerificationCodes(userId: string): Promise<void> {
    await this.codeRepository.delete({ user_id: userId });
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const entity = this.refreshTokenRepository.create({
      user_id: userId,
      token,
      expires_at: expiresAt,
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
    await this.refreshTokenRepository.delete({ user_id: userId });
  }

  async verifyEmail(token: string): Promise<{ status: boolean; message: string }> {
    console.log('verifying email with token', token);
    const record = await this.tokenRepository.findOne({ where: { token } });
    // if(record)
    // {
    //     console.log('record found for token', token, 'record email', record.email, 'record expiry', record.expires_at);
    // }
    if (!record) {
      return { status: false, message: 'Invalid verification token.' };
    }
    if (record.expires_at < new Date()) {
      console.log('token expired at', record.expires_at, 'current time', new Date());
      return { status: false, message: 'Verification token has expired.' };
    }
    // mark verified//
    await this.userEmailRepository.update(
      { email: record.email },
      { is_verified: true, verified_at: new Date() }
    );
    // delete token
    await this.tokenRepository.delete(record.id);
    return { status: true, message: 'Email verified successfully.' };
  }

  async deleteExistingTokens(email: string): Promise<void> {
    await this.tokenRepository.delete({ email });
  }

  async countRecentVerificationTokens(email: string): Promise<number> {
    return this.tokenRepository.count({
      where: {
        email,
        created_at: MoreThanOrEqual(new Date(Date.now() - 60 * 60 * 1000)), // last 1 hour
      },
    });
  }
}
