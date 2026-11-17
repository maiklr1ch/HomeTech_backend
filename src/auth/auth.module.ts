import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginLimiter } from './login-limiter';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SessionService } from './session.service';

@Global()
@Module({
  controllers: [AuthController, ProfileController],
  providers: [AuthService, ProfileService, SessionService, LoginLimiter, AuthGuard],
  exports: [AuthGuard, SessionService],
})
export class AuthModule {}
