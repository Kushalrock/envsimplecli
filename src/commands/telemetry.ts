/**
 * Telemetry commands
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { loadTelemetryConfig, enableTelemetry, disableTelemetry } from '../telemetry/telemetry.js';

export async function telemetryEnableCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    await enableTelemetry();

    if (options.json) {
      output.json({ status: 'success', enabled: true });
    } else {
      output.success('Telemetry enabled');
      output.info('Anonymous usage data will be collected to improve EnvSimple');
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'TELEMETRY_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}

export async function telemetryDisableCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    await disableTelemetry();

    if (options.json) {
      output.json({ status: 'success', enabled: false });
    } else {
      output.success('Telemetry disabled');
      output.info('No usage data will be collected');
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'TELEMETRY_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}

export async function telemetryStatusCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    const config = await loadTelemetryConfig();

    if (options.json) {
      output.json({
        enabled: config.enabled,
        anonymous_id: config.anonymousId,
      });
    } else {
      output.info(`Telemetry: ${config.enabled ? 'enabled' : 'disabled'}`);
      
      if (config.enabled) {
        output.info(`Anonymous ID: ${config.anonymousId}`);
      }
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'TELEMETRY_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}
