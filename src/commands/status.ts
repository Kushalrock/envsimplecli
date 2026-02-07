/**
 * Status command - Display current context and permissions
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { resolveContext, saveSharedContext } from '../config/context.js';
import { listOrganizations, listProjects, listEnvironments } from '../api/client.js';
import { select } from '../utils/prompts.js';
import { requireAuth } from '../auth/credentials.js';
import { getCurrentUser, getOrganization } from '../api/client.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';

export async function statusCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    // Require authentication
    await requireAuth();

    // Try to get user info
    let userData;
    try {
      userData = await getCurrentUser();
    } catch (error: any) {
      if (options.json) {
        output.json({
          authenticated: true,
          message: 'Authenticated (user info unavailable)',
        });
      } else {
        output.success('✓ Authenticated');
        output.info('\nCredentials are valid and stored.');
        output.info('Session token is present and can be used for API calls.');
      }
      return;
    }

    let context = await resolveContext(options, output);

    if (!context) {
      if (options.json) {
        output.json({
          authenticated: true,
          user: userData.user,
          context: null,
          message: 'No context configured. Use flags or create .envsimple file.',
        });
        return;
      }

      output.info('No context configured. Please select your target:\n');
      // List organizations
      const orgsData = await listOrganizations();
      const org = await select(
        'Select organization:',
        orgsData.organizations.map(o => ({ title: `${o.name} (${o.slug})`, value: o.slug })),
        options
      );

      // List projects
      const projectsData = await listProjects(org);
      const project = await select(
        'Select project:',
        projectsData.projects.map(p => ({ title: p.name, value: p.id })),
        options
      );

      // List environments
      const envsData = await listEnvironments(project);
      const envId = await select(
        'Select environment:',
        envsData.environments.map(e => ({ title: e.name, value: e.id })),
        options
      );
      const selectedEnv = envsData.environments.find(e => e.id === envId)!;

      context = {
        org,
        project: projectsData.projects.find(p => p.id === project)!.name,
        environment: selectedEnv.name,
        source: 'interactive',
      };
      
      await saveSharedContext({
        org: context.org,
        project: context.project,
        environment: context.environment,
      });
      output.info('\n✓ Context saved to .envsimple\n');
    }

    const orgData = await getOrganization(context.org);

    if (options.json) {
      output.json({
        authenticated: true,
        user: userData.user,
        context: {
          organization: orgData.organization,
          project: context.project,
          environment: context.environment,
          source: context.source,
        },
      });
    } else {
      output.success(`Authenticated as ${userData.user.email}\n`);
      output.info(`Organization: ${orgData.organization.name} (${orgData.organization.slug})`);
      output.info(`Project:      ${context.project}`);
      output.info(`Environment:  ${context.environment}`);
      output.info(`Context from: ${context.source}`);
      
      if (orgData.organization.is_locked) {
        output.warning(`\nOrganization is locked: ${orgData.organization.locked_reason}`);
      }
    }

    await sendTelemetryEvent('cli.status', {});
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'STATUS_ERROR', message: error.message });
    } else {
      output.error(`Error: ${error.message}`);
    }
    process.exit(error.exitCode || 1);
  }
}
