import type { AppKey } from './app.js';
import type { IsoDateTime, TenantScopedEntity } from './common.js';

/**
 * A point-in-time health and revenue reading for one application.
 *
 * Snapshots are stored rather than computed on read so the App Usage module and
 * the KPI dashboard can chart history without querying external providers.
 */
export interface AppUsageSnapshot extends TenantScopedEntity {
  app: AppKey;
  /** Start of the period this snapshot summarises. */
  capturedAt: IsoDateTime;
  deployment: DeploymentHealth;
  reliability: ReliabilityHealth;
  growth: GrowthMetrics;
}

export interface DeploymentHealth {
  lastDeployedAt: IsoDateTime | null;
  lastDeployStatus: DeployStatus | null;
  /** Latest CI conclusion for the app's default branch. */
  ciStatus: CiStatus | null;
  /** Deploys completed during the snapshot period. */
  deployCount: number;
}

export type DeployStatus = 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';

export type CiStatus = 'passing' | 'failing' | 'pending' | 'unknown';

export interface ReliabilityHealth {
  /** Share of requests that errored, expressed as a ratio between 0 and 1. */
  errorRate: number | null;
  /** Share of the period the app was available, as a ratio between 0 and 1. */
  uptime: number | null;
  /** 95th percentile response time in milliseconds. */
  p95ResponseMs: number | null;
}

export interface GrowthMetrics {
  signups: number | null;
  activeAccounts: number | null;
  /** Monthly recurring revenue in minor currency units, e.g. cents. */
  mrrMinorUnits: number | null;
  currency: string | null;
}

/** A tracked company objective shown on the KPI dashboard. */
export interface CompanyKpi extends TenantScopedEntity {
  key: string;
  label: string;
  /** Scoped to one app, or null for a company-wide KPI. */
  app: AppKey | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  /** Whether a higher value is better, used for trend colouring. */
  higherIsBetter: boolean;
}
