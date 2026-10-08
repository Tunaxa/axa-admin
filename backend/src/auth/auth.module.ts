import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';

/**
 * Authentication scaffolding.
 *
 * Tokens are issued and verified locally. This is provisional: the
 * ecosystem-wide shared-auth/SSO decision is still open, and if AXA adopts a
 * shared identity provider the issuing half moves out of this module while the
 * verifying half stays.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('JWT_SECRET is not set');
        }

        return {
          secret,
          signOptions: {
            // `expiresIn` is a template-literal type from `ms`, so the value
            // read from configuration has to be narrowed to it.
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
              '15m') as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard],
  // `JwtModule` is exported alongside the guard: `@UseGuards(JwtAuthGuard)`
  // makes Nest instantiate the guard in the *consuming* module, so that module
  // needs `JwtService` in scope. Exporting only the guard resolves at compile
  // time and fails at boot.
  exports: [JwtAuthGuard, PermissionsGuard, JwtModule],
})
export class AuthModule {}
