import { SetMetadata } from '@nestjs/common';

import type { Permission } from './permissions.js';

export const PUBLIC_KEY = 'auth:public';
export const AUTHENTICATED_KEY = 'auth:authenticated-only';
export const PERMISSIONS_KEY = 'auth:permissions';

/** No token at all — registering, logging in, the health check. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/**
 * A valid token, and nothing more.
 *
 * For the handful of routes that answer only about the caller, and so must
 * work before anybody has been given a role.
 */
export const AuthenticatedOnly = () => SetMetadata(AUTHENTICATED_KEY, true);

/** A valid token and every permission listed. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
