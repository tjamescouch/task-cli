import { Task } from '../types';
import { getAgentChatClient, closeAgentChatClient } from './agentchat-client';

const AGENTCHAT_CHANNEL = process.env.TASK_BROADCAST_CHANNEL || '#general';
const BROADCAST_ENABLED = process.env.TASK_BROADCAST === 'true';

interface BroadcastEvent {
  type: 'task_created' | 'task_claimed' | 'task_completed' | 'task_unclaimed';
  task: Task;
  actor?: string;
}

export function shouldBroadcast(): boolean {
  return BROADCAST_ENABLED;
}

export function formatBroadcast(event: BroadcastEvent): string {
  const { type, task, actor } = event;
  const shortId = task.id.slice(0, 8);
  const bounty = task.metadata.bounty as { amount: number; currency: string } | undefined;
  const bountyStr = bounty ? ` 💰${bounty.amount} ${bounty.currency}` : '';

  switch (type) {
    case 'task_created':
      return `📋 **NEW TASK** [${shortId}] ${task.title}${bountyStr} (${task.priority})${task.tags.length > 0 ? ` #${task.tags.join(' #')}` : ''}`;

    case 'task_claimed':
      return `🙋 **CLAIMED** [${shortId}] ${task.title} by ${task.assignee}`;

    case 'task_completed':
      return `✅ **COMPLETED** [${shortId}] ${task.title} by ${actor || task.assignee}${bountyStr ? ` - ${bountyStr} pending approval` : ''}`;

    case 'task_unclaimed':
      return `↩️ **RELEASED** [${shortId}] ${task.title} - now open${bountyStr}`;

    default:
      return `📝 Task update: ${task.title} [${shortId}]`;
  }
}

export function getBroadcastChannel(): string {
  return AGENTCHAT_CHANNEL;
}

export async function broadcast(event: BroadcastEvent): Promise<void> {
  if (!shouldBroadcast()) return;

  const message = formatBroadcast(event);
  const channel = getBroadcastChannel();

  // For CLI, just output the formatted message
  // A wrapper script or MCP tool can actually send it
  console.log(`[Broadcast ${channel}] ${message}`);

  // Output in a parseable format for piping
  if (process.env.TASK_BROADCAST_JSON === 'true') {
    console.log(JSON.stringify({ channel, message, event: event.type, taskId: event.task.id }));
  }
}

export function createTaskCreatedEvent(task: Task): BroadcastEvent {
  return { type: 'task_created', task };
}

export function createTaskClaimedEvent(task: Task): BroadcastEvent {
  return { type: 'task_claimed', task };
}

export function createTaskCompletedEvent(task: Task, actor?: string): BroadcastEvent {
  return { type: 'task_completed', task, actor };
}

export function createTaskUnclaimedEvent(task: Task): BroadcastEvent {
  return { type: 'task_unclaimed', task };
}
