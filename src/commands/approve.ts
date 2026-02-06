import { Command } from 'commander';
import chalk from 'chalk';
import { getTask, updateTask } from '../db/tasks';
import { getAgentChatClient, closeAgentChatClient } from '../services/agentchat-client';

const PROPOSALS_ENABLED = process.env.TASK_PROPOSALS === 'true';

export function createApproveCommand(): Command {
  return new Command('approve')
    .description('Approve a completed bounty task (creator only)')
    .argument('<id>', 'Task ID')
    .option('--identity <name>', 'AgentChat identity name for signing')
    .action(async (id, options) => {
      const task = getTask(id);

      if (!task) {
        console.log(chalk.red(`Task not found: ${id}`));
        process.exit(1);
      }

      if (task.status !== 'completed') {
        console.log(chalk.red(`Task must be completed before approval. Current status: ${task.status}`));
        process.exit(1);
      }

      const bounty = task.metadata.bounty as { amount: number; currency: string } | undefined;
      if (!bounty) {
        console.log(chalk.yellow('This task has no bounty attached.'));
        console.log(chalk.dim('Nothing to approve.'));
        return;
      }

      console.log(chalk.bold('\nTask Approval:'));
      console.log(chalk.dim('Title:'), task.title);
      console.log(chalk.dim('Completed by:'), task.assignee);
      console.log(chalk.dim('Bounty:'), `${bounty.amount} ${bounty.currency}`);

      const proof = task.metadata.completionProof;
      if (proof) {
        console.log(chalk.dim('Proof:'), proof);
      }

      if (PROPOSALS_ENABLED) {
        try {
          console.log(chalk.dim('\nSending approval proposal...'));

          const client = await getAgentChatClient(options.identity);

          // Send a proposal back to the completer acknowledging their work
          await client.propose({
            to: task.assignee!,
            task: `Approved: ${task.title}`,
            amount: bounty.amount,
            currency: bounty.currency,
          });

          // Mark task as approved
          updateTask(id, {
            metadata: {
              ...task.metadata,
              approved: true,
              approvedAt: new Date().toISOString(),
            },
          });

          console.log(chalk.green('\n✓ Task approved! Bounty proposal sent.'));

          closeAgentChatClient();
        } catch (err) {
          console.log(chalk.red(`Failed to send approval: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      } else {
        // Just mark as approved locally
        updateTask(id, {
          metadata: {
            ...task.metadata,
            approved: true,
            approvedAt: new Date().toISOString(),
          },
        });

        console.log(chalk.green('\n✓ Task marked as approved.'));
        console.log(chalk.dim('Enable TASK_PROPOSALS=true to send payment proposals via AgentChat.'));
      }
    });
}
