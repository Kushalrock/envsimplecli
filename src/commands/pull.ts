/**
 * Pull command - Fetch and write environment snapshot
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { resolveContext, getLocalOverrides, saveSharedContext } from '../config/context.js';
import { requireAuth } from '../auth/credentials.js';
import { listOrganizations, listProjects, listEnvironments, getCurrentVersion } from '../api/client.js';
import { writeEnvFile, ensureGitignore, parseEnvContent, formatEnvContent, applyOverrides, readEnvFile } from '../env/file-ops.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';
import { select, confirm } from '../utils/prompts.js';
import { updateVersionInfo } from '../utils/version-tracker.js';
import { existsSync, copyFileSync } from 'fs';

export async function pullCommand(options: CLIOptions): Promise<void> {
  const output = createOutput(options);

  try {
    // Require authentication
    await requireAuth();
    
    output.info('✓ Authenticated\n');


    // Resolve context (interactive if needed)
    let context = await resolveContext(options, output);

    if (!context) {
      if (options.json) {
        output.json({
          error: 'CONTEXT_REQUIRED',
          message: 'No context configured. Use --org, --project, --environment flags or create .envsimple file.',
        });
        process.exit(1);
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
      output.info('✓ Context saved to .envsimple\n');
    }

    output.info(`Pulling ${context.org}/${context.project}/${context.environment}...\n`);

    // Find environment ID
    const orgsData = await listOrganizations();
    const orgData = orgsData.organizations.find(o => o.slug === context!.org);
    
    if (!orgData) {
      throw new Error(`Organization "${context.org}" not found`);
    }

    const projectsData = await listProjects(context.org);
    const projectData = projectsData.projects.find(p => p.name === context!.project);
    
    if (!projectData) {
      throw new Error(`Project "${context.project}" not found`);
    }

    const envsData = await listEnvironments(projectData.id);
    const envData = envsData.environments.find(e => e.name === context!.environment);
    
    if (!envData) {
      throw new Error(`Environment "${context.environment}" not found`);
    }

    // Fetch current version
    const snapshot = await getCurrentVersion(envData.id);

    // Parse environment
    const baseEnv = parseEnvContent(snapshot.plaintext);

    // Check if pulling empty or no version - confirm before overwriting
    const keyCount = Object.keys(baseEnv).length;
    if ((snapshot.version_number === 0 || keyCount === 0) && !options.json) {
      output.warning(`⚠️  This environment has ${keyCount === 0 ? 'no keys' : `version ${snapshot.version_number}`}`);
      const shouldContinue = await confirm(
        'This will overwrite your local .env file. Continue?',
        false,
        options
      );
      
      if (!shouldContinue) {
        output.info('Pull cancelled');
        process.exit(0);
      }
    }

    // Apply local overrides
    const localOverrides = await getLocalOverrides();
    const finalEnv = applyOverrides(baseEnv, localOverrides);

    // Check for mismatch with current .env and create backup if different
    const envContent = formatEnvContent(finalEnv);
    
    if (existsSync('.env')) {
      try {
        const currentContent = await readEnvFile();
        
        // Compare content (normalize line endings for comparison)
        const normalizedCurrent = currentContent.replace(/\r\n/g, '\n').trim();
        const normalizedNew = envContent.replace(/\r\n/g, '\n').trim();
        
        if (normalizedCurrent !== normalizedNew && normalizedCurrent !== '') {
          // Content differs - create backup
          const backupPath = '.env.copy';
          const timestamp = new Date().toISOString();
          
          if (existsSync(backupPath)) {
            // Append with timestamp separator
            const { readFileSync, appendFileSync } = await import('fs');
            const existingBackup = readFileSync(backupPath, 'utf-8');
            const separator = `\n\n# ===== Backup from ${timestamp} =====\n\n`;
            appendFileSync(backupPath, separator + currentContent);
            output.info('✓ Appended to .env.copy (content mismatch detected)');
          } else {
            copyFileSync('.env', backupPath);
            output.info('✓ Created .env.copy (content mismatch detected)');
          }
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    // Write to .env
    await writeEnvFile(envContent);

    // Ensure .gitignore
    await ensureGitignore();

    // Track base version for future pushes
    await updateVersionInfo(
      context.org,
      context.project,
      context.environment,
      snapshot.version_number
    );

    await sendTelemetryEvent('cli.pull', {
      environment: context.environment,
      version: snapshot.version_number,
      has_overrides: Object.keys(localOverrides).length > 0,
    });

    if (options.json) {
      output.json({
        status: 'success',
        version: snapshot.version_number,
        keys: Object.keys(finalEnv).length,
        overrides_applied: Object.keys(localOverrides).length,
      });
    } else {
      output.success(`Pulled version ${snapshot.version_number} from ${context.environment}`);
      output.info(`${Object.keys(finalEnv).length} keys written to .env`);
      
      if (Object.keys(localOverrides).length > 0) {
        output.info(`${Object.keys(localOverrides).length} local overrides applied`);
      }
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'PULL_ERROR', message: error.message });
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
