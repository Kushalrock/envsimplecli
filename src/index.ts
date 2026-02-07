#!/usr/bin/env bun
/**
 * EnvSimple CLI - Main entry point
 */

import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { statusCommand } from './commands/status.js';
import { pullCommand } from './commands/pull.js';
import { pushCommand } from './commands/push.js';
import { printCommand } from './commands/print.js';
import { versionsCommand, logCommand } from './commands/versions.js';
import { auditCommand } from './commands/audit.js';
import { envListCommand, envCreateCommand, envCloneCommand, envDeleteCommand } from './commands/env.js';
import { rollbackCommand } from './commands/rollback.js';
import { updateCommand } from './commands/update.js';
import { telemetryEnableCommand, telemetryDisableCommand, telemetryStatusCommand } from './commands/telemetry.js';
import { formatError } from './utils/errors.js';
import type { CLIOptions } from './utils/types.js';

const program = new Command();

program
  .name('envsimple')
  .description('CLI-first environment configuration management')
  .version('1.0.0')
  .addHelpText('after', '\nEnvSimple is a trademark of EnvSimple.')
  .option('--json', 'Output in JSON format')
  .option('--debug', 'Enable debug output')
  .option('--org <org>', 'Organization slug')
  .option('--project <project>', 'Project name')
  .option('--environment <environment>', 'Environment name');

// Auth commands
program
  .command('login')
  .description('Login to EnvSimple')
  .option('--device', 'Use device code flow (headless)')
  .action(async (options) => {
    const globalOpts = program.opts();
    await loginCommand({ ...globalOpts, ...options });
  });

program
  .command('logout')
  .description('Logout from EnvSimple')
  .action(async () => {
    const globalOpts = program.opts();
    await logoutCommand(globalOpts);
  });

// Context commands
program
  .command('status')
  .description('Show current context and authentication status')
  .action(async () => {
    const globalOpts = program.opts();
    await statusCommand(globalOpts);
  });

program
  .command('help-config')
  .description('Show help for .envsimple and .envsimple.local configuration')
  .action(() => {
    console.log(`
📝 Configuration Files Help

.envsimple (Shared, Committed)
────────────────────────────
Team-wide context. Commit this file to your repository.

Example:
  org: acme
  project: payments-api
  environment: production

.envsimple.local (Local, Gitignored)
─────────────────────────────────────
Local-only configuration for:
  1. Switching environments without changing shared config
  2. Overriding specific keys for local development

Example:
  environment: dev-alice
  
  overrides:
    DATABASE_URL: postgresql://localhost/mydb
    DEBUG: true
    API_KEY: dev_key_12345

How Overrides Work:
• Pull: Overrides are applied to pulled values
• Push: Overrides are excluded by default (prompt asks to include)
• Print: Shows final values with overrides applied

Priority Order:
1. CLI flags (--org, --project, --environment)
2. .envsimple.local (local overrides)
3. .envsimple (shared context)
4. Interactive selection

Commands:
• envsimple update          - Change environment (saves to .envsimple.local)
• envsimple update --shared - Change environment (saves to .envsimple)
`);
  });

program
  .command('update')
  .description('Update local environment context')
  .option('--shared', 'Update .envsimple instead of .envsimple.local')
  .action(async (options) => {
    const globalOpts = program.opts();
    await updateCommand({ ...globalOpts, ...options });
  });

// Sync commands
program
  .command('pull')
  .description('Pull latest environment snapshot')
  .action(async () => {
    const globalOpts = program.opts();
    await pullCommand(globalOpts);
  });

program
  .command('push')
  .description('Push local .env to remote')
  .option('--force', 'Force push even if conflicts')
  .action(async (options) => {
    const globalOpts = program.opts();
    await pushCommand({ ...globalOpts, ...options });
  });

// View commands
program
  .command('print')
  .description('Print environment variables')
  .option('--raw', 'Show unmasked values')
  .action(async (options) => {
    const globalOpts = program.opts();
    await printCommand({ ...globalOpts, ...options });
  });

program
  .command('log')
  .description('Show recent version history (short summary)')
  .action(async () => {
    const globalOpts = program.opts();
    await logCommand(globalOpts);
  });

program
  .command('versions')
  .description('List all versions')
  .action(async () => {
    const globalOpts = program.opts();
    await versionsCommand(globalOpts);
  });

program
  .command('audit')
  .description('Get audit logs')
  .option('--since <timestamp>', 'Start time (ISO 8601)')
  .option('--to <timestamp>', 'End time (ISO 8601)')
  .action(async (options) => {
    const globalOpts = program.opts();
    await auditCommand({ ...globalOpts, ...options });
  });

// Environment management
const envCommand = program.command('env').description('Manage environments');

envCommand
  .command('list')
  .description('List environments in project')
  .action(async () => {
    const globalOpts = program.opts();
    await envListCommand(globalOpts);
  });

envCommand
  .command('create')
  .description('Create new environment')
  .argument('<name>', 'Environment name')
  .action(async (name) => {
    const globalOpts = program.opts();
    await envCreateCommand(name, globalOpts);
  });

envCommand
  .command('clone')
  .description('Clone environment snapshot')
  .argument('<source>', 'Source environment name')
  .argument('<destination>', 'Destination environment name')
  .action(async (source, destination) => {
    const globalOpts = program.opts();
    await envCloneCommand(source, destination, globalOpts);
  });

envCommand
  .command('delete')
  .description('Delete environment')
  .option('--permanent', 'Permanently delete (cannot be restored)')
  .action(async (options) => {
    const globalOpts = program.opts();
    await envDeleteCommand({ ...globalOpts, ...options });
  });

// Rollback command
program
  .command('rollback')
  .description('Rollback to previous version')
  .option('--target <number>', 'Version number to rollback to', parseInt)
  .action(async (options) => {
    const globalOpts = program.opts();
    await rollbackCommand({ ...globalOpts, ...options });
  });

// Telemetry commands
const telemetryCommand = program.command('telemetry').description('Manage telemetry settings');

telemetryCommand
  .command('enable')
  .description('Enable anonymous telemetry')
  .action(async () => {
    const globalOpts = program.opts();
    await telemetryEnableCommand(globalOpts);
  });

telemetryCommand
  .command('disable')
  .description('Disable telemetry')
  .action(async () => {
    const globalOpts = program.opts();
    await telemetryDisableCommand(globalOpts);
  });

telemetryCommand
  .command('status')
  .description('Show telemetry status')
  .action(async () => {
    const globalOpts = program.opts();
    await telemetryStatusCommand(globalOpts);
  });

// Parse arguments
program.parse(process.argv);
