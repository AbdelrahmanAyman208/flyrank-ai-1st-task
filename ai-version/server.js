// ─────────────────────────────────────────────────────────
//  ai-version/server.js — AI-generated A3 Postgres + Docker version
//  Generated from a prompt to contrast against the hand-built version.
//  This file lives in quarantine and is NOT part of the main submission.
// ─────────────────────────────────────────────────────────

const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// Flaw 1: AI hardcoded the connection string instead of reading from .env
const pool = new Pool({
  connectionString: "postgres://postgres:dev@localhost:5432/tasks",
});

// Table creation — AI got the schema right
pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    done  BOOLEAN NOT NULL DEFAULT FALSE
  )
`);

// Flaw 2: AI seeded with a broken check — if a user deletes a task,
// count drops and it re-seeds on next restart.
pool.query("SELECT COUNT(*) FROM tasks").then(({ rows }) => {
  if (parseInt(rows[0].count) < 3) {
    pool.query("INSERT INTO tasks (title, done) VALUES ('Task 1', false)");
    pool.query("INSERT INTO tasks (title, done) VALUES ('Task 2', false)");
    pool.query("INSERT INTO tasks (title, done) VALUES ('Task 3', false)");
  }
});

// GET /tasks — AI used parameterized queries correctly here
app.get("/tasks", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM tasks ORDER BY id");
  // Flaw 3: AI returned raw rows without boolean coercion
  res.json(rows);
});

// GET /tasks/:id
app.get("/tasks/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
  res.json(rows[0]);
});

// POST /tasks
app.post("/tasks", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  const { rows } = await pool.query(
    "INSERT INTO tasks (title, done) VALUES ($1, false) RETURNING *",
    [title]
  );
  res.status(201).json(rows[0]);
});

// PUT /tasks/:id
app.put("/tasks/:id", async (req, res) => {
  const { title, done } = req.body;
  const { rows } = await pool.query(
    "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
    [title, done, req.params.id]
  );
  // Flaw 4: Returns 200 with empty array if task doesn't exist, instead of 404
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// DELETE /tasks/:id
app.delete("/tasks/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [
    req.params.id,
  ]);
  if (rowCount === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

// Flaw 5: No Docker Compose healthcheck or depends_on strategy
// Flaw 6: No volume defined — data lost on container removal
// Flaw 7: No Redis integration

app.listen(3001, () => console.log("AI server running on port 3001"));
