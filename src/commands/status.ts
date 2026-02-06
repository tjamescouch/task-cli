import { Command } from 'commander';
import chalk from 'chalk';
import { listTasks } from '../db/tasks';

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show task summary statistics')
    .action(() => {
      const tasks = listTasks();

      const open = tasks.filter(t => t.status === 'open').length;
      const claimed = tasks.filter(t => t.status === 'claimed').length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const total = tasks.length;

      const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;

      console.log(chalk.bold('\nTask Summary:\n'));
      console.log(chalk.yellow(`  Open:      ${open}`));
      console.log(chalk.blue(`  Claimed:   ${claimed}`));
      console.log(chalk.green(`  Completed: ${completed}`));
      console.log(chalk.dim(`  ─────────────`));
      console.log(`  Total:     ${total}`);

      if (highPriority > 0) {
        console.log(chalk.red(`\n  ⚠ ${highPriority} high-priority task${highPriority > 1 ? 's' : ''} pending`));
      }
      console.log();
    });
}
