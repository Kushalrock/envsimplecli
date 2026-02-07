/**
 * Authentication and credential management
 */

import { join } from 'path';
import { homedir } from 'os';
import type { Credentials } from '../utils/types.js';
import { AuthenticationError } from '../utils/errors.js';

const CREDENTIALS_DIR = join(homedir(), '.envsimple');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

/**
 * Ensure credentials directory exists
 */
async function ensureCredentialsDir(): Promise<void> {
  try {
    await Bun.write(join(CREDENTIALS_DIR, '.keep'), '');
  } catch (error) {
    // Directory creation is handled by Bun.write
  }
}

/**
 * Load stored credentials
 */
export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const file = Bun.file(CREDENTIALS_FILE);
    const exists = await file.exists();
    
    if (!exists) {
      return null;
    }

    const content = await file.text();
    return JSON.parse(content) as Credentials;
  } catch (error) {
    return null;
  }
}

/**
 * Save credentials to disk
 */
export async function saveCredentials(credentials: Credentials): Promise<void> {
  await ensureCredentialsDir();
  await Bun.write(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  
  // Set restrictive permissions on Unix-like systems
  if (process.platform !== 'win32') {
    try {
      await Bun.spawn(['chmod', '600', CREDENTIALS_FILE]).exited;
    } catch (error) {
      // Ignore chmod errors on Windows
    }
  }
}

/**
 * Delete stored credentials
 */
export async function deleteCredentials(): Promise<void> {
  try {
    const file = Bun.file(CREDENTIALS_FILE);
    const exists = await file.exists();
    if (exists) {
      // Use fs for cross-platform compatibility
      const fs = await import('fs/promises');
      await fs.unlink(CREDENTIALS_FILE);
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<void> {
  const credentials = await loadCredentials();
  
  if (!credentials?.refresh_token) {
    throw new AuthenticationError('No refresh token available. Please login again.');
  }

  const BASE_URL = process.env.ENVSIMPLE_API_URL || 'https://api.envsimple.dev';
  
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: credentials.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new AuthenticationError('Token refresh failed. Please login again.');
    }

    const data = await response.json() as any;
    
    // Update credentials with new tokens
    await saveCredentials({
      ...credentials,
      access_token: data.access_token,
      refresh_token: data.refresh_token || credentials.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: data.expires_at,
    });
  } catch (error) {
    throw new AuthenticationError('Token refresh failed. Please login again.');
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const credentials = await loadCredentials();
  return credentials !== null && !!credentials.access_token;
}

/**
 * Require authentication or throw error
 */
export async function requireAuth(): Promise<Credentials> {
  const credentials = await loadCredentials();
  
  if (!credentials || !credentials.access_token) {
    throw new AuthenticationError('Not logged in. Run "envsimple login" first.');
  }

  return credentials;
}

/**
 * Get authorization header value
 */
export async function getAuthHeader(): Promise<string> {
  const credentials = await requireAuth();
  return `Bearer ${credentials.access_token}`;
}
