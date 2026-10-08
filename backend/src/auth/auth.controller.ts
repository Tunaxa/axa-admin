import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';

import { AuthService, type AuthResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';
import type { JwtPayload } from './jwt-payload.js';
import { AuthenticatedOnly, Public } from './permissions.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

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
}
