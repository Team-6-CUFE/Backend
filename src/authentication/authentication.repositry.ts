import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/emailverficationtokens.entity';
import { EmailVerificationCode } from './entities/emailverificationcodes.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthenticationRepository {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,

    @InjectRepository(EmailVerificationCode)
    private readonly codeRepository: Repository<EmailVerificationCode>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>
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
}
