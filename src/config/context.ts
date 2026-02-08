/**
 * Configuration and context resolution
 */

import { parse as parseYAML } from 'yaml';
import { join } from 'path';
import type { SharedContext, LocalContext, ResolvedContext, CLIOptions } from '../utils/types.js';
import { ConfigurationError } from '../utils/errors.js';
import { Output } from '../output/formatter.js';

/**
 * Load .envsimple file (shared context)
 */
export async function loadSharedContext(cwd: string = process.cwd()): Promise<SharedContext | null> {
  const configPath = join(cwd, '.envsimple');
  
  try {
    const file = Bun.file(configPath);
    if(!(await file.exists())) {
      return null;
    }
    const content = await file.text();
    const parsed = parseYAML(content);

    // Validate required fields
    if (!parsed || typeof parsed !== 'object') {
      throw new ConfigurationError('Invalid .envsimple file format');
    }

    const { org, project, environment } = parsed as any;

    if (!org || !project || !environment) {
      throw new ConfigurationError(
        '.envsimple must contain org, project, and environment fields'
      );
    }

    return { org, project, environment };
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message?.includes('No such file')) {
      return null;
    }
    throw error;
  }
}

/**
 * Load .envsimple.local file (local overrides)
 */
export async function loadLocalContext(cwd: string = process.cwd()): Promise<LocalContext | null> {
  const configPath = join(cwd, '.envsimple.local');
  
  try {
    const file = Bun.file(configPath);
    if(!(await file.exists())) {
      return null;
    }
    const content = await file.text();
    const parsed = parseYAML(content);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed as LocalContext;
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message?.includes('No such file')) {
      return null;
    }
    throw error;
  }
}

/**
 * Save .envsimple.local file
 */
export async function saveLocalContext(
  context: LocalContext,
  cwd: string = process.cwd()
): Promise<void> {
  const configPath = join(cwd, '.envsimple.local');
  
  // Use YAML stringify
  const YAML = await import('yaml');
  const content = YAML.stringify(context);
  
  await Bun.write(configPath, content);
}

/**
 * Save .envsimple file (shared context)
 */
export async function saveSharedContext(
  context: SharedContext,
  cwd: string = process.cwd()
): Promise<void> {
  const configPath = join(cwd, '.envsimple');
  
  // Use YAML stringify
  const YAML = await import('yaml');
  const content = YAML.stringify(context);
  
  await Bun.write(configPath, content);
}

/**
 * Resolve context from multiple sources with priority:
 * 1. CLI flags
 * 2. .envsimple.local
 * 3. .envsimple
 * 4. Interactive (not implemented here, needs to be handled at command level)
 */
export async function resolveContext(
  options: CLIOptions,
  output: Output,
  cwd: string = process.cwd(),
  skipLocal: boolean = false
): Promise<ResolvedContext | null> {
  const shared = await loadSharedContext(cwd);
  const local = skipLocal ? null : await loadLocalContext(cwd);

  if (options.org && options.project && options.environment) {
    return {
      org: options.org,
      project: options.project,
      environment: options.environment,
      source: 'flags',
    };
  }

  const resolvedOrg = options.org || local?.org || shared?.org;
  const resolvedProject = options.project || local?.project || shared?.project;
  const resolvedEnv = options.environment || local?.environment || shared?.environment;

  if (resolvedOrg && resolvedProject && resolvedEnv) {
    const source = local ? 'local' : 'shared';
    return {
      org: resolvedOrg,
      project: resolvedProject,
      environment: resolvedEnv,
      source: source as any,
    };
  }

  return null;
}

/**
 * Get local overrides for environment variables
 */
export async function getLocalOverrides(cwd: string = process.cwd()): Promise<Record<string, string>> {
  const local = await loadLocalContext(cwd);
  return local?.overrides || {};
}

/**
 * Validate context file schema
 */
export function validateSharedContext(context: any): SharedContext {
  if (!context || typeof context !== 'object') {
    throw new ConfigurationError('Invalid context format');
  }

  if (!context.org || typeof context.org !== 'string') {
    throw new ConfigurationError('Missing or invalid "org" field');
  }

  if (!context.project || typeof context.project !== 'string') {
    throw new ConfigurationError('Missing or invalid "project" field');
  }

  if (!context.environment || typeof context.environment !== 'string') {
    throw new ConfigurationError('Missing or invalid "environment" field');
  }

  return {
    org: context.org,
    project: context.project,
    environment: context.environment,
  };
}

/**
 * Clear environment from context files if it matches the deleted one
 */
export async function clearContextIfMatches(
  deletedEnvironment: string,
  cwd: string = process.cwd()
): Promise<void> {
  const shared = await loadSharedContext(cwd);
  const local = await loadLocalContext(cwd);
  
  if (local && local.environment === deletedEnvironment) {
    const { unlinkSync, existsSync } = await import('fs');
    const localPath = join(cwd, '.envsimple.local');
    if (existsSync(localPath)) {
      unlinkSync(localPath);
    }
  }
  
  if (shared && shared.environment === deletedEnvironment) {
    const { unlinkSync, existsSync } = await import('fs');
    const sharedPath = join(cwd, '.envsimple');
    if (existsSync(sharedPath)) {
      unlinkSync(sharedPath);
    }
  }
}
