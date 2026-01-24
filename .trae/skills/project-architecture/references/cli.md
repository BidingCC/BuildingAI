# packages/cli

CLI tooling for BuildingAI operations.

## Location
`packages/cli/`

## Commands

- Extension management: `extension:create`, `extension:release`
- PM2 process management: `pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:status`, `pm2:logs`
- System updates: `update`, `update-git`
- Environment sync: `sync-env`

## Usage

```bash
# Via npm scripts
pnpm buildingai extension:create
pnpm buildingai pm2:start
pnpm buildingai update

# Direct
node packages/cli/bin/cli.js extension:create
```
