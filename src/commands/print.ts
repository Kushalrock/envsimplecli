/**
 * Print command - Display environment variables
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { readEnvFile, parseEnvContent } from '../env/file-ops.js';
import { getLocalOverrides } from '../config/context.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';

export async function printCommand(options: CLIOptions & { raw?: boolean }): Promise<void> {
  const output = createOutput({ ...options, raw: options.raw });

  try {
    // Read local .env
    const envContent = await readEnvFile();
    
    if (!envContent.trim()) {
      if (options.json) {
        output.json({ keys: {}, count: 0 });
      } else {
        output.warning('.env file is empty or does not exist');
        output.info('\nRun "envsimple pull" to fetch environment variables');
      }
      return;
    }

    const env = parseEnvContent(envContent);

    // Get overrides to indicate which keys are overridden
    const overrides = await getLocalOverrides();
    const overrideKeys = new Set(Object.keys(overrides));

    await sendTelemetryEvent('cli.print', { count: Object.keys(env).length });

    if (options.json) {
      output.json({
        keys: env,
        count: Object.keys(env).length,
        overrides: Object.keys(overrides),
      });
    } else {
      output.info(`Environment variables (${Object.keys(env).length} keys):\n`);
      
      for (const [key, value] of Object.entries(env).sort(([a], [b]) => a.localeCompare(b))) {
        const isOverride = overrideKeys.has(key);
        const displayValue = output.maskSecret(value, options.raw || false);
        const marker = isOverride ? ' (override)' : '';
        
        console.log(output.formatKeyValue(key, value, options.raw || false) + marker);
      }
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'PRINT_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}
