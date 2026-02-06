import { Command } from 'commander';
import chalk from 'chalk';
import { updateTask, getTask } from '../db/tasks';
import { broadcast, createTaskUnclaimedEvent } from '../services/agentchat';

export function createUnclaimCommand(): Command {
  return new Command('unclaim')
    .description('Release a claimed task back to open')
    .argument('<id>', 'Task ID')
    .action(async (id) => {
      const existing = getTask(id);

      if (!existing) {
        console.log(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      if (existing.status !== 'claimed') {
        console.log(chalk.red(`Task is not claimed. Current status: ${existing.status}`));
        process.exit(1);
      }

      const task = updateTask(id, { status: 'open', assignee: undefined });

      if (task) {
        console.log(chalk.green('Task unclaimed!'));
        console.log(chalk.dim('ID:'), task.id);
        console.log(chalk.dim('Title:'), task.title);
        console.log(chalk.dim('Status:'), task.status);

        await broadcast(createTaskUnclaimedEvent(task));
      } else {
        console.log(chalk.red('Failed to unclaim task.'));
        process.exit(1);
      }
    });
}
