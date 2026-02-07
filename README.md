# EnvSimple CLI

A production-grade command-line tool for managing environment configurations with versioning, encryption, and team collaboration.

## Features

- 🔐 **Secure Authentication** - Device code flow for headless systems
- 📦 **Snapshot-Based** - Full-state versioning (no merges, no diffs)
- 🔄 **Pull/Push Workflow** - Git-style commands for env management
- 🎯 **Local Overrides** - Override keys locally without pushing
- 🔙 **Version Rollback** - Copy any snapshot to create new version
- 🛡️ **Safety First** - Conflict detection, backups, and confirmations
- 👁️ **Secret Masking** - Masked output by default
- 📊 **Audit Logs** - Track all configuration changes
- 📡 **Telemetry** - Anonymous usage tracking (opt-out supported)

## Installation

### From Source

```bash
# Clone repository
git clone https://github.com/yourorg/envsimple-cli
cd envsimple-cli

# Install dependencies
bun install

# Build
bun run build

# Or compile to standalone binary
bun run compile
```

### Usage

```bash
# Link for development
bun link

# Then use globally
envsimple --help
```

## Quick Start

### 1. Authenticate

```bash
envsimple login
```

Follow the displayed URL and enter the user code to authenticate.

### 2. Configure Context

Create `.envsimple` file in your project:

```yaml
org: acme
project: payments-api
environment: dev
```

### 3. Pull Environment

```bash
envsimple pull
```

This fetches the latest snapshot and writes to `.env`.

### 4. Make Changes and Push

```bash
# Edit .env file
vim .env

# Push changes
envsimple push
```

## Commands

### Authentication

```bash
envsimple login [--device]    # Login (device flow)
envsimple logout              # Logout and revoke session
```

### Context

```bash
envsimple status                    # Show current context
envsimple update <environment>      # Switch to different environment
```

### Sync

```bash
envsimple pull                # Pull latest snapshot
envsimple push [--force]      # Push local .env to remote
```

### View

```bash
envsimple print [--raw]       # Display variables (masked by default)
envsimple log                 # Show recent version history
envsimple versions            # List all versions
envsimple audit               # Get audit logs
  [--since TIMESTAMP]         #   Filter by start time
  [--to TIMESTAMP]            #   Filter by end time
```

### Environment Management

```bash
envsimple env list                        # List environments
envsimple env create <name>               # Create environment
envsimple env clone <source> <dest>       # Clone snapshot
envsimple env delete [--permanent]        # Delete environment
```

### Rollback

```bash
envsimple rollback --version <number>     # Rollback to version
```

### Telemetry

```bash
envsimple telemetry enable      # Enable anonymous telemetry
envsimple telemetry disable     # Disable telemetry
envsimple telemetry status      # Show telemetry status
```

## Global Flags

```bash
--json                   # Output in JSON format
--debug                  # Enable debug output
--org <org>              # Override organization
--project <project>      # Override project
--environment <env>      # Override environment
```

## Configuration Files

### `.envsimple` (Shared, Committed)

```yaml
org: acme
project: payments-api
environment: production
```

Team-wide context configuration.

### `.envsimple.local` (Local, Gitignored)

```yaml
environment: dev-alice

overrides:
  DATABASE_URL: postgresql://localhost/mydb
  DEBUG: true
  API_KEY: dev_key_12345
```

Local-only configuration for:
1. **Environment switching** - Change environment without modifying shared config
2. **Local overrides** - Override specific keys for local development

**Creating .envsimple.local:**
```bash
# Create with text editor
echo "environment: dev" > .envsimple.local
echo "" >> .envsimple.local
echo "overrides:" >> .envsimple.local
echo "  DEBUG: true" >> .envsimple.local

# Or use update command
envsimple update  # Saves to .envsimple.local by default
```

**Override Behavior:**
- `pull` - Overrides applied to pulled values before writing .env
- `push` - Overrides excluded by default (prompts to include)
- `print` - Shows final values with overrides applied

### `.env` (Generated, Gitignored)

```
DATABASE_URL=postgresql://prod.example.com/db
API_KEY=sk_live_xyz123
DEBUG=false
```

Generated runtime configuration.

### `.env.copy` (Backup, Gitignored)

Automatic backup created before risky operations.

## Context Resolution

Priority order:

1. **CLI flags** (`--org`, `--project`, `--environment`)
2. **`.envsimple.local`** (local overrides)
3. **`.envsimple`** (shared context)
4. **Interactive selection** (when no context found)

## Safety Features

### Push Conflict Detection

When remote version is newer:
1. Creates `.env.copy` backup
2. Shows conflict message
3. Suggests pulling first
4. Prompts for forced push

### Override Handling

Local overrides are:
- Applied during pull
- Applied during print
- **Excluded from push by default**

To include overrides in push:
```bash
envsimple push
# Prompts: "Include local overrides? (yes/no)"
```

### Destructive Actions

Confirmation required for:
- Environment deletion
- Permanent environment deletion
- Forced push on conflict

## Secret Masking

By default, values are masked:
```
API_KEY=sk***23
```

To show full values:
```bash
envsimple print --raw
```

## JSON Mode

For scripting and automation:

```bash
envsimple status --json
envsimple pull --json
envsimple push --json
```

Output structure:
```json
{
  "status": "success",
  "version": 5,
  "keys": 12
}
```

Errors:
```json
{
  "error": "CONFLICT",
  "message": "Remote version is newer"
}
```

## Examples

### Switch Environment

```bash
# Update local context to staging
envsimple update staging

# Pull staging environment
envsimple pull
```

### Clone Environment

```bash
# Clone production to preview
envsimple env clone production preview

# Context automatically switches to preview
envsimple status
# Environment: preview
```

### Rollback

```bash
# View versions
envsimple versions

# Rollback to version 3
envsimple rollback --version 3

# Pull the rolled-back version
envsimple pull
```

### Audit Trail

```bash
# Get recent audit logs
envsimple audit

# Filter by date range
envsimple audit --since 2024-01-01T00:00:00Z --to 2024-01-31T23:59:59Z
```

## Development

### Project Structure

```
src/
├── commands/       # Command handlers
├── api/           # API client
├── auth/          # Authentication
├── config/        # Context resolution
├── env/           # .env file operations
├── output/        # Formatting
├── telemetry/     # Usage tracking
└── utils/         # Shared utilities
```

### Run Locally

```bash
# Development mode
bun run dev status

# Build
bun run build

# Compile standalone binary
bun run compile
```

### Testing

```bash
# Run tests (when implemented)
bun test
```

## Environment Variables

### `ENVSIMPLE_API_URL`

Override API base URL:
```bash
export ENVSIMPLE_API_URL=https://api.staging.envsimple.dev
envsimple pull
```

## Files Created

### `~/.envsimple/credentials.json`
Stores authentication tokens (permissions: 600)

### `~/.envsimple/telemetry.json`
Telemetry configuration and anonymous ID

## Troubleshooting

### "Not logged in" Error

```bash
envsimple login
```

### "Context not resolved" Error

Create `.envsimple` file or use flags:
```bash
envsimple pull --org acme --project api --environment dev
```

### Network Errors

Check API URL:
```bash
echo $ENVSIMPLE_API_URL
```

Enable debug mode:
```bash
envsimple --debug pull
```

### Permission Errors

Verify your role:
```bash
envsimple status
```

Contact your organization admin to grant permissions.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT

## Support

- Documentation: [https://docs.envsimple.dev](https://docs.envsimple.dev)
- Issues: [https://github.com/yourorg/envsimple-cli/issues](https://github.com/yourorg/envsimple-cli/issues)
- Email: support@envsimple.dev

## Related Documentation

- [implementation.md](./implementation.md) - Architecture and design decisions
- [assumptions.md](./assumptions.md) - Assumptions made during implementation
- [missing-backend.md](./missing-backend.md) - Backend API gaps and recommendations
