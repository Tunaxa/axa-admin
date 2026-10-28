import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import type { AppKey } from '@prisma/client';

import { AuthService, type AuthResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';
import type { JwtPayload } from './jwt-payload.js';
import { AuthenticatedOnly, Public } from './permissions.decorator.js';
import {
  type EffectivePermissions,
  PermissionsService,
} from './permissions.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly permissions: PermissionsService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  /**
   * Returns the claims of the presented token — the verify half of the
   * scaffold.
   *
   * Authenticated only, with no permission required: the frontend calls it to
   * find out who it is, which has to work before anyone has been given a role.
   */
  @AuthenticatedOnly()
  @Get('me')
  me(@Req() request: AuthenticatedRequest): JwtPayload {
    return request.user;
  }

  /**
   * What the caller may do, optionally within one application.
   *
   * Authenticated only, for the same reason as `/me`: it answers about the
   * caller and nobody else, and a frontend needs it before it can decide
   * which buttons to draw.
   */
  @AuthenticatedOnly()
  @Get('permissions')
  permissionsOfCaller(
    @Req() request: AuthenticatedRequest,
    @Query('app') app?: AppKey,
  ): Promise<EffectivePermissions> {
    return this.permissions.resolve(request.user.org, request.user.sub, app);
  }
}
