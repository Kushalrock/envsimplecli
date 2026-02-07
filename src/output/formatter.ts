/**
 * Output formatting and display utilities
 */

import chalk from 'chalk';
import type { CLIOptions } from '../utils/types.js';

export class Output {
  constructor(private options: CLIOptions = {}) {}

  /**
   * Print success message
   */
  success(message: string): void {
    if (this.options.json) return;
    console.log(chalk.green('✔') + ' ' + message);
  }

  /**
   * Print warning message
   */
  warning(message: string): void {
    if (this.options.json) return;
    console.log(chalk.yellow('⚠') + ' ' + message);
  }

  /**
   * Print error message
   */
  error(message: string): void {
    if (this.options.json) return;
    console.error(chalk.red('✖') + ' ' + message);
  }

  /**
   * Print info message
   */
  info(message: string): void {
    if (this.options.json) return;
    console.log(message);
  }

  /**
   * Print debug message (only if debug flag is set)
   */
  debug(message: string): void {
    if (!this.options.debug) return;
    if (this.options.json) return;
    console.log(chalk.gray('[DEBUG]') + ' ' + message);
  }

  /**
   * Print JSON output
   */
  json(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Mask secret values
   */
  maskSecret(value: string, raw: boolean = false): string {
    if (raw || this.options.raw) {
      return value;
    }
    
    if (value.length <= 4) {
      return '***';
    }
    
    return value.substring(0, 2) + '***' + value.substring(value.length - 2);
  }

  /**
   * Format key-value pairs for display
   */
  formatKeyValue(key: string, value: string, raw: boolean = false): string {
    const displayValue = this.maskSecret(value, raw);
    return `${chalk.cyan(key)}=${displayValue}`;
  }

  /**
   * Print table-like output
   */
  table(headers: string[], rows: string[][]): void {
    if (this.options.json) return;

    // Calculate column widths
    const widths = headers.map((h, i) => {
      const maxRowWidth = Math.max(...rows.map(r => (r[i] || '').length));
      return Math.max(h.length, maxRowWidth);
    });

    // Print header
    const headerRow = headers.map((h, i) => h.padEnd(widths[i]!)).join('  ');
    console.log(chalk.bold(headerRow));
    console.log(widths.map(w => '-'.repeat(w)).join('  '));

    // Print rows
    rows.forEach(row => {
      const formattedRow = row.map((cell, i) => (cell || '').padEnd(widths[i]!)).join('  ');
      console.log(formattedRow);
    });
  }

  /**
   * Parse .env content into key-value pairs
   */
  parseEnvContent(content: string): Record<string, string> {
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
   * Format env object back to .env format
   */
  formatEnvContent(env: Record<string, string>): string {
    return Object.entries(env)
      .map(([key, value]) => {
        // Quote value if it contains spaces or special characters
        const needsQuotes = /[\s#]/.test(value);
        const formattedValue = needsQuotes ? `"${value}"` : value;
        return `${key}=${formattedValue}`;
      })
      .join('\n') + '\n';
  }
}

/**
 * Create output instance from options
 */
export function createOutput(options: CLIOptions = {}): Output {
  return new Output(options);
}
