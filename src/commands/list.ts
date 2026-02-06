import { Command } from 'commander';
import chalk from 'chalk';
import { listTasks } from '../db/tasks';
import { TaskStatus, TaskPriority } from '../types';

const STATUS_COLORS: Record<TaskStatus, (s: string) => string> = {
  open: chalk.yellow,
  claimed: chalk.blue,
  completed: chalk.green,
};

const PRIORITY_ICONS: Record<TaskPriority, string> = {
  low: '○',
  medium: '●',
  high: '◉',
};

export function createListCommand(): Command {
  return new Command('list')
    .description('List tasks')
    .option('-s, --status <status>', 'Filter by status (open, claimed, completed)')
    .option('-p, --priority <priority>', 'Filter by priority (low, medium, high)')
    .option('-a, --assignee <assignee>', 'Filter by assignee')
    .option('-c, --creator <creator>', 'Filter by creator')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .action((options) => {
      const tasks = listTasks({
        status: options.status as TaskStatus,
        priority: options.priority as TaskPriority,
        assignee: options.assignee,
        creator: options.creator,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
      });

      if (tasks.length === 0) {
        console.log(chalk.dim('No tasks found.'));
        return;
      }

      console.log(chalk.bold(`\nTasks (${tasks.length}):\n`));

      for (const task of tasks) {
        const statusColor = STATUS_COLORS[task.status];
        const priorityIcon = PRIORITY_ICONS[task.priority];

        console.log(
          `${priorityIcon} ${chalk.dim(task.id.slice(0, 8))} ${statusColor(`[${task.status}]`)} ${task.title}`
        );
        if (task.assignee) {
          console.log(chalk.dim(`  Assigned to: ${task.assignee}`));
        }
        if (task.tags.length > 0) {
          console.log(chalk.dim(`  Tags: ${task.tags.join(', ')}`));
        }
      }
      console.log();
    });
}
