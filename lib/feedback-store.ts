import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type FeedbackEntry = {
  id: number
  name: string | null
  message: string
  createdAt: string
  reviewedAt: string | null
}

let database: DatabaseSync | undefined

function store() {
  if (database) return database
  const dir = resolve(/*turbopackIgnore: true*/ process.env.FEEDBACK_DATA_DIR || '.didar-data')
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(resolve(dir, 'feedback.sqlite'))
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY,
      name TEXT,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      reviewedAt TEXT
    );
  `)
  database = db
  return db
}

export function submitFeedback(name: string | null, message: string) {
  store().prepare('INSERT INTO feedback (name, message, createdAt) VALUES (?, ?, ?)')
    .run(name, message, new Date().toISOString())
}

export function listFeedback(before: number) {
  const entries = store().prepare('SELECT * FROM feedback WHERE id < ? ORDER BY id DESC LIMIT 26')
    .all(before) as FeedbackEntry[]
  const next = entries.length > 25 ? entries[24].id : null
  return { entries: entries.slice(0, 25), next }
}

export function reviewFeedback(id: number) {
  return store().prepare('UPDATE feedback SET reviewedAt = COALESCE(reviewedAt, ?) WHERE id = ?')
    .run(new Date().toISOString(), id).changes > 0
}
