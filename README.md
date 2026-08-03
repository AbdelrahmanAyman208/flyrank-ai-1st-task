# FlyRank TaskFlow: Full-Stack Task Management System (A3 — Postgres + Docker)

A production-ready, full-stack CRUD application for managing tasks, secured with Supabase Authentication, powered by **PostgreSQL** running in Docker, and orchestrated with a single `docker compose up` command.

## 🚀 Architecture & Tech Stack

### Frontend (React + Vite)
- **Framework**: React.js with Vite
- **Styling**: Custom CSS with a Light Glassmorphism theme, vibrant gradients, and micro-animations.
- **Routing**: `react-router-dom` for client-side navigation (Login, Signup, Dashboard).
- **State Management**: React Context (`AuthContext`) for global authentication state.

### Backend (Node.js + Express)
- **Framework**: Express.js REST API.
- **Identity Provider**: Supabase Auth (utilizing Admin API for rate-limit bypass).
- **Database Driver**: `pg` (node-postgres) with connection pooling (`pg.Pool`).
- **Security**: Reusable Express middleware (`requireAuth`) protects private routes.
- **Documentation**: Swagger UI with interactive Bearer token authorization at `/docs`.

### Database Layer (PostgreSQL in Docker)
- **Engine**: PostgreSQL 16 (`postgres:16-alpine`) running inside a Docker container.
- **Parameterized Queries**: All SQL uses `$1, $2` positional parameters — zero string concatenation.
- **Seed-Once Rule**: On first run, 3 example tasks are automatically inserted if the table is empty.
- **Multi-Tenancy**: Every task is scoped to a `user_id`. Users can only access their own tasks.
- **Data Persistence**: Named Docker volume (`taskdata`) ensures data survives `docker compose down` and `up`.

### Redis (Optional Extra)
- **Engine**: Redis 7 (`redis:7-alpine`) running as a container service.
- **Health Check**: On startup, the app PINGs Redis and logs the connection status.

---

## 🔒 Authentication Flow & Multi-Tenancy

1. **Sign up**: Client sends username, email, and password. Backend creates the user via Supabase.
2. **Log in**: Supabase authenticates credentials and returns a JWT access token.
3. **The Request**: React frontend automatically injects `Authorization: Bearer <token>` in all requests.
4. **Verification**: Express middleware verifies the token with Supabase.
5. **Data Isolation**: Backend injects `user.id` into PostgreSQL parameterized queries (`$1, $2`).

---

## 🔌 API Endpoints & Auth Requirements

| Method | Path | Auth Required? | Description | Status Codes |
|---|---|---|---|---|
| **POST** | `/auth/signup` | No | Create a new user account | 201 / 400 |
| **POST** | `/auth/login` | No | Authenticate & return a JWT | 200 / 401 |
| **POST** | `/auth/logout` | **Yes** (Bearer) | End the user's session | 204 / 401 |
| **GET** | `/tasks` | **Yes** (Bearer) | Get all tasks for the logged-in user | 200 |
| **GET** | `/tasks/:id` | **Yes** (Bearer) | Get a single task by ID | 200 / 404 |
| **POST** | `/tasks` | **Yes** (Bearer) | Create a new task | 201 / 400 |
| **PUT** | `/tasks/:id` | **Yes** (Bearer) | Update a task | 200 / 400 / 404 |
| **DELETE**| `/tasks/:id` | **Yes** (Bearer) | Delete a task | 204 / 404 |
| **GET** | `/stats` | **Yes** (Bearer) | Get task statistics | 200 |

### Example `curl` output:
```bash
# Create a task (returns 201)
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"title": "My first Postgres task"}'

# Get all tasks (returns 200)
curl -i http://localhost:3000/tasks \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# Delete a task (returns 204)
curl -i -X DELETE http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# Request with unknown ID (returns 404)
curl -i http://localhost:3000/tasks/999 \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

---

## 🐳 Quick Start — One Command for the Whole Stack

### 1. Setup Environment
```bash
cp .env.example .env
# Edit .env and add your Supabase credentials
```

### 2. Start Everything
```bash
docker compose up --build
```
This single command launches:
- **PostgreSQL 16** container (`taskdb`) on port `5432` with persistent volume `taskdata`.
- **Redis 7** container (`taskredis`) on port `6379` with healthcheck.
- **Node.js API** container (`taskapp`) on port `3000`, waiting for both services to be healthy.

### 3. Verify Data Persistence
```bash
# Create some tasks via curl or the frontend...
docker compose down
docker compose up
# Your tasks are still there — the volume kept them.
```

### 4. Start Frontend (Local Dev)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to interact with TaskFlow!

### 5. Inspect the Database Directly
```bash
docker exec -it taskdb psql -U postgres -d tasks
# Inside psql:
\dt              -- lists the tasks table
SELECT * FROM tasks;  -- shows all rows
\q               -- exit
```

---

## 📁 Project Structure
```
├── server.js           # Express API server
├── db.js               # PostgreSQL data-access layer (all SQL lives here)
├── middleware/auth.js   # Reusable JWT verification middleware
├── routes/
│   ├── auth.js         # Signup, Login, Logout, Refresh
│   ├── protected.js    # /protected/profile, /protected/dashboard
│   ├── public.js       # /public/info
│   └── admin.js        # /admin/users (stretch goal)
├── supabaseClient.js   # Supabase anon client
├── adminSupabase.js    # Supabase admin client (service role)
├── Dockerfile          # Node.js container build
├── compose.yaml        # Docker Compose: db + redis + app
├── .env.example        # Template for environment variables
├── .gitignore          # Keeps .env and node_modules out of git
├── ai-version/         # AI Rematch quarantine folder
│   └── server.js
└── frontend/           # React + Vite glassmorphism UI
    └── src/
```

---

## 🤖 The AI Rematch (Stage 6 — A3)

I asked an AI to containerize the same task CRUD API onto Postgres with Docker Compose.

### The Prompt Used
> "Write a Node.js Express server that stores tasks in PostgreSQL using the `pg` driver. Include a `tasks` table with `id`, `title`, and `done` columns. Create the table if it doesn't exist and seed three example tasks only when the table is empty. Implement the five standard CRUD endpoints (GET /tasks, GET /tasks/:id, POST /tasks, PUT /tasks/:id, DELETE /tasks/:id). Use parameterized queries (`$1, $2`) for safety. Read the database password from a `.env` file — never hardcode it. Add a Dockerfile and compose.yaml with a volume for persistence and one-command startup."

### AI vs Me Analysis

| Criterion | My Version | AI Version |
|---|---|---|
| **Connection String** | Read from `DATABASE_URL` in `.env` with fallback | ❌ Hardcoded `postgres://postgres:dev@localhost:5432/tasks` |
| **Seed-Once Rule** | `SELECT COUNT(*)` — seeds only when count = 0 | ❌ Seeds when count < 3 — re-seeds after any delete |
| **Parameterized Queries** | ✅ `$1, $2` everywhere | ✅ Correct |
| **Docker Volume** | ✅ Named volume `taskdata` for persistence | ❌ No volume defined — data lost on `docker rm` |
| **Compose Healthcheck** | ✅ `pg_isready` + `depends_on: service_healthy` | ❌ No healthcheck — app may crash if DB isn't ready |
| **Connection Retries** | ✅ Retry loop with 10 attempts, 2s delay | ❌ No retry — crashes on first failed connection |
| **Redis** | ✅ PING on startup, integrated in compose | ❌ Not mentioned at all |
| **Boolean Coercion** | ✅ `Boolean(row.done)` | ❌ Returns raw `t`/`f` from Postgres |

### What My Prompt Missed
I forgot to specify:
- **Connection retry logic** — the AI assumed instant DB availability.
- **Boolean type coercion** — Postgres returns `t`/`f` for booleans, which needs conversion.
- **Redis integration** — not part of my original prompt.

### Improved Prompt (One Sentence)
> "Also include a retry loop for database connection, coerce Postgres boolean values to JSON `true`/`false`, add a Redis service to compose.yaml and PING it on startup, and define a named volume so data persists across container restarts."
