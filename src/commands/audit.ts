/**
 * Audit command
 */

import type { CLIOptions } from '../utils/types.js';
import { createOutput } from '../output/formatter.js';
import { resolveContext } from '../config/context.js';
import { requireAuth } from '../auth/credentials.js';
import { listOrganizations, getAuditLogs } from '../api/client.js';
import { sendTelemetryEvent } from '../telemetry/telemetry.js';

export async function auditCommand(
  options: CLIOptions & { since?: string; to?: string }
): Promise<void> {
  const output = createOutput(options);

  try {
    await requireAuth();

    const context = await resolveContext(options, output);

    if (!context) {
      throw new Error('Context not resolved. Use flags or create .envsimple file.');
    }

    // Find organization
    const orgsData = await listOrganizations();
    const orgData = orgsData.organizations.find(o => o.slug === context.org);
    
    if (!orgData) {
      throw new Error(`Organization "${context.org}" not found`);
    }

    // Validate timestamps if provided
    if (options.since && !isValidISO8601(options.since)) {
      throw new Error('--since must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)');
    }

    if (options.to && !isValidISO8601(options.to)) {
      throw new Error('--to must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)');
    }

    // Get audit logs
    const logsData = await getAuditLogs({
      organization_id: orgData.id,
      start_time: options.since,
      end_time: options.to,
      limit: 100,
    });

    await sendTelemetryEvent('cli.audit', { count: logsData.logs.length });

    if (options.json) {
      output.json({
        organization: context.org,
        logs: logsData.logs,
        count: logsData.logs.length,
      });
    } else {
      output.info(`Audit logs for ${context.org}:\n`);

      if (logsData.logs.length === 0) {
        output.warning('No audit logs found');
        return;
      }

      // Display as table
      const headers = ['Action', 'Actor', 'Resource', 'Timestamp'];
      const rows = logsData.logs.map(log => [
        log.action,
        log.actor.name || log.actor.email || log.actor.id.substring(0, 8),
        `${log.resource.type}/${log.resource.id.substring(0, 8)}`,
        new Date(log.created_at).toLocaleString(),
      ]);

      output.table(headers, rows);
    }
  } catch (error: any) {
    if (options.json) {
      output.json({ error: error.code || 'AUDIT_ERROR', message: error.message });
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

function isValidISO8601(dateString: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  if (!iso8601Regex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
