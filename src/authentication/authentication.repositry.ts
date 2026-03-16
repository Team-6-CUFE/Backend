// authentication.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/emailverficationtokens.entity';
import { EmailVerificationCode } from './entities/emailverificationcodes.entity';
import { UserEmail } from '../user/entities/user-email.entity';

@Injectable()
export class AuthenticationRepository {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,

    @InjectRepository(EmailVerificationCode)
    private readonly codeRepository: Repository<EmailVerificationCode>,
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

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    console.log('verifying email with token', token);
    const record = await this.tokenRepository.findOne({ where: { token } });
    // if(record)
    // {
    //     console.log('record found for token', token, 'record email', record.email, 'record expiry', record.expires_at);
    // }
    if (!record) {
      return { success: false, message: 'Invalid verification token.' };
    }
    if (record.expires_at < new Date()) {
      console.log('token expired at', record.expires_at, 'current time', new Date());
      return { success: false, message: 'Verification token has expired.' };
    }
    // mark verified//
    await this.userEmailRepository.update({ email: record.email }, { is_verified: true });
    // delete token
    await this.tokenRepository.delete(record.id);
    return { success: true, message: 'Email verified successfully.' };
  }
}
