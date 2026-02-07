/**
 * Logout command
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { deleteCredentials, isAuthenticated } from '../auth/credentials.js';
import { signOut } from '../api/client.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';

export async function logoutCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    if (!(await isAuthenticated())) {
      output.warning('Not logged in');
      
      if (options.json) {
        output.json({ status: 'not_authenticated' });
      }
      return;
    }

    // Try to revoke session on server
    try {
      await signOut();
    } catch (error) {
      // Ignore errors - credentials will be deleted locally anyway
    }

    // Delete local credentials
    await deleteCredentials();

    await sendTelemetryEvent('cli.logout', {});

    if (options.json) {
      output.json({ status: 'success', message: 'Logged out successfully' });
    } else {
      output.success('Logged out successfully');
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'LOGOUT_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}
