#!/usr/bin/env node

import { Command } from 'commander';
import { createCreateCommand } from './commands/create';
import { createListCommand } from './commands/list';
import { createShowCommand } from './commands/show';
import { createClaimCommand } from './commands/claim';
import { createCompleteCommand } from './commands/complete';
import { createUnclaimCommand } from './commands/unclaim';
import { createStatusCommand } from './commands/status';
import { createApproveCommand } from './commands/approve';
import { initDb, closeDb } from './db/schema';

async function main() {
  await initDb();

  const program = new Command();

  program
    .name('task')
    .description('CLI task management system for agent coordination')
    .version('0.1.0');

  program.addCommand(createCreateCommand());
  program.addCommand(createListCommand());
  program.addCommand(createShowCommand());
  program.addCommand(createClaimCommand());
  program.addCommand(createCompleteCommand());
  program.addCommand(createUnclaimCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createApproveCommand());

  process.on('exit', () => {
    closeDb();
  });

  await program.parseAsync();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
