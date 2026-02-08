/**
 * Authentication flows (browser and device)
 */

import { startDeviceFlow, pollDeviceCode, getCurrentUser } from '../api/client.js';
import { saveCredentials } from './credentials.js';
import { Output } from '../output/formatter.js';
import { APIError } from '../utils/errors.js';

/**
 * Device code authentication flow
 */
export async function deviceCodeFlow(output: Output): Promise<void> {
  output.info('Starting device code authentication...\n');

  // Start device flow
  const osName = process.platform;
  const machineName = process.env.COMPUTERNAME || process.env.HOSTNAME || 'unknown';

  const deviceData = await startDeviceFlow({
    client_name: 'envsimple-cli',
    client_version: '1.0.0',
    os_name: osName,
    machine_name: machineName,
  });

  // Display user code and URL
  output.info(`Please visit: ${deviceData.verification_url}`);
  output.info(`\nAnd enter code: ${deviceData.user_code}\n`);

  // Poll for authorization
  const interval = deviceData.interval * 1000; // Convert to milliseconds
  const expiresAt = Date.now() + deviceData.expires_in * 1000;

  output.info('Waiting for authorization...\n');

  while (Date.now() < expiresAt) {
    await new Promise(resolve => setTimeout(resolve, interval));

    try {
      const tokenData = await pollDeviceCode(deviceData.device_code) as any;
      
      // SUCCESS! Authentication complete - save credentials immediately
      output.success('Authentication successful!\n');
      
      // Poll response only has: access_token, token_type, expires_in
      // Save credentials with what we have
      await saveCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || undefined,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in,
        expires_at: tokenData.expires_at || new Date(Date.now() + (tokenData.expires_in || 2592000) * 1000).toISOString(),
        account_id: 'authenticated', // Will be populated by API calls later
        organization_id: undefined,
      });

      // Try to get user info for display (optional)
      try {
        const tempAuthHeader = `Bearer ${tokenData.access_token}`;
        const userResponse = await fetch(`${process.env.ENVSIMPLE_API_URL || 'https://api.envsimple.com'}/auth/me`, {
          headers: { Authorization: tempAuthHeader },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json() as any;
          output.success(`Logged in as ${userData.user?.email || userData.email || 'user'}`);
        } else {
          output.success('Logged in successfully!');
        }
      } catch {
        // User info fetch failed, but we already saved credentials so it's OK
        output.success('Logged in successfully!');
      }
      
      return;
    } catch (error: any) {
      // "Bad Request" or "authorization_pending" means user hasn't authorized yet - KEEP POLLING
      if (error.code === 'authorization_pending' || 
          error.message?.includes('pending') ||
          error.message?.includes('Bad Request') ||
          error.statusCode === 400) {
        continue;
      }

      if (error.message?.includes('denied') || error.message?.includes('expired')) {
        output.error('Authentication was denied or expired');
        process.exit(1);
      }

      continue;
    }
  }

  output.error('Authentication timed out');
  process.exit(1);
}

/**
 * Browser-based authentication flow
 * Note: This requires a web server to handle callback, which is complex for CLI
 * For now, we'll default to device flow
 */
export async function browserFlow(output: Output): Promise<void> {
  output.warning('Browser flow not yet implemented. Using device code flow instead.\n');
  await deviceCodeFlow(output);
}
