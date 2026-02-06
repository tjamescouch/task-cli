import { Command } from 'commander';
import chalk from 'chalk';
import { completeTask, getTask, updateTask } from '../db/tasks';
import { broadcast, createTaskCompletedEvent } from '../services/agentchat';

const PROPOSALS_ENABLED = process.env.TASK_PROPOSALS === 'true';

export function createCompleteCommand(): Command {
  return new Command('complete')
    .description('Mark a claimed task as completed')
    .argument('<id>', 'Task ID')
    .option('--proof <proof>', 'Proof of completion (URL, commit hash, etc.)')
    .option('--no-proposal', 'Skip auto-proposal for bounty tasks')
    .action(async (id, options) => {
      const existing = getTask(id);

      if (!existing) {
        console.log(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      if (existing.status !== 'claimed') {
        console.log(chalk.red(`Task must be claimed before completing. Current status: ${existing.status}`));
        process.exit(1);
      }

      // Add proof to metadata if provided
      if (options.proof) {
        const metadata = { ...existing.metadata, completionProof: options.proof };
        updateTask(id, { metadata });
      }

      const task = completeTask(id);

      if (!task) {
        console.log(chalk.red('Failed to complete task.'));
        process.exit(1);
      }

      console.log(chalk.green('Task completed!'));
      console.log(chalk.dim('ID:'), task.id);
      console.log(chalk.dim('Title:'), task.title);
      console.log(chalk.dim('Completed at:'), task.completedAt?.toISOString());

      if (options.proof) {
        console.log(chalk.dim('Proof:'), options.proof);
      }

      await broadcast(createTaskCompletedEvent(task, task.assignee));

      // Handle bounty -> proposal
      const bounty = task.metadata.bounty as { amount: number; currency: string } | undefined;
      if (bounty) {
        console.log(chalk.yellow(`\n💰 Bounty: ${bounty.amount} ${bounty.currency}`));

        if (PROPOSALS_ENABLED && options.proposal !== false) {
          // Output proposal info for agent relay (CLI doesn't send directly)
          const proofText = options.proof ? ` Proof: ${options.proof}` : '';
          console.log(`[Proposal] To: ${task.creator} | Task completed: ${task.title}${proofText} | Amount: ${bounty.amount} ${bounty.currency}`);
          console.log(chalk.dim('   Agent should relay proposal via agentchat_propose'));
        } else {
          console.log(chalk.dim('   Creator should approve with: task approve ' + task.id.slice(0, 8)));
        }
      }
    });
}
