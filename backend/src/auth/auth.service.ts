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
    // The same address may exist in two tenants, so every account with it is
    // tried and the one whose password matches signs in.
    const candidates = await this.prisma.user.findMany({
      where: { email: dto.email.trim().toLowerCase() },
    });

    // Compare against a dummy hash when there is no account, so a missing
    // account and a wrong password take a similar amount of time to reject.
    const dummyHash =
      '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';

    let matched: (typeof candidates)[number] | null = null;

    for (const candidate of candidates.length > 0 ? candidates : [null]) {
      const ok = await bcrypt.compare(
        dto.password,
        candidate?.passwordHash ?? dummyHash,
      );

      if (ok && candidate && !matched) {
        matched = candidate;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildResult(matched);
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
