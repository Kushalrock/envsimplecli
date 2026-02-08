/**
 * API client for EnvSimple backend
 */

import { getAuthHeader } from '../auth/credentials.js';
import { handleAPIError, APIError } from '../utils/errors.js';
import type {
  Environment,
  Version,
  VersionSnapshot,
  Organization,
  Project,
  AuditLog,
} from '../utils/types.js';

// Base URL - should be configurable
const BASE_URL = process.env.ENVSIMPLE_API_URL || 'https://api.envsimple.dev';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  requireAuth?: boolean;
  serviceToken?: string;
}

/**
 * Make HTTP request with error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    requireAuth = true,
    serviceToken,
  } = options;

  const url = `${BASE_URL}${endpoint}`;
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requireAuth) {
    try {
      const authHeader = await getAuthHeader(serviceToken);
      requestHeaders['Authorization'] = authHeader;
    } catch (error) {
      throw error;
    }
  }

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestInit);
    
    // Parse response body
    let responseBody: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }
    } else {
      responseBody = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      handleAPIError(response, responseBody);
    }

    return responseBody as T;
  } catch (error: any) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError(
        'Network error: Unable to connect to EnvSimple API',
        'NETWORK_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Device code flow - Start
 */
export async function startDeviceFlow(clientInfo: {
  client_name: string;
  client_version: string;
  os_name?: string;
  machine_name?: string;
}): Promise<{
  device_code: string;
  user_code: string;
  verification_url: string;
  verification_url_complete: string;
  expires_in: number;
  interval: number;
}> {
  return request('/auth/device/start', {
    method: 'POST',
    body: clientInfo,
    requireAuth: false,
  });
}

/**
 * Device code flow - Poll
 */
export async function pollDeviceCode(device_code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  return request('/auth/device/poll', {
    method: 'POST',
    body: { device_code },
    requireAuth: false,
  });
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<{
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
  };
  session: {
    id: string;
  };
}> {
  return request('/auth/me', { method: 'GET' });
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await request('/api/auth/sign-out', { method: 'POST' });
}

/**
 * List organizations
 */
export async function listOrganizations(): Promise<{ organizations: Organization[] }> {
  return request('/orgs', { method: 'GET' });
}

/**
 * Get organization by slug
 */
export async function getOrganization(slug: string): Promise<{ organization: Organization }> {
  return request(`/orgs/${slug}`, { method: 'GET' });
}

/**
 * List projects in organization
 */
export async function listProjects(orgSlug: string, nameFilter?: string): Promise<{ projects: Project[] }> {
  const query = nameFilter ? `?name=${encodeURIComponent(nameFilter)}` : '';
  return request(`/orgs/${orgSlug}/projects${query}`, { method: 'GET' });
}

/**
 * List environments in project
 */
export async function listEnvironments(projectId: string, nameFilter?: string): Promise<{ environments: Environment[] }> {
  const query = nameFilter ? `?name=${encodeURIComponent(nameFilter)}` : '';
  return request(`/projects/${projectId}/envs${query}`, { method: 'GET' });
}

/**
 * Create environment
 */
export async function createEnvironment(
  projectId: string,
  name: string,
  type?: string
): Promise<{ environment: Environment }> {
  return request(`/projects/${projectId}/envs`, {
    method: 'POST',
    body: { name, type },
  });
}

/**
 * Clone environment (atomic server-side)
 */
export async function cloneEnvironment(
  projectId: string,
  sourceEnvId: string,
  destinationName: string,
  destinationType?: string
): Promise<{
  environment: Environment;
  cloned_from: {
    environment_id: string;
    environment_name: string;
    version_number: number;
  };
}> {
  return request(`/projects/${projectId}/envs/${sourceEnvId}/clone`, {
    method: 'POST',
    body: {
      destination_name: destinationName,
      destination_type: destinationType,
    },
  });
}

/**
 * Get current version of environment
 */
export async function getCurrentVersion(envId: string, serviceToken?: string): Promise<VersionSnapshot> {
  return request(`/envs/${envId}/current`, { method: 'GET', serviceToken });
}

/**
 * Get specific version by number
 */
export async function getVersionSnapshot(
  envId: string,
  versionNumber: number,
  serviceToken?: string
): Promise<VersionSnapshot> {
  return request(`/envs/${envId}/versions/${versionNumber}`, { method: 'GET', serviceToken });
}

/**
 * Push new version
 */
export async function pushVersion(
  envId: string,
  plaintext: string,
  baseVersionNumber?: number,
  serviceToken?: string
): Promise<{
  version: {
    id: string;
    version_number: number;
    is_forced_push: boolean;
  };
}> {
  const body: any = { plaintext };
  if (baseVersionNumber !== undefined) {
    body.base_version_number = baseVersionNumber;
  }
  
  return request(`/envs/${envId}/versions`, {
    method: 'POST',
    body,
    serviceToken,
  });
}

/**
 * List versions
 */
export async function listVersions(envId: string): Promise<{ versions: Version[] }> {
  return request(`/envs/${envId}/versions`, { method: 'GET' });
}

/**
 * Rollback to version
 */
export async function rollbackVersion(
  envId: string,
  targetVersionNumber: number
): Promise<{
  rollback: {
    version_id: string;
    version_number: number;
    rolled_back_from: number;
    rolled_back_to: number;
  };
}> {
  return request(`/envs/${envId}/rollback`, {
    method: 'POST',
    body: { target_version_number: targetVersionNumber },
  });
}

/**
 * Soft delete environment
 */
export async function deleteEnvironment(envId: string): Promise<{ message: string }> {
  return request(`/envs/${envId}/delete`, { method: 'POST' });
}

/**
 * Hard delete environment
 */
export async function hardDeleteEnvironment(envId: string): Promise<{ message: string }> {
  return request(`/envs/${envId}`, { method: 'DELETE' });
}

/**
 * Get audit logs
 */
export async function getAuditLogs(params: {
  organization_id: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
}): Promise<{ logs: AuditLog[] }> {
  const queryParams = new URLSearchParams();
  queryParams.set('organization_id', params.organization_id);
  
  if (params.start_time) queryParams.set('start_time', params.start_time);
  if (params.end_time) queryParams.set('end_time', params.end_time);
  if (params.limit) queryParams.set('limit', params.limit.toString());

  return request(`/audit-logs?${queryParams.toString()}`, { method: 'GET' });
}
