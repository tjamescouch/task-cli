import { Command } from 'commander';
import chalk from 'chalk';
import { createTask } from '../db/tasks';
import { TaskPriority } from '../types';
import { broadcast, createTaskCreatedEvent } from '../services/agentchat';

export function createCreateCommand(): Command {
  return new Command('create')
    .description('Create a new task')
    .requiredOption('-t, --title <title>', 'Task title')
    .option('-d, --description <description>', 'Task description', '')
    .option('-p, --priority <priority>', 'Priority (low, medium, high)', 'medium')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--deps <deps>', 'Comma-separated dependency task IDs')
    .option('-c, --creator <creator>', 'Creator ID', process.env.USER || 'anonymous')
    .option('--bounty <amount>', 'Bounty amount for task completion')
    .option('--currency <currency>', 'Bounty currency (e.g., TEST, USD)', 'TEST')
    .action(async (options) => {
      const metadata: Record<string, unknown> = {};

      if (options.bounty) {
        metadata.bounty = {
          amount: parseFloat(options.bounty),
          currency: options.currency,
        };
      }

      const task = createTask({
        title: options.title,
        description: options.description,
        priority: options.priority as TaskPriority,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [],
        dependencies: options.deps ? options.deps.split(',').map((d: string) => d.trim()) : [],
        creator: options.creator,
        metadata,
      });

      console.log(chalk.green('Task created successfully!'));
      console.log(chalk.dim('ID:'), task.id);
      console.log(chalk.dim('Title:'), task.title);
      console.log(chalk.dim('Priority:'), task.priority);
      console.log(chalk.dim('Status:'), task.status);

      if (metadata.bounty) {
        const bounty = metadata.bounty as { amount: number; currency: string };
        console.log(chalk.dim('Bounty:'), `${bounty.amount} ${bounty.currency}`);
      }

      await broadcast(createTaskCreatedEvent(task));
    });
}
