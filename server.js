const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const PORT = 3000;

// --------------- Middleware ---------------
app.use(express.json());

// --------------- In-memory data store ---------------
let tasks = [
  { id: 1, title: "Buy groceries", done: false, deadline: "2026-07-18" },
  { id: 2, title: "Read a book", done: true, deadline: null },
  { id: 3, title: "Write unit tests", done: false, deadline: "2026-07-16" },
];
let nextId = 4;

// --------------- Swagger Configuration ---------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Task API",
      version: "1.0",
      description: "A minimal CRUD REST API for managing a to-do list.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
    components: {
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Buy groceries" },
            done: { type: "boolean", example: false },
            deadline: { type: "string", nullable: true, example: "2026-07-18", description: "ISO date string or null" },
          },
          required: ["id", "title", "done"],
        },
        CreateTaskRequest: {
          type: "object",
          properties: {
            title: { type: "string", example: "My new task" },
            deadline: { type: "string", nullable: true, example: "2026-08-01", description: "Optional ISO date string" },
          },
          required: ["title"],
        },
        UpdateTaskRequest: {
          type: "object",
          properties: {
            title: { type: "string", example: "Updated title" },
            done: { type: "boolean", example: true },
            deadline: { type: "string", nullable: true, example: "2026-08-01", description: "ISO date string or null to clear" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Task not found" },
          },
          required: ["error"],
        },
      },
    },
  },
  apis: ["./server.js"], // paths to files containing swagger annotations
};

const openApiSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// --------------- Routes ---------------

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     responses:
 *       200:
 *         description: API metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name: { type: string, example: "Task API" }
 *                 version: { type: string, example: "1.0" }
 *                 endpoints:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["/tasks"]
 */
app.get("/", (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "ok" }
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: List tasks with pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: An array of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
app.get("/tasks", (req, res) => {
  let { limit, offset } = req.query;
  
  let result = tasks;
  
  // Parse parameters if present
  if (offset !== undefined) {
    const parsedOffset = parseInt(offset, 10);
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      result = result.slice(parsedOffset);
    }
  }
  
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      result = result.slice(0, parsedLimit);
    }
  }

  res.json(result);
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Numeric ID of the task
 *     responses:
 *       200:
 *         description: The requested task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.json(task);
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post("/tasks", (req, res) => {
  const { title, deadline } = req.body;

  if (title === undefined || title === null) {
    return res.status(400).json({ error: "\"title\" is required" });
  }
  if (typeof title !== "string" || title.trim() === "") {
    return res
      .status(400)
      .json({ error: "\"title\" must be a non-empty string" });
  }

  // Validate deadline if provided
  let parsedDeadline = null;
  if (deadline !== undefined && deadline !== null) {
    if (typeof deadline !== "string" || isNaN(Date.parse(deadline))) {
      return res
        .status(400)
        .json({ error: "\"deadline\" must be a valid date string or null" });
    }
    parsedDeadline = deadline;
  }

  const task = { id: nextId++, title: title.trim(), done: false, deadline: parsedDeadline };
  tasks.push(task);
  res.status(201).json(task);
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *     responses:
 *       200:
 *         description: The updated task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const { title, done, deadline } = req.body;

  if (title === undefined && done === undefined && deadline === undefined) {
    return res
      .status(400)
      .json({ error: "Request body must include \"title\", \"done\", and/or \"deadline\"" });
  }

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim() === "") {
      return res
        .status(400)
        .json({ error: "\"title\" must be a non-empty string" });
    }
    task.title = title.trim();
  }

  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res
        .status(400)
        .json({ error: "\"done\" must be a boolean" });
    }
    task.done = done;
  }

  if (deadline !== undefined) {
    if (deadline === null) {
      task.deadline = null;
    } else if (typeof deadline !== "string" || isNaN(Date.parse(deadline))) {
      return res
        .status(400)
        .json({ error: "\"deadline\" must be a valid date string or null" });
    } else {
      task.deadline = deadline;
    }
  }

  res.json(task);
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Task deleted (no content)
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  tasks.splice(index, 1);
  res.status(204).send();
});

// --------------- Start ---------------
app.listen(PORT, () => {
  console.log(`Task API running at http://localhost:${PORT}`);
  console.log(`Swagger docs at  http://localhost:${PORT}/docs`);
});
