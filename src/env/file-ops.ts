/**
 * Environment file operations (.env, .env.copy)
 */

import { join } from 'path';
import { Output } from '../output/formatter.js';

/**
 * Read .env file
 */
export async function readEnvFile(cwd: string = process.cwd()): Promise<string> {
  const envPath = join(cwd, '.env');
  
  try {
    const file = Bun.file(envPath);
    return await file.text();
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message?.includes('No such file')) {
      return '';
    }
    throw error;
  }
}

/**
 * Write .env file (full overwrite)
 */
export async function writeEnvFile(content: string, cwd: string = process.cwd()): Promise<void> {
  const envPath = join(cwd, '.env');
  await Bun.write(envPath, content);
}

/**
 * Create .env.copy backup
 * If .env.copy exists, appends with timestamp separator
 */
export async function createBackup(cwd: string = process.cwd()): Promise<boolean> {
  const envPath = join(cwd, '.env');
  const backupPath = join(cwd, '.env.copy');
  
  try {
    const file = Bun.file(envPath);
    const exists = await file.exists();
    
    if (!exists) {
      return false;
    }
    
    const content = await file.text();
    
    // Check if backup already exists
    const backupFile = Bun.file(backupPath);
    const backupExists = await backupFile.exists();
    
    if (backupExists) {
      // Append with timestamp separator
      const existingContent = await backupFile.text();
      const timestamp = new Date().toISOString();
      const separator = `\n\n# ===== Backup from ${timestamp} =====\n\n`;
      await Bun.write(backupPath, existingContent + separator + content);
    } else {
      // Create new backup
      await Bun.write(backupPath, content);
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Ensure .gitignore includes .env entries
 */
export async function ensureGitignore(cwd: string = process.cwd()): Promise<void> {
  const gitignorePath = join(cwd, '.gitignore');
  
  const requiredEntries = [
    '.env',
    '.env.copy',
    '.envsimple.local',
  ];

  let content = '';
  
  try {
    const file = Bun.file(gitignorePath);
    const exists = await file.exists();
    if (exists) {
      content = await file.text();
    }
  } catch (error) {
    // File doesn't exist, we'll create it
  }

  const lines = content.split('\n');
  const existingEntries = new Set(lines.map(l => l.trim()).filter(l => l && !l.startsWith('#')));

  let modified = false;
  const newLines: string[] = [...lines];

  for (const entry of requiredEntries) {
    if (!existingEntries.has(entry)) {
      // Add to gitignore
      if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push('');
      }
      if (!modified) {
        newLines.push('# EnvSimple');
      }
      newLines.push(entry);
      modified = true;
    }
  }

  if (modified) {
    await Bun.write(gitignorePath, newLines.join('\n') + '\n');
  }
}

/**
 * Apply overrides to environment content
 */
export function applyOverrides(
  baseEnv: Record<string, string>,
  overrides: Record<string, string>
): Record<string, string> {
  return { ...baseEnv, ...overrides };
}

/**
 * Parse .env format to object
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Find first = sign
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;

    const key = trimmed.substring(0, equalIndex).trim();
    let value = trimmed.substring(equalIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Format object to .env format
 */
export function formatEnvContent(env: Record<string, string>): string {
  return Object.entries(env)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      // Quote value if it contains spaces or special characters
      const needsQuotes = /[\s#]/.test(value);
      const formattedValue = needsQuotes ? `"${value}"` : value;
      return `${key}=${formattedValue}`;
    })
    .join('\n') + '\n';
}

/**
 * Check if .env.copy exists
 */
export async function backupExists(cwd: string = process.cwd()): Promise<boolean> {
  const backupPath = join(cwd, '.env.copy');
  try {
    const file = Bun.file(backupPath);
    return await file.exists();
  } catch {
    return false;
  }
}
