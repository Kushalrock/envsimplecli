/**
 * Login command
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { deviceCodeFlow, browserFlow } from '../auth/flows.js';
import { isAuthenticated } from '../auth/credentials.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';

export async function loginCommand(options: CLIOptions & { device?: boolean }): Promise<void> {
  const output = createOutput(options);

  try {
    // Check if already authenticated
    if (await isAuthenticated()) {
      output.warning('Already logged in');
      
      if (options.json) {
        output.json({ status: 'already_authenticated' });
      }
      return;
    }

    // Use device flow if --device flag or default to device flow
    // (browser flow requires more complex setup)
    if (options.device) {
      await deviceCodeFlow(output);
    } else {
      // Default to device flow for simplicity
      await deviceCodeFlow(output);
    }

    await sendTelemetryEvent('cli.login', { method: options.device ? 'device' : 'browser' });

    if (options.json) {
      output.json({ status: 'success', message: 'Logged in successfully' });
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'LOGIN_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}
