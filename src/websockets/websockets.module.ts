import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebsocketsGateway } from './websockets.gateway';
import { WebsocketsService } from './websockets.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebsocketsGateway, WebsocketsService],
  exports: [WebsocketsService],
})
export class WebsocketsModule {}
