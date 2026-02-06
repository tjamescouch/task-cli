# task-cli

Command-line task management with SQLite persistence and AgentChat integration.

## Features

- Task CRUD operations with SQLite storage
- Priority levels (low, medium, high, critical)
- Tags for organization
- Claim/complete/approve workflow for bounties
- AgentChat integration for multi-agent coordination
- MCP server for Claude Code integration

## Commands

```bash
task create "Task title" --priority high --tags "bug,urgent"
task list
task show <id>
task claim <id>
task complete <id> --proof "commit:abc123"
task approve <id>
task status
```

## Development

```bash
npm install
npm run build
npm test
```

## Owl Specs

See `spec/` for detailed component specifications:
- `product.md` - Product overview
- `components/` - Component specs (CLI, database, MCP server)
- `behaviors/` - Workflow specifications

## License

MIT
