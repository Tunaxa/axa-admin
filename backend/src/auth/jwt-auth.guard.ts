import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { JwtPayload } from './jwt-payload.js';

/** A request that has passed through `JwtAuthGuard`. */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the decoded
 * claims to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;

    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');

    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
