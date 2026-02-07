/**
 * Environment management commands (env list, create, clone, delete)
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { resolveContext, saveLocalContext, clearContextIfMatches } from '../config/context.js';
import { requireAuth } from '../auth/credentials.js';
import {
  listOrganizations,
  listProjects,
  listEnvironments,
  createEnvironment,
  cloneEnvironment,
  deleteEnvironment,
  hardDeleteEnvironment,
} from '../api/client.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';
import { confirm } from '../utils/prompts.js';

export async function envListCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

    const context = await resolveContext(options, output);

    if (!context) {
      throw new Error('Context not resolved. Use flags or create .envsimple file.');
    }

    // Find project
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

    // List environments
    const envsData = await listEnvironments(projectData.id);

    await sendTelemetryEvent('cli.env.list', { count: envsData.environments.length });

    if (options.json) {
      output.json({
        project: context.project,
        environments: envsData.environments,
      });
    } else {
      output.info(`Environments in ${context.project}:\n`);

      if (envsData.environments.length === 0) {
        output.warning('No environments found');
        return;
      }

      for (const env of envsData.environments) {
        const version = env.current_version_number ? `v${env.current_version_number}` : 'no versions';
        const marker = env.name === context.environment ? ' (current)' : '';
        output.info(`  ${env.name} - ${version}${marker}`);
      }
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'ENV_LIST_ERROR', message: error.message });
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

export async function envCreateCommand(name: string, options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

    const context = await resolveContext(options, output);

    if (!context) {
      throw new Error('Context not resolved. Use flags or create .envsimple file.');
    }

    // Find project
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

    // Create environment
    const { environment } = await createEnvironment(projectData.id, name);

    // Auto-update .envsimple.local to switch to new environment
    await saveLocalContext({ environment: name });

    await sendTelemetryEvent('cli.env.create', { name });

    if (options.json) {
      output.json({
        status: 'success',
        environment: environment,
        switched_to: name,
      });
    } else {
      output.success(`Created environment "${name}"`);
      output.info(`Switched local context to "${name}"`);
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'ENV_CREATE_ERROR', message: error.message });
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

export async function envCloneCommand(
  sourceName: string,
  destName: string,
  options: CLIOptions
): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

    const context = await resolveContext(options, output);

    if (!context) {
      throw new Error('Context not resolved. Use flags or create .envsimple file.');
    }

    // Find project and environments
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
    const sourceEnv = envsData.environments.find(e => e.name === sourceName);

    if (!sourceEnv) {
      throw new Error(`Source environment "${sourceName}" not found`);
    }

    // Clone environment
    const { environment } = await cloneEnvironment(projectData.id, sourceEnv.id, destName);

    // Auto-update .envsimple.local
    await saveLocalContext({ environment: destName });

    await sendTelemetryEvent('cli.env.clone', { source: sourceName, dest: destName });

    if (options.json) {
      output.json({
        status: 'success',
        source: sourceName,
        destination: destName,
        environment: environment,
        switched_to: destName,
      });
    } else {
      output.success(`Cloned "${sourceName}" to "${destName}"`);
      output.info(`Switched local context to "${destName}"`);
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'ENV_CLONE_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}

export async function envDeleteCommand(
  options: CLIOptions & { permanent?: boolean }
): Promise<void> {
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

    // Confirm deletion
    const deleteType = options.permanent ? 'permanently delete' : 'soft delete';
    const confirmed = await confirm(
      `Are you sure you want to ${deleteType} environment "${context.environment}"?`,
      false,
      options
    );

    if (!confirmed) {
      output.info('Cancelled');
      return;
    }

    // Delete
    if (options.permanent) {
      await hardDeleteEnvironment(envData.id);
    } else {
      await deleteEnvironment(envData.id);
    }

    await clearContextIfMatches(context.environment);

    await sendTelemetryEvent('cli.env.delete', {
      environment: context.environment,
      permanent: options.permanent || false,
    });

    if (options.json) {
      output.json({
        status: 'success',
        environment: context.environment,
        permanent: options.permanent || false,
      });
    } else {
      const action = options.permanent ? 'Permanently deleted' : 'Soft deleted';
      output.success(`${action} environment "${context.environment}"`);
      
      if (!options.permanent) {
        output.info('Environment can be restored from dashboard');
      }
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'ENV_DELETE_ERROR', message: error.message });
    } else {
      output.error(error.message);
    }
    process.exit(error.exitCode || 1);
  }
}
