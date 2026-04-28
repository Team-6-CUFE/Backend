import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { User } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Tells TypeORM to make the User repository available here
    UserModule, // Makes UserService available to AdminService
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository], // Registering both your service and repository here!
})
export class AdminModule {}
