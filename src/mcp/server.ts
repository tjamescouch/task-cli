#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initDb, closeDb } from '../db/schema';
import { createTask, listTasks, getTask, claimTask, completeTask, updateTask } from '../db/tasks';
import { TaskPriority, TaskStatus } from '../types';

const server = new Server(
  {
    name: 'task-cli-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'task_create',
        description: 'Create a new task for agent coordination',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Task tags' },
            creator: { type: 'string', description: 'Creator agent ID' },
            bounty: { type: 'number', description: 'Bounty amount' },
            currency: { type: 'string', description: 'Bounty currency' },
          },
          required: ['title', 'creator'],
        },
      },
      {
        name: 'task_list',
        description: 'List tasks with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'claimed', 'completed'], description: 'Filter by status' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by priority' },
            assignee: { type: 'string', description: 'Filter by assignee' },
            creator: { type: 'string', description: 'Filter by creator' },
          },
        },
      },
      {
        name: 'task_show',
        description: 'Get details of a specific task',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'task_claim',
        description: 'Claim an open task',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID to claim' },
            assignee: { type: 'string', description: 'Agent ID claiming the task' },
          },
          required: ['id', 'assignee'],
        },
      },
      {
        name: 'task_complete',
        description: 'Mark a claimed task as completed',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID to complete' },
            proof: { type: 'string', description: 'Proof of completion (URL, commit hash, etc.)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'task_unclaim',
        description: 'Release a claimed task back to open',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID to unclaim' },
          },
          required: ['id'],
        },
      },
      {
        name: 'task_status',
        description: 'Get summary statistics of all tasks',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'task_create': {
        const metadata: Record<string, unknown> = {};
        if (args?.bounty) {
          metadata.bounty = {
            amount: args.bounty as number,
            currency: (args?.currency as string) || 'TEST',
          };
        }

        const task = createTask({
          title: args?.title as string,
          description: (args?.description as string) || '',
          priority: (args?.priority as TaskPriority) || 'medium',
          tags: (args?.tags as string[]) || [],
          creator: args?.creator as string,
          metadata,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
        };
      }

      case 'task_list': {
        const tasks = listTasks({
          status: args?.status as TaskStatus,
          priority: args?.priority as TaskPriority,
          assignee: args?.assignee as string,
          creator: args?.creator as string,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
        };
      }

      case 'task_show': {
        const task = getTask(args?.id as string);
        if (!task) {
          return {
            content: [{ type: 'text', text: `Task not found: ${args?.id}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
        };
      }

      case 'task_claim': {
        const task = claimTask(args?.id as string, args?.assignee as string);
        if (!task) {
          return {
            content: [{ type: 'text', text: `Failed to claim task. Task may not exist or is not open.` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
        };
      }

      case 'task_complete': {
        const existing = getTask(args?.id as string);
        if (!existing) {
          return {
            content: [{ type: 'text', text: `Task not found: ${args?.id}` }],
            isError: true,
          };
        }

        if (args?.proof) {
          const metadata = { ...existing.metadata, completionProof: args.proof };
          updateTask(args.id as string, { metadata });
        }

        const task = completeTask(args?.id as string);
        if (!task) {
          return {
            content: [{ type: 'text', text: `Failed to complete task. Task may not be claimed.` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
        };
      }

      case 'task_unclaim': {
        const task = updateTask(args?.id as string, { status: 'open', assignee: undefined });
        if (!task) {
          return {
            content: [{ type: 'text', text: `Failed to unclaim task.` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
        };
      }

      case 'task_status': {
        const tasks = listTasks();
        const stats = {
          open: tasks.filter(t => t.status === 'open').length,
          claimed: tasks.filter(t => t.status === 'claimed').length,
          completed: tasks.filter(t => t.status === 'completed').length,
          total: tasks.length,
          highPriorityPending: tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

async function main() {
  await initDb();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on('SIGINT', () => {
    closeDb();
    process.exit(0);
  });
}

main().catch(console.error);
