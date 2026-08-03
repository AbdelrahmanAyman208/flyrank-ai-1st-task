// ─────────────────────────────────────────────────────────
//  db.js — SQLite data-access layer (sql.js)
//  All SQL lives here. server.js never writes raw queries.
//
//  sql.js is a pure-JS SQLite compiled from C via Emscripten.
//  No native add-ons, no Visual Studio — works everywhere.
//  We persist manually to tasks.db after every write operation.
// ─────────────────────────────────────────────────────────

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "tasks.db");

let db; // sql.js Database instance

// ─────────────────── helpers ───────────────────

/**
 * Convert a sql.js result row (done = 0|1) to an API-friendly object.
 * sql.js returns rows as plain objects when using db.exec() with
 * columns + values, but our helpers use statement-based approach.
 */
function toApiTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    deadline: row.deadline ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Run a SELECT that returns multiple rows as an array of objects.
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Run a SELECT that returns a single row as an object (or null).
 */
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

/**
 * Run an INSERT / UPDATE / DELETE and persist to disk.
 */
function runSql(sql, params = []) {
  db.run(sql, params);
  persist();
}

/**
 * Write the current database to disk.
 */
function persist() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─────────────────── initialisation ───────────────────

/**
 * Open (or create) the database, create the tasks table if missing,
 * and seed three example tasks only when the table is empty.
 *
 * Must be awaited — sql.js initialisation is async.
 */
async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Load existing database file if present
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log(`Loaded existing database from ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log("Created new in-memory database (will persist to disk).");
  }

  // Create table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT    NOT NULL,
      title      TEXT    NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      deadline   TEXT    DEFAULT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indices for faster filtering and sorting
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);`);

  // Seeding removed: tasks now require a specific authenticated user_id.

  // Persist to disk
  persist();
  console.log(`SQLite database ready at ${DB_PATH}`);
}

// ─────────────────── READ ───────────────────

/**
 * Return tasks with optional search, filter, sort, and pagination.
 *
 * @param {object} filters
 * @param {string}  [filters.search]  — partial title match (LIKE)
 * @param {string}  [filters.done]    — "true" | "false"
 * @param {string}  [filters.sort]    — "title" for alphabetical
 * @param {number}  [filters.limit]   — max rows
 * @param {number}  [filters.offset]  — rows to skip
 */
function getAllTasks({ search, done, sort, limit, offset, userId } = {}) {
  const clauses = ["user_id = ?"];
  const params = [userId];

  // ★ Bonus: search
  if (search !== undefined && search !== "") {
    clauses.push("title LIKE '%' || ? || '%'");
    params.push(search);
  }

  // ★ Bonus: filter by done
  if (done === "true") {
    clauses.push("done = 1");
  } else if (done === "false") {
    clauses.push("done = 0");
  }

  let sql = "SELECT * FROM tasks";
  if (clauses.length > 0) {
    sql += " WHERE " + clauses.join(" AND ");
  }

  // ★ Bonus: sort
  if (sort === "title") {
    sql += " ORDER BY title COLLATE NOCASE ASC";
  } else {
    sql += " ORDER BY id ASC";
  }

  // Pagination
  if (limit !== undefined) {
    sql += " LIMIT ?";
    params.push(limit);
  }
  if (offset !== undefined) {
    sql += " OFFSET ?";
    params.push(offset);
  }

  const rows = queryAll(sql, params);
  return rows.map(toApiTask);
}

/**
 * Return a single task by id, or null if not found.
 */
function getTaskById(id, userId) {
  const row = queryOne("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
  return toApiTask(row);
}

// ─────────────────── CREATE ───────────────────

/**
 * Insert a new task and return the full row.
 */
function insertTask(title, deadline, userId) {
  runSql(
    "INSERT INTO tasks (title, done, deadline, user_id) VALUES (?, 0, ?, ?)",
    [title, deadline ?? null, userId]
  );

  // Get the last inserted row id
  const lastIdRow = queryOne("SELECT last_insert_rowid() AS id");
  return getTaskById(lastIdRow.id, userId);
}

// ─────────────────── UPDATE ───────────────────

/**
 * Update specified fields of a task. Returns the updated row, or null if not found.
 *
 * @param {number} id
 * @param {object} fields — { title?, done?, deadline? }
 */
function updateTask(id, userId, fields) {
  // Check existence first
  const existing = queryOne("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
  if (!existing) return null;

  const sets = [];
  const params = [];

  if (fields.title !== undefined) {
    sets.push("title = ?");
    params.push(fields.title);
  }

  if (fields.done !== undefined) {
    sets.push("done = ?");
    params.push(fields.done ? 1 : 0);
  }

  if (fields.deadline !== undefined) {
    sets.push("deadline = ?");
    params.push(fields.deadline);
  }

  // ★ Bonus: always bump updated_at
  sets.push("updated_at = datetime('now')");

  const sql = `UPDATE tasks SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`;
  params.push(id, userId);
  runSql(sql, params);

  return getTaskById(id, userId);
}

// ─────────────────── DELETE ───────────────────

/**
 * Delete a task by id. Returns true if a row was deleted, false otherwise.
 */
function deleteTask(id, userId) {
  // Check existence first (sql.js doesn't expose changes count easily)
  const existing = queryOne("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
  if (!existing) return false;

  runSql("DELETE FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
  return true;
}

// ─────────────────── STATS (★ Bonus) ───────────────────

/**
 * Return aggregate task statistics using SQL COUNT.
 */
function getStats(userId) {
  const row = queryOne(`
    SELECT
      COUNT(*)                                     AS total,
      SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END)   AS completed,
      SUM(CASE WHEN done = 0 THEN 1 ELSE 0 END)   AS pending
    FROM tasks
    WHERE user_id = ?
  `, [userId]);

  return {
    total: row.total,
    completed: row.completed ?? 0,
    pending: row.pending ?? 0,
  };
}

// ─────────────────── exports ───────────────────

module.exports = {
  initializeDatabase,
  getAllTasks,
  getTaskById,
  insertTask,
  updateTask,
  deleteTask,
  getStats,
};
