import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { UserModule } from '../user/user.module';
import { MailModule } from '../mail/mail.module';
import { AuthenticationRepository } from './authentication.repositry';
import { EmailVerificationToken } from './entities/emailverficationtokens.entity';
import { EmailVerificationCode } from './entities/emailverificationcodes.entity';
import { UserEmail } from '../user/entities/user-email.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerificationToken, EmailVerificationCode, UserEmail]),
    UserModule,
    MailModule,
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, AuthenticationRepository],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
