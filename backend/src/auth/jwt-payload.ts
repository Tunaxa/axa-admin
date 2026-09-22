/**
 * The claims AXA Admin puts in an access token.
 *
 * `sub` is the user id and `org` the tenant, so a verified token carries the
 * tenant boundary with it rather than requiring a second lookup.
 */
export interface JwtPayload {
  sub: string;
  org: string;
  email: string;
}
