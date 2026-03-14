import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { UserModule } from '../user/user.module';
import { MailModule } from '../mail/mail.module';

@Module({
  controllers: [AuthenticationController],
  providers: [AuthenticationService],
  imports: [UserModule, MailModule],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
