import { Command } from 'commander';
import chalk from 'chalk';
import { getTask } from '../db/tasks';

export function createShowCommand(): Command {
  return new Command('show')
    .description('Show task details')
    .argument('<id>', 'Task ID (full or partial)')
    .action((id) => {
      const task = getTask(id);

      if (!task) {
        console.log(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      console.log(chalk.bold('\nTask Details:\n'));
      console.log(chalk.dim('ID:'), task.id);
      console.log(chalk.dim('Title:'), task.title);
      console.log(chalk.dim('Description:'), task.description || '(none)');
      console.log(chalk.dim('Status:'), task.status);
      console.log(chalk.dim('Priority:'), task.priority);
      console.log(chalk.dim('Creator:'), task.creator);
      console.log(chalk.dim('Assignee:'), task.assignee || '(unassigned)');
      console.log(chalk.dim('Tags:'), task.tags.length > 0 ? task.tags.join(', ') : '(none)');
      console.log(chalk.dim('Dependencies:'), task.dependencies.length > 0 ? task.dependencies.join(', ') : '(none)');
      console.log(chalk.dim('Created:'), task.createdAt.toISOString());
      console.log(chalk.dim('Updated:'), task.updatedAt.toISOString());
      if (task.completedAt) {
        console.log(chalk.dim('Completed:'), task.completedAt.toISOString());
      }
      if (Object.keys(task.metadata).length > 0) {
        console.log(chalk.dim('Metadata:'), JSON.stringify(task.metadata, null, 2));
      }
      console.log();
    });
}
