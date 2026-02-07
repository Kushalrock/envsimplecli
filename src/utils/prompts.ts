/**
 * User interaction utilities
 */

import prompts from 'prompts';
import type { CLIOptions } from './types.js';
import { CLIError } from './errors.js';

/**
 * Confirm action with user
 */
export async function confirm(
  message: string,
  defaultValue: boolean = false,
  options: CLIOptions = {}
): Promise<boolean> {
  // In JSON mode, fail instead of prompting
  if (options.json) {
    throw new CLIError(
      'Interactive prompt required but --json mode is enabled',
      'INTERACTIVE_REQUIRED',
      1
    );
  }

  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message,
    initial: defaultValue,
  });

  // User cancelled (Ctrl+C)
  if (response.value === undefined) {
    throw new CLIError('Operation cancelled', 'CANCELLED', 1);
  }

  return response.value;
}

/**
 * Select from list of options
 */
export async function select<T extends string>(
  message: string,
  choices: Array<{ title: string; value: T }>,
  options: CLIOptions = {}
): Promise<T> {
  if (options.json) {
    throw new CLIError(
      'Interactive prompt required but --json mode is enabled',
      'INTERACTIVE_REQUIRED',
      1
    );
  }

  const response = await prompts({
    type: 'select',
    name: 'value',
    message,
    choices,
  });

  if (response.value === undefined) {
    throw new CLIError('Operation cancelled', 'CANCELLED', 1);
  }

  return response.value;
}

/**
 * Text input
 */
export async function input(
  message: string,
  defaultValue?: string,
  options: CLIOptions = {}
): Promise<string> {
  if (options.json) {
    throw new CLIError(
      'Interactive prompt required but --json mode is enabled',
      'INTERACTIVE_REQUIRED',
      1
    );
  }

  const response = await prompts({
    type: 'text',
    name: 'value',
    message,
    initial: defaultValue,
  });

  if (response.value === undefined) {
    throw new CLIError('Operation cancelled', 'CANCELLED', 1);
  }

  return response.value;
}
