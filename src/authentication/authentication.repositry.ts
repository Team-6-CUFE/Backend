// authentication.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/emailverficationtokens.entity';
import { EmailVerificationCode } from './entities/emailverificationcodes.entity';

@Injectable()
export class AuthenticationRepository {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,

    @InjectRepository(EmailVerificationCode)
    private readonly codeRepository: Repository<EmailVerificationCode>
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
}
