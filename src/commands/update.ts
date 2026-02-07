/**
 * Update command - Update local environment context
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { saveLocalContext, saveSharedContext, resolveContext } from '../config/context.js';
import { requireAuth } from '../auth/credentials.js';
import { listOrganizations, listProjects, listEnvironments } from '../api/client.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';
import { select } from '../utils/prompts.js';

export async function updateCommand(options: CLIOptions & { shared?: boolean }): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

    const context = await resolveContext(options, output);

    if (!context) {
      throw new Error('Context not resolved. Use flags or create .envsimple file.');
    }

    // Interactive environment selection
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
    
    if (envsData.environments.length === 0) {
      throw new Error('No environments found in this project');
    }

    const envId = await select(
      'Select environment to switch to:',
      envsData.environments.map(e => ({
        title: `${e.name} ${e.name === context.environment ? '(current)' : ''}`,
        value: e.id
      })),
      options
    );

    const selectedEnv = envsData.environments.find(e => e.id === envId)!;

    // Save to .envsimple or .envsimple.local based on --shared flag
    if (options.shared) {
      await saveSharedContext({
        org: context.org,
        project: context.project,
        environment: selectedEnv.name,
      });
      output.info(`\n✓ Updated .envsimple`);
    } else {
      await saveLocalContext({ environment: selectedEnv.name });
      output.info(`\n✓ Updated .envsimple.local`);
    }

    await sendTelemetryEvent('cli.update', { 
      environment: selectedEnv.name,
      shared: options.shared || false,
    });

    if (options.json) {
      output.json({
        status: 'success',
        environment: selectedEnv.name,
        file: options.shared ? '.envsimple' : '.envsimple.local',
      });
    } else {
      output.success(`Switched context to "${selectedEnv.name}"`);
      output.info('Run "envsimple pull" to fetch the environment');
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'UPDATE_ERROR', message: error.message });
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
