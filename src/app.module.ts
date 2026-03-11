import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // UsersModule,
    // AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
