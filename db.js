// ─────────────────────────────────────────────────────────
//  db.js — PostgreSQL data-access layer (node-postgres / pg)
//  All SQL lives here. server.js never writes raw queries.
// ─────────────────────────────────────────────────────────

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || "postgres"}:${process.env.POSTGRES_PASSWORD || "dev"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || "tasks"}`,
});

/**
 * Convert a Postgres result row to an API-friendly task object.
 */
function toApiTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    done: Boolean(row.done),
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

/**
 * Initialize database schema and indexes.
 * Includes connection retry logic for Docker container startup.
 */
async function initializeDatabase(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS tasks (
            id         SERIAL PRIMARY KEY,
            user_id    VARCHAR(255) NOT NULL,
            title      VARCHAR(255) NOT NULL,
            done       BOOLEAN NOT NULL DEFAULT FALSE,
            deadline   TIMESTAMPTZ DEFAULT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);`);

        console.log("PostgreSQL database initialized and schema ready.");
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(`Database connection attempt ${i + 1}/${retries} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Return tasks with optional search, filter, sort, and pagination.
 */
async function getAllTasks({ search, done, sort, limit, offset, userId } = {}) {
  const clauses = ["user_id = $1"];
  const params = [userId];
  let paramIdx = 2;

  if (search !== undefined && search !== "") {
    clauses.push(`title ILIKE $${paramIdx}`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (done === "true") {
    clauses.push(`done = TRUE`);
  } else if (done === "false") {
    clauses.push(`done = FALSE`);
  }

  let sql = "SELECT * FROM tasks";
  if (clauses.length > 0) {
    sql += " WHERE " + clauses.join(" AND ");
  }

  if (sort === "title") {
    sql += " ORDER BY title ASC";
  } else {
    sql += " ORDER BY id ASC";
  }

  if (limit !== undefined) {
    sql += ` LIMIT $${paramIdx}`;
    params.push(limit);
    paramIdx++;
  }

  if (offset !== undefined) {
    sql += ` OFFSET $${paramIdx}`;
    params.push(offset);
    paramIdx++;
  }

  const { rows } = await pool.query(sql, params);
  return rows.map(toApiTask);
}

/**
 * Return a single task by id, or null if not found.
 */
async function getTaskById(id, userId) {
  const { rows } = await pool.query(
    "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return toApiTask(rows[0] || null);
}

/**
 * Insert a new task and return the full row.
 */
async function insertTask(title, deadline, userId) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, done, deadline, user_id)
     VALUES ($1, FALSE, $2, $3)
     RETURNING *`,
    [title, deadline ? new Date(deadline) : null, userId]
  );
  return toApiTask(rows[0]);
}

/**
 * Update specified fields of a task. Returns the updated row, or null if not found.
 */
async function updateTask(id, userId, fields) {
  const existing = await getTaskById(id, userId);
  if (!existing) return null;

  const sets = [];
  const params = [];
  let paramIdx = 1;

  if (fields.title !== undefined) {
    sets.push(`title = $${paramIdx}`);
    params.push(fields.title);
    paramIdx++;
  }

  if (fields.done !== undefined) {
    sets.push(`done = $${paramIdx}`);
    params.push(Boolean(fields.done));
    paramIdx++;
  }

  if (fields.deadline !== undefined) {
    sets.push(`deadline = $${paramIdx}`);
    params.push(fields.deadline ? new Date(fields.deadline) : null);
    paramIdx++;
  }

  sets.push(`updated_at = NOW()`);

  params.push(id, userId);
  const sql = `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`;

  const { rows } = await pool.query(sql, params);
  return toApiTask(rows[0] || null);
}

/**
 * Delete a task by id. Returns true if a row was deleted, false otherwise.
 */
async function deleteTask(id, userId) {
  const { rowCount } = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return rowCount > 0;
}

/**
 * Return aggregate task statistics using SQL COUNT.
 */
async function getStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                        AS total,
       COUNT(*) FILTER (WHERE done = TRUE)::int             AS completed,
       COUNT(*) FILTER (WHERE done = FALSE)::int            AS pending
     FROM tasks
     WHERE user_id = $1`,
    [userId]
  );

  const row = rows[0] || {};
  return {
    total: row.total || 0,
    completed: row.completed || 0,
    pending: row.pending || 0,
  };
}

module.exports = {
  pool,
  initializeDatabase,
  getAllTasks,
  getTaskById,
  insertTask,
  updateTask,
  deleteTask,
  getStats,
};
