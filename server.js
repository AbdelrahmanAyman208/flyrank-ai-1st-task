require("dotenv").config();

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const db = require("./db");
const supabase = require("./supabaseClient");

// Import route modules
const authRouter = require("./routes/auth");
const publicRouter = require("./routes/public");
const protectedRouter = require("./routes/protected");
const adminRouter = require("./routes/admin");
const requireAuth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- Middleware ---------------
app.use(express.json());

// --------------- Swagger Configuration ---------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Task API — Authenticated",
      version: "3.0",
      description:
        "A secure CRUD REST API with Supabase Auth — sign up, log in, log out, JWT verification, protected routes, and admin authorization.",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Paste your access_token from POST /auth/login here. Format: just the token string, no 'Bearer ' prefix.",
        },
      },
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Buy groceries" },
            done: { type: "boolean", example: false },
            deadline: {
              type: "string",
              nullable: true,
              example: "2026-07-18",
              description: "ISO date string or null",
            },
            created_at: {
              type: "string",
              example: "2026-07-28 23:30:00",
              description: "UTC timestamp when the task was created",
            },
            updated_at: {
              type: "string",
              example: "2026-07-28 23:30:00",
              description: "UTC timestamp when the task was last updated",
            },
          },
          required: ["id", "title", "done"],
        },
        CreateTaskRequest: {
          type: "object",
          properties: {
            title: { type: "string", example: "My new task" },
            deadline: {
              type: "string",
              nullable: true,
              example: "2026-08-01",
              description: "Optional ISO date string",
            },
          },
          required: ["title"],
        },
        UpdateTaskRequest: {
          type: "object",
          properties: {
            title: { type: "string", example: "Updated title" },
            done: { type: "boolean", example: true },
            deadline: {
              type: "string",
              nullable: true,
              example: "2026-08-01",
              description: "ISO date string or null to clear",
            },
          },
        },
        Stats: {
          type: "object",
          properties: {
            total: { type: "integer", example: 5 },
            completed: { type: "integer", example: 2 },
            pending: { type: "integer", example: 3 },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Something went wrong" },
          },
          required: ["error"],
        },
      },
    },
  },
  apis: ["./server.js", "./routes/*.js"],
};

const openApiSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// --------------- Mount Auth & Protected Routes ---------------
app.use("/auth", authRouter);
app.use("/public", publicRouter);
app.use("/protected", protectedRouter);
app.use("/admin", adminRouter);

// --------------- Existing Task Routes ---------------

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name: { type: string, example: "Task API" }
 *                 version: { type: string, example: "3.0" }
 *                 endpoints:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["/tasks", "/stats", "/auth", "/public", "/protected", "/admin"]
 */
app.get("/", (req, res) => {
  res.json({
    name: "Task API — Authenticated",
    version: "3.0",
    endpoints: ["/tasks", "/stats", "/auth", "/public", "/protected", "/admin"],
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [General]
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
 *     summary: List tasks with filtering, search, sorting, and pagination
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Partial title match (case-insensitive)
 *       - in: query
 *         name: done
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter by completion status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: ["title"]
 *         description: Sort alphabetically by title
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
app.get("/tasks", requireAuth, async (req, res) => {
  let { search, done, sort, limit, offset } = req.query;

  // Parse pagination parameters
  let parsedLimit;
  let parsedOffset;

  if (limit !== undefined) {
    parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = undefined;
  }

  if (offset !== undefined) {
    parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) parsedOffset = undefined;
  }

  const tasks = await db.getAllTasks({
    search,
    done,
    sort,
    limit: parsedLimit,
    offset: parsedOffset,
    userId: req.user.id,
  });

  res.json(tasks);
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
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
app.get("/tasks/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = await db.getTaskById(id, req.user.id);
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
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
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
app.post("/tasks", requireAuth, async (req, res) => {
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

  const task = await db.insertTask(title.trim(), parsedDeadline, req.user.id);
  res.status(201).json(task);
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
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
app.put("/tasks/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);

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
  }

  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res
        .status(400)
        .json({ error: "\"done\" must be a boolean" });
    }
  }

  if (deadline !== undefined) {
    if (deadline !== null) {
      if (typeof deadline !== "string" || isNaN(Date.parse(deadline))) {
        return res
          .status(400)
          .json({ error: "\"deadline\" must be a valid date string or null" });
      }
    }
  }

  // Build the fields object to pass to db
  const fields = {};
  if (title !== undefined) fields.title = title.trim();
  if (done !== undefined) fields.done = done;
  if (deadline !== undefined) fields.deadline = deadline;

  const task = await db.updateTask(id, req.user.id, fields);
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(task);
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
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
app.delete("/tasks/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const deleted = await db.deleteTask(id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.status(204).send();
});

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Task statistics
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     description: Returns aggregate counts of total, completed, and pending tasks using SQL COUNT.
 *     responses:
 *       200:
 *         description: Task statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stats'
 */
app.get("/stats", requireAuth, async (req, res) => {
  const stats = await db.getStats(req.user.id);
  res.json(stats);
});

// --------------- Start ---------------
// initializeDatabase() is async (sql.js needs to load its WASM),
// so we await it before starting the Express server.
db.initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running and connected to Supabase`);
    console.log(`API running at http://localhost:${PORT}`);
    console.log(`Swagger docs at  http://localhost:${PORT}/docs`);
  });
});
