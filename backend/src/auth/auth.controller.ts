import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import type { AppKey } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, type AuthResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
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
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolves an organization's id from its slug, so the login form can take a
   * human-friendly slug instead of a UUID.
   */
  @Public()
  @Get('organizations/by-slug')
  async resolveOrgSlug(
    @Query('slug') slug: string,
  ): Promise<{ id: string; slug: string; name: string }> {
    if (!slug) throw new NotFoundException('Organization not found');
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org) throw new NotFoundException('Organization not found');
    return { id: org.id, slug: org.slug, name: org.name };
  }

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
