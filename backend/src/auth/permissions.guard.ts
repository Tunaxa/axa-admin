import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard.js';
import {
  AUTHENTICATED_KEY,
  PERMISSIONS_KEY,
  PUBLIC_KEY,
} from './permissions.decorator.js';
import type { Permission } from './permissions.js';
import { PermissionsService } from './permissions.service.js';

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
    private readonly permissions: PermissionsService,
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
   * No application scope here: the guard runs before the handler, so it
   * cannot know which application a request concerns when that comes from the
   * record being acted on. Route-level permissions are the floor; the
   * per-application rule is enforced where the record is loaded.
   *
   * A user with no membership has no permissions — registering creates an
   * account, and a place on the team is granted separately. The one exception
   * is an organization whose roster is empty.
   */
  private async permissionsOf(
    organizationId: string,
    userId: string,
  ): Promise<readonly Permission[]> {
    // "Could you do this anywhere", not "may you do this here": the guard runs
    // before the handler and cannot know which application a request concerns
    // when that comes from the record. The handler re-checks with the record
    // in hand — see `PermissionsService.anywhere`.
    const anywhere = await this.permissions.anywhere(organizationId, userId);

    if (anywhere.length > 0) {
      return anywhere;
    }

    // Without this the feature locks the door and posts the key inside:
    // adding the first member needs `team:manage`, which needs a membership,
    // which nobody has. While a tenant has no members at all, any account in
    // it may build the roster — and nothing else.
    return (await this.permissions.isBootstrapping(organizationId))
      ? ['team:manage']
      : [];
  }
}
