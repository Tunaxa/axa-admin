/**
 * Public surface of `@axa-admin/types`.
 *
 * Every domain type consumed by both the Next.js frontend and the NestJS
 * backend is re-exported here so the two sides of the monorepo can never drift.
 */

export * from './common.js';
export * from './organization.js';
export * from './app.js';
export * from './user.js';
export * from './role.js';
export * from './project.js';
export * from './issue.js';
export * from './activity.js';
export * from './daily-report.js';
export * from './account-request.js';
export * from './app-usage.js';
