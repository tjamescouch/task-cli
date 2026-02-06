import { Command } from 'commander';
import chalk from 'chalk';
import { claimTask, getTask } from '../db/tasks';
import { broadcast, createTaskClaimedEvent } from '../services/agentchat';

export function createClaimCommand(): Command {
  return new Command('claim')
    .description('Claim a task')
    .argument('<id>', 'Task ID')
    .option('-a, --assignee <assignee>', 'Assignee ID', process.env.USER || 'anonymous')
    .action(async (id, options) => {
      const existing = getTask(id);

      if (!existing) {
        console.log(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      if (existing.status !== 'open') {
        console.log(chalk.red(`Task is not open. Current status: ${existing.status}`));
        process.exit(1);
      }

      const task = claimTask(id, options.assignee);

      if (task) {
        console.log(chalk.green('Task claimed successfully!'));
        console.log(chalk.dim('ID:'), task.id);
        console.log(chalk.dim('Title:'), task.title);
        console.log(chalk.dim('Assignee:'), task.assignee);

        await broadcast(createTaskClaimedEvent(task));
      } else {
        console.log(chalk.red('Failed to claim task.'));
        process.exit(1);
      }
    });
}
