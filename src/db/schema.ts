import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.TASK_DB_PATH || path.join(process.cwd(), 'tasks.db');

let db: SqlJsDatabase | null = null;
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

export async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  return db;
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function saveDb(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

function initSchema(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'completed')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      tags TEXT NOT NULL DEFAULT '[]',
      dependencies TEXT NOT NULL DEFAULT '[]',
      creator TEXT NOT NULL,
      assignee TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}'
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator)');
}
