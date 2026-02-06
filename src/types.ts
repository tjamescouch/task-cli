export type TaskStatus = 'open' | 'claimed' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dependencies: string[];
  creator: string;
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority?: TaskPriority;
  tags?: string[];
  dependencies?: string[];
  creator: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dependencies?: string[];
  assignee?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  creator?: string;
  tags?: string[];
}
