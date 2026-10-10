import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../prisma/prisma.service.js';
import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard.js';
import {
  AUTHENTICATED_KEY,
  PERMISSIONS_KEY,
  PUBLIC_KEY,
} from './permissions.decorator.js';
import { type Permission, permissionsFor } from './permissions.js';

/**
 * The guard every request goes through.
 *
 * It is registered globally rather than per controller, and it **denies by
 * default**: a route that declares nothing is refused. A new endpoint added
 * without thinking about who may call it therefore fails loudly in
 * development, instead of shipping open — which is how this project has been
 * running until now, with every authenticated member able to do everything.
 *
 * It runs `JwtAuthGuard` itself rather than sitting beside it, because a
 * global guard runs *before* controller guards: asking Nest for both would
 * mean checking permissions before anything had verified the token.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtGuard: JwtAuthGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) {
      return true;
    }

    await this.jwtGuard.canActivate(context);

    if (this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, targets)) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      targets,
    );

    if (!required) {
      // Not a caller's mistake — a route nobody declared. Loud in the log,
      // opaque in the response, because the caller can do nothing about it.
      this.logger.error(
        `${context.getClass().name}.${context.getHandler().name} declares no permissions and was refused`,
      );

      throw new ForbiddenException('This action is not available');
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = await this.permissionsOf(
      request.user.org,
      request.user.sub,
    );

    const missing = required.filter(
      (permission) => !granted.includes(permission),
    );

    if (missing.length > 0) {
      throw new ForbiddenException(`Requires ${missing.join(', ')}`);
    }

    return true;
  }

  /**
   * What this person may do in this tenant.
   *
   * A user with no membership has no permissions: registering creates an
   * account, and a place on the team is granted separately. The one exception
   * is an organization whose roster is empty — see `bootstrapping`.
   */
  private async permissionsOf(
    organizationId: string,
    userId: string,
  ): Promise<readonly Permission[]> {
    const member = await this.prisma.teamMember.findFirst({
      where: { userId, organizationId },
      select: { role: true },
    });

    if (member) {
      return permissionsFor(member.role);
    }

    return (await this.bootstrapping(organizationId)) ? ['team:manage'] : [];
  }

  /**
   * Is this organization's roster still empty?
   *
   * Without this the feature locks the door and posts the key inside: adding
   * the first member needs `team:manage`, which needs a membership, which
   * nobody has. So while a tenant has no members at all, any account in it may
   * build the roster — and nothing else.
   *
   * The cost is that whoever registers first in an empty tenant can appoint
   * themselves. Seeding an owner at provisioning time would close that, and is
   * the better answer once there is a provisioning step to hang it on.
   */
  private async bootstrapping(organizationId: string): Promise<boolean> {
    const members = await this.prisma.teamMember.count({
      where: { organizationId },
    });

    return members === 0;
  }
}
