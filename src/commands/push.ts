/**
 * Push command - Upload local .env to remote
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { resolveContext, getLocalOverrides, loadSharedContext } from '../config/context.js';
import { requireAuth, getServiceToken } from '../auth/credentials.js';
import { listOrganizations, listProjects, listEnvironments, getCurrentVersion, pushVersion } from '../api/client.js';
import { readEnvFile, createBackup, parseEnvContent, formatEnvContent } from '../env/file-ops.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';
import { confirm } from '../utils/prompts.js';
import { ConflictError } from '../utils/errors.js';
import { getVersionInfo, updateVersionInfo } from '../utils/version-tracker.js';

export async function pushCommand(options: CLIOptions & { force?: boolean; token?: boolean }): Promise<void> {
  const output = createOutput(options);

  try {
    let serviceToken: string | undefined;
    
    if (options.token) {
      serviceToken = getServiceToken();
      if (!serviceToken) {
        throw new Error('ENVSIMPLE_SERVICE_TOKEN environment variable is required when using --token flag');
      }
      
      if (!options.org || !options.project || !options.environment) {
        const sharedContext = await loadSharedContext();
        if (!sharedContext) {
          throw new Error('Either .envsimple file or --org, --project, --environment flags are required when using --token flag.');
        }
      }
      
      output.info('✓ Using service token\n');
    } else {
      await requireAuth();
    }

    // Resolve context
    const context = await resolveContext(options, output, process.cwd(), options.token);

    if (!context) {
      throw new Error('Context not resolved. Use flags or create .envsimple file.');
    }

    const envContent = await readEnvFile();
    
    if (!envContent.trim()) {
      throw new Error('.env file is empty or does not exist');
    }

    const localEnv = parseEnvContent(envContent);

    // Get local overrides
    const localOverrides = await getLocalOverrides();

    // Check if local env contains override keys
    const overrideKeys = new Set(Object.keys(localOverrides));
    const envKeys = Object.keys(localEnv);
    const hasOverrides = envKeys.some(k => overrideKeys.has(k));

    if (hasOverrides && !options.force && !options.token) {
      output.warning('Local .env contains keys defined in .envsimple.local overrides:');
      
      for (const key of envKeys) {
        if (overrideKeys.has(key)) {
          output.info(`  - ${key}`);
        }
      }
      
      output.info('\nIf you say "yes", the values from your .env will be pushed to remote.');
      output.info('If you say "no", these keys will be excluded from the push.\n');

      const includeOverrides = await confirm(
        'Include these keys in push?',
        false,
        options
      );

      if (!includeOverrides) {
        const beforeCount = Object.keys(localEnv).length;
        for (const key of Array.from(overrideKeys)) {
          delete localEnv[key];
        }
        const afterCount = Object.keys(localEnv).length;
        output.info(`Excluding ${beforeCount - afterCount} override keys`);
      }
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

    // Get base version from version tracker (unless force push)
    let baseVersionNumber: number | undefined;
    
    if (options.force || options.token) {
      baseVersionNumber = undefined;
      if (!options.token) {
        output.warning('⚠️  Force push: This will overwrite remote changes');
      }
    } else {
      const versionInfo = await getVersionInfo(
        context.org,
        context.project,
        context.environment
      );
      
      if (versionInfo) {
        baseVersionNumber = versionInfo.base_version;
      } else {
        try {
          const currentSnapshot = await getCurrentVersion(envData.id);
          baseVersionNumber = currentSnapshot.version_number;
        } catch (error) {
          baseVersionNumber = undefined;
        }
      }
    }

    if (!options.token) {
      await createBackup();
    }

    const plaintext = formatEnvContent(localEnv);

    try {
      const result = await pushVersion(envData.id, plaintext, baseVersionNumber, serviceToken);

      // Update version tracker with new version
      await updateVersionInfo(
        context.org,
        context.project,
        context.environment,
        result.version.version_number
      );

      await sendTelemetryEvent('cli.push', {
        environment: context.environment,
        version: result.version.version_number,
        is_forced: result.version.is_forced_push,
      });

      if (options.json) {
        output.json({
          status: 'success',
          version: result.version.version_number,
          is_forced_push: result.version.is_forced_push,
          keys: Object.keys(localEnv).length,
        });
      } else {
        output.success(`Pushed version ${result.version.version_number} to ${context.environment}`);
        
        if (result.version.is_forced_push) {
          output.warning('This was a forced push (base version mismatch detected)');
        }
      }
    } catch (error: any) {
      if (error.code === 'CONFLICT' || error.message?.includes('conflict')) {
        output.error('Remote version is newer than your base.');
        output.info('\nRun "envsimple pull" to sync first, then push again.');
        
        if (!options.force && !options.token) {
          const forcePush = await confirm(
            '\nPush anyway (forced push)?',
            false,
            options
          );

          if (forcePush) {
            const result = await pushVersion(envData.id, plaintext, undefined, serviceToken);
            
            await updateVersionInfo(
              context.org,
              context.project,
              context.environment,
              result.version.version_number
            );
            
            if (options.json) {
              output.json({
                status: 'success',
                version: result.version.version_number,
                is_forced_push: true,
                keys: Object.keys(localEnv).length,
              });
            } else {
              output.success(`Forced push: version ${result.version.version_number}`);
            }
            return;
          }
        }

        throw new ConflictError('Push conflict - remote version is newer');
      }

      throw error;
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'PUSH_ERROR', message: error.message });
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
