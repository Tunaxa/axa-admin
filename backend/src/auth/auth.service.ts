import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './jwt-payload.js';

/** What the auth endpoints return. Never includes the password hash. */
export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    organizationId: string;
    email: string;
    name: string;
  };
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: dto.organizationId,
          email: dto.email,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'A user with that email already exists in this organization',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        organizationId: dto.organizationId,
        email: dto.email,
        name: dto.name,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
    });

    return this.buildResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: dto.organizationId,
          email: dto.email,
        },
      },
    });

    // Compare against a dummy hash when the user does not exist, so a missing
    // account and a wrong password take a similar amount of time to reject.
    const passwordHash =
      user?.passwordHash ??
      '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const passwordMatches = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildResult(user);
  }

  private async buildResult(user: {
    id: string;
    organizationId: string;
    email: string;
    name: string;
  }): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      org: user.organizationId,
      email: user.email,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        name: user.name,
      },
    };
  }
}
