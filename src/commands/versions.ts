/**
 * Versions and log commands
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { resolveContext } from '../config/context.js';
import { requireAuth } from '../auth/credentials.js';
import { listOrganizations, listProjects, listEnvironments, listVersions } from '../api/client.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';

export async function versionsCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

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

    // Get versions
    const versionsData = await listVersions(envData.id);

    await sendTelemetryEvent('cli.versions', { count: versionsData.versions.length });

    if (options.json) {
      output.json({
        environment: context.environment,
        versions: versionsData.versions,
      });
    } else {
      output.info(`Versions for ${context.environment}:\n`);
      
      if (versionsData.versions.length === 0) {
        output.warning('No versions found');
        return;
      }

      // Display as table
      const headers = ['Version', 'Size', 'Created By', 'Created At', 'Type'];
      const rows = versionsData.versions.map(v => [
        v.version_number.toString(),
        `${(v.size_bytes / 1024).toFixed(2)} KB`,
        v.created_by_name || v.created_by.substring(0, 8),
        new Date(v.created_at).toLocaleString(),
        v.is_forced_push ? 'forced' : 'normal',
      ]);

      output.table(headers, rows);
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'VERSIONS_ERROR', message: error.message });
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

export async function logCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

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

    // Get versions (short summary)
    const versionsData = await listVersions(envData.id);
    const recent = versionsData.versions.slice(0, 10); // Latest 10

    await sendTelemetryEvent('cli.log', {});

    if (options.json) {
      output.json({
        environment: context.environment,
        recent_versions: recent,
      });
    } else {
      output.info(`Recent versions for ${context.environment}:\n`);

      if (recent.length === 0) {
        output.warning('No versions found');
        return;
      }

      for (const v of recent) {
        const date = new Date(v.created_at).toLocaleString();
        const type = v.is_forced_push ? '[FORCED]' : '';
        output.info(`v${v.version_number} - ${date} ${type}`);
      }

      if (versionsData.versions.length > 10) {
        output.info(`\n... and ${versionsData.versions.length - 10} more`);
        output.info('Use "envsimple versions" to see all');
      }
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'LOG_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}
