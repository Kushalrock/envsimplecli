/**
 * Rollback command
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { resolveContext, getLocalOverrides } from '../config/context.js';
import { requireAuth } from '../auth/credentials.js';
import { listOrganizations, listProjects, listEnvironments, rollbackVersion, getCurrentVersion } from '../api/client.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';
import { parseEnvContent, formatEnvContent, applyOverrides, writeEnvFile } from '../env/file-ops.js';
import { updateVersionInfo } from '../utils/version-tracker.js';
import { existsSync } from 'fs';
import { copyFileSync } from 'fs';

export async function rollbackCommand(
  options: CLIOptions & { target?: number }
): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

    if (!options.target) {
      throw new Error('--target flag is required');
    }

    const context = await resolveContext(options, output);

    if (!context) {
      throw new Error('Context not resolved. Use flags or create .envsimple file.');
    }

    // Find environment
    const orgsData = await listOrganizations();
    const orgData = orgsData.organizations.find(o => o.slug === context.org);
    
    if (!orgData) {
      throw new Error(`Organization "${context.org}" not found`);
    }

    const projectsData = await listProjects(context.org);
    const projectData = projectsData.projects.find(p => p.name === context.project);
    
    if (!projectData) {
      throw new Error(`Project "${context.project}" not found`);
    }

    const envsData = await listEnvironments(projectData.id);
    const envData = envsData.environments.find(e => e.name === context.environment);
    
    if (!envData) {
      throw new Error(`Environment "${context.environment}" not found`);
    }

    // Perform rollback
    const result = await rollbackVersion(envData.id, options.target);
    
    // Backup current .env to .env.copy
    if (existsSync('.env')) {
      const backupPath = '.env.copy';
      const timestamp = new Date().toISOString();
      
      if (existsSync(backupPath)) {
        // Append with timestamp separator
        const { readFileSync, appendFileSync } = await import('fs');
        const currentContent = readFileSync('.env', 'utf-8');
        const separator = `\n\n# ===== Backup from ${timestamp} =====\n\n`;
        appendFileSync(backupPath, separator + currentContent);
        output.info('✓ Appended to .env.copy');
      } else {
        copyFileSync('.env', backupPath);
        output.info('✓ Backed up .env to .env.copy');
      }
    }
    
    // Pull the rolled back version and update .env
    const snapshot = await getCurrentVersion(envData.id);
    const baseEnv = parseEnvContent(snapshot.plaintext);
    const localOverrides = await getLocalOverrides();
    const finalEnv = applyOverrides(baseEnv, localOverrides);
    const envContent = formatEnvContent(finalEnv);
    await writeEnvFile(envContent);
    
    // Update version tracker
    await updateVersionInfo(
      context.org,
      context.project,
      context.environment,
      snapshot.version_number
    );
    
    await sendTelemetryEvent('cli.rollback', {
      environment: context.environment,
      from_version: result.rollback.rolled_back_from,
      to_version: result.rollback.rolled_back_to,
    });

    if (options.json) {
      output.json({
        status: 'success',
        rollback: result.rollback,
      });
    } else {
      output.success(
        `Rolled back from v${result.rollback.rolled_back_from} to v${result.rollback.rolled_back_to}`
      );
      output.info(`New version: v${result.rollback.version_number}`);
      output.info(`\n✓ Updated .env with rolled back version`);
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'ROLLBACK_ERROR', message: error.message });
    } else {
      if (error.code === 'PERMISSION_DENIED') {
        output.error('Unauthorized: ' + error.message);
      } else {
        output.error(error.message);
      }
    }
    process.exit(error.exitCode || 1);
  }
}
