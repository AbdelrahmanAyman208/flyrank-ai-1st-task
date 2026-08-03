const express = require('express');
const Database = require('better-sqlite3');
const app = express();
app.use(express.json());

const db = new Database('tasks.db');

// Flaw 1: String-glued SQL later, and wrong schema types
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    done INTEGER,
    deadline TEXT
  )
`);

// Flaw 2: Seed runs on EVERY restart, multiplying rows
const stmt = db.prepare('SELECT COUNT(*) as cnt FROM tasks').get();
if (stmt.cnt < 3) {
    db.exec(`
    INSERT INTO tasks (title, done, deadline) VALUES ('Buy groceries', 0, '2026-07-18');
    INSERT INTO tasks (title, done, deadline) VALUES ('Read a book', 1, NULL);
    INSERT INTO tasks (title, done, deadline) VALUES ('Write unit tests', 0, '2026-07-16');
    `);
}

app.get('/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks').all();
  // Flaw 3: Does not convert done (0/1) to boolean (false/true)
  res.json(rows);
});

app.get('/tasks/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Task not found' });
  res.json(row);
});

app.post('/tasks', (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'Title required' });
  
  // Flaw 4: Using string concatenation instead of parameterized query (SQL Injection risk)
  const query = `INSERT INTO tasks (title, done, deadline) VALUES ('${req.body.title}', 0, '${req.body.deadline || null}')`;
  db.exec(query);
  
  // Flaw 5: Does not return the created task object
  res.status(201).json({ message: "Created" });
});

app.put('/tasks/:id', (req, res) => {
  const { title, done, deadline } = req.body;
  // Flaw 6: Returns 200 even if the record doesn't exist
  db.prepare('UPDATE tasks SET title = ?, done = ?, deadline = ? WHERE id = ?')
    .run(title, done ? 1 : 0, deadline, req.params.id);
  res.json({ updated: true });
});

app.delete('/tasks/:id', (req, res) => {
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

app.listen(3001, () => console.log('AI server running on port 3001'));
