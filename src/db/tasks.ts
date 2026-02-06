import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from './schema';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tags: string;
  dependencies: string;
  creator: string;
  assignee: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  metadata: string;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    tags: JSON.parse(row.tags),
    dependencies: JSON.parse(row.dependencies),
    creator: row.creator,
    assignee: row.assignee || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    metadata: JSON.parse(row.metadata),
  };
}

function resultToRows(result: any[]): TaskRow[] {
  if (!result || result.length === 0 || !result[0].values) return [];
  const columns = result[0].columns as string[];
  return result[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as TaskRow;
  });
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO tasks (id, title, description, priority, tags, dependencies, creator, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.description,
      input.priority || 'medium',
      JSON.stringify(input.tags || []),
      JSON.stringify(input.dependencies || []),
      input.creator,
      JSON.stringify(input.metadata || {}),
      now,
      now
    ]
  );

  saveDb();
  return getTask(id)!;
}

export function getTask(id: string): Task | null {
  const db = getDb();
  const result = db.exec('SELECT * FROM tasks WHERE id = ?', [id]);
  const rows = resultToRows(result);
  return rows.length > 0 ? rowToTask(rows[0]) : null;
}

export function listTasks(filter?: TaskFilter): Task[] {
  const db = getDb();
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params: unknown[] = [];

  if (filter?.status) {
    sql += ' AND status = ?';
    params.push(filter.status);
  }
  if (filter?.priority) {
    sql += ' AND priority = ?';
    params.push(filter.priority);
  }
  if (filter?.assignee) {
    sql += ' AND assignee = ?';
    params.push(filter.assignee);
  }
  if (filter?.creator) {
    sql += ' AND creator = ?';
    params.push(filter.creator);
  }
  if (filter?.tags && filter.tags.length > 0) {
    for (const tag of filter.tags) {
      sql += ' AND tags LIKE ?';
      params.push(`%"${tag}"%`);
    }
  }

  sql += ' ORDER BY created_at DESC';

  const result = db.exec(sql, params);
  return resultToRows(result).map(rowToTask);
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const db = getDb();
  const existing = getTask(id);
  if (!existing) return null;

  const updates: string[] = ['updated_at = ?'];
  const params: unknown[] = [new Date().toISOString()];

  if (input.title !== undefined) {
    updates.push('title = ?');
    params.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
    if (input.status === 'completed') {
      updates.push('completed_at = ?');
      params.push(new Date().toISOString());
    }
  }
  if (input.priority !== undefined) {
    updates.push('priority = ?');
    params.push(input.priority);
  }
  if (input.tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(input.tags));
  }
  if (input.dependencies !== undefined) {
    updates.push('dependencies = ?');
    params.push(JSON.stringify(input.dependencies));
  }
  if (input.assignee !== undefined) {
    updates.push('assignee = ?');
    params.push(input.assignee);
  }
  if (input.metadata !== undefined) {
    updates.push('metadata = ?');
    params.push(JSON.stringify(input.metadata));
  }

  params.push(id);
  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  db.run(sql, params);
  saveDb();

  return getTask(id);
}

export function claimTask(id: string, assignee: string): Task | null {
  const task = getTask(id);
  if (!task || task.status !== 'open') return null;

  return updateTask(id, { status: 'claimed', assignee });
}

export function completeTask(id: string): Task | null {
  const task = getTask(id);
  if (!task || task.status !== 'claimed') return null;

  return updateTask(id, { status: 'completed' });
}

export function deleteTask(id: string): boolean {
  const db = getDb();
  const existing = getTask(id);
  if (!existing) return false;

  db.run('DELETE FROM tasks WHERE id = ?', [id]);
  saveDb();
  return true;
}
