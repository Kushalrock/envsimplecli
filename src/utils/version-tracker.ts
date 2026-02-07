/**
 * Version tracking for base version numbers
 * Stores version info separately from .envsimple files
 */

import { join } from 'path';
import { homedir } from 'os';
import type { VersionTracker } from './types.js';

const VERSION_TRACKER_DIR = join(homedir(), '.envsimple');
const VERSION_TRACKER_FILE = join(VERSION_TRACKER_DIR, 'version-tracker.json');

/**
 * Load version tracker data
 */
export async function loadVersionTracker(): Promise<Record<string, VersionTracker>> {
  try {
    const file = Bun.file(VERSION_TRACKER_FILE);
    const exists = await file.exists();
    
    if (!exists) {
      return {};
    }

    const content = await file.text();
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

/**
 * Save version tracker data
 */
export async function saveVersionTracker(data: Record<string, VersionTracker>): Promise<void> {
  await Bun.write(VERSION_TRACKER_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get version info for a specific context
 */
export async function getVersionInfo(
  org: string,
  project: string,
  environment: string
): Promise<VersionTracker | null> {
  const data = await loadVersionTracker();
  const key = `${org}/${project}/${environment}`;
  return data[key] || null;
}

/**
 * Update version info for a specific context
 */
export async function updateVersionInfo(
  org: string,
  project: string,
  environment: string,
  baseVersion: number
): Promise<void> {
  const data = await loadVersionTracker();
  const key = `${org}/${project}/${environment}`;
  
  data[key] = {
    org,
    project,
    environment,
    base_version: baseVersion,
    last_pulled_at: new Date().toISOString(),
  };
  
  await saveVersionTracker(data);
}
