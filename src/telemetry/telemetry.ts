/**
 * Anonymous telemetry
 */

import { join } from 'path';
import { homedir } from 'os';
import type { TelemetryConfig } from '../utils/types.js';

const TELEMETRY_DIR = join(homedir(), '.envsimple');
const TELEMETRY_FILE = join(TELEMETRY_DIR, 'telemetry.json');

/**
 * Load telemetry config
 */
export async function loadTelemetryConfig(): Promise<TelemetryConfig> {
  try {
    const file = Bun.file(TELEMETRY_FILE);
    const exists = await file.exists();
    
    if (!exists) {
      // Default: enabled with random anonymous ID
      const config: TelemetryConfig = {
        enabled: true,
        anonymousId: Math.random().toString(36).substring(2) + Date.now().toString(36),
      };
      await saveTelemetryConfig(config);
      return config;
    }

    const content = await file.text();
    return JSON.parse(content) as TelemetryConfig;
  } catch (error) {
    // Default config if error
    return {
      enabled: true,
      anonymousId: Math.random().toString(36).substring(2) + Date.now().toString(36),
    };
  }
}

/**
 * Save telemetry config
 */
export async function saveTelemetryConfig(config: TelemetryConfig): Promise<void> {
  try {
    await Bun.write(join(TELEMETRY_DIR, '.keep'), '');
  } catch {}
  
  await Bun.write(TELEMETRY_FILE, JSON.stringify(config, null, 2));
}

/**
 * Enable telemetry
 */
export async function enableTelemetry(): Promise<void> {
  const config = await loadTelemetryConfig();
  config.enabled = true;
  await saveTelemetryConfig(config);
}

/**
 * Disable telemetry
 */
export async function disableTelemetry(): Promise<void> {
  const config = await loadTelemetryConfig();
  config.enabled = false;
  await saveTelemetryConfig(config);
}

/**
 * Send telemetry event (async, non-blocking)
 */
export async function sendTelemetryEvent(
  event: string,
  properties: Record<string, any> = {}
): Promise<void> {
  const config = await loadTelemetryConfig();
  
  if (!config.enabled) {
    return;
  }

  const TELEMETRY_URL = process.env.ENVSIMPLE_API_URL || 'https://api.envsimple.dev';
  const CLI_VERSION = '1.0.0';
  
  const telemetryData = {
    event_name: event,
    cli_version: CLI_VERSION,
    os_type: process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux',
    os_version: Bun.version,
    properties: properties || {},
  };

  // Send asynchronously without blocking
  Promise.resolve().then(async () => {
    try {
      await fetch(`${TELEMETRY_URL}/telemetry/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetryData),
      });
    } catch (error) {
      // Silently ignore telemetry errors
    }
  });
}
