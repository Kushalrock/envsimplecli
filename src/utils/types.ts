/**
 * Core types for EnvSimple CLI
 */

export interface SharedContext {
  org: string;
  project: string;
  environment: string;
}

export interface LocalContext extends Partial<SharedContext> {
  overrides?: Record<string, string>;
}

export interface ResolvedContext {
  org: string;
  project: string;
  environment: string;
  source: 'flags' | 'local' | 'shared' | 'interactive';
}

export interface Credentials {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: string;
  account_id: string;
  organization_id?: string;
}

export interface Environment {
  id: string;
  name: string;
  type?: string;
  current_version_number: number | null;
  is_locked?: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  version_number: number;
  size_bytes: number;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  is_forced_push: boolean;
  base_version_number: number | null;
}

export interface VersionSnapshot {
  environment_id: string;
  environment_name: string;
  version_id?: string;
  version_number: number;
  plaintext: string;
  size_bytes?: number;
  created_by?: string;
  created_at: string;
  is_forced_push?: boolean;
  base_version_number?: number | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'team' | 'scale';
  is_locked?: boolean;
  locked_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  organization_id: string;
  environment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: {
    type: string;
    id: string;
    email?: string;
    name?: string;
  };
  resource: {
    type: string;
    id: string;
  };
  metadata: string | Record<string, any>;
  created_at: string;
}

export interface CLIOptions {
  json?: boolean;
  debug?: boolean;
  raw?: boolean;
  org?: string;
  project?: string;
  environment?: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  anonymousId: string;
}

export interface VersionTracker {
  org: string;
  project: string;
  environment: string;
  base_version: number;
  last_pulled_at: string;
}
