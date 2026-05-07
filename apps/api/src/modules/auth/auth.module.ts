import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';

// Marked @Global so AuthService (and the guards that depend on it) resolve
// inside any module that uses @UseGuards(AuthGuard) directly without forcing
// every feature module to import AuthModule explicitly. The APP_GUARD
// registrations below still apply globally — they just need AuthService in
// scope wherever the guards are reconstructed.
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRateLimitGuard,
    // Register AuthGuard and RoleGuard as global APP_GUARDs so every route in
    // the application is protected by default. Routes that should be publicly
    // accessible must be decorated with @Public().
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
