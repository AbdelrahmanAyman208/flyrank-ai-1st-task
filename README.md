# FlyRank TaskFlow: Full-Stack Task Management System (A3 Postgres + Docker)

A production-ready, full-stack CRUD application for managing tasks, secured with Supabase Authentication, running on PostgreSQL in Docker with single-command Docker Compose orchestration.

## 🚀 Architecture & Tech Stack

### Frontend (React + Vite)
- **Framework**: React.js with Vite
- **Styling**: Custom CSS with a Light Glassmorphism theme, vibrant gradients, and micro-animations.
- **Routing**: `react-router-dom` for client-side navigation (Login, Signup, Dashboard).
- **State Management**: React Context (`AuthContext`) for global authentication state.

### Backend (Node.js + Express)
- **Framework**: Express.js REST API.
- **Identity Provider**: Supabase Auth (utilizing Admin API for rate-limit bypass).
- **Security**: 
  - User accounts and token signing managed externally by Supabase.
  - API verifies JWTs locally via `supabase.auth.getUser()`.
  - Reusable Express middleware (`requireAuth`) protects private routes.
- **Documentation**: Swagger UI with interactive Bearer token authorization.

### Database Layer (PostgreSQL in Docker)
- **Engine**: PostgreSQL (`postgres:16-alpine` running inside Docker).
- **Database Driver**: `pg` (node-postgres) with connection pooling (`pg.Pool`).
- **Containerization**: `compose.yaml` orchestrates both the PostgreSQL database container and the Node.js API container.
- **Multi-Tenancy**: Every task is securely tied to a `user_id`. Users can *only* read, create, update, and delete their own tasks.
- **Data Persistence**: Named Docker volume (`taskdata`) persists database rows across container restarts.

---

## 🎨 Premium Glassmorphism UI
The frontend features:
- A bright, professional Light Glassmorphism theme.
- Dynamic floating mesh backgrounds and particle animations.
- Frosted glass cards (`backdrop-filter: blur(24px)`).
- Seamless routing between Login, Signup, and Dashboard screens.

---

## 🔒 Authentication Flow & Multi-Tenancy

1. **Sign up**: Client sends username, email, and password. Backend creates the user via Supabase.
2. **Log in**: Supabase authenticates credentials and returns a JWT access token.
3. **The Request**: React frontend automatically injects `Authorization: Bearer <token>` in all requests.
4. **Verification**: Express middleware verifies the token with Supabase.
5. **Data Isolation**: Backend injects `user.id` into PostgreSQL parameter queries (`$1, $2`), preventing cross-tenant data leaks.

---

## 🔌 API Endpoints & Auth Requirements

The API is fully documented via Swagger at `http://localhost:3000/docs`.

| Method | Path | Auth Required? | Description |
|---|---|---|---|
| **POST** | `/auth/signup` | No | Create a new user account |
| **POST** | `/auth/login` | No | Authenticate & return a JWT |
| **POST** | `/auth/logout` | **Yes** (Bearer) | End the user's session |
| **GET** | `/tasks` | **Yes** (Bearer) | Get all tasks belonging to the logged-in user |
| **POST** | `/tasks` | **Yes** (Bearer) | Create a new task tied to the user |
| **PUT** | `/tasks/:id` | **Yes** (Bearer) | Update a task (fails if user doesn't own it) |
| **DELETE**| `/tasks/:id` | **Yes** (Bearer) | Delete a task (fails if user doesn't own it) |
| **GET** | `/stats` | **Yes** (Bearer) | Get task statistics scoped to the user |

---

## 🐳 Quick Start (One Command Docker Setup)

### 1. Setup Environment
```bash
cp .env.example .env
```
Ensure your `.env` contains your Supabase keys and database configuration.

### 2. Start Full Stack with Docker Compose
```bash
docker compose up --build
```
This single command:
- Launches a PostgreSQL 16 container (`taskdb`) with port `5432` and persistent volume `taskdata`.
- Waits for Postgres healthcheck to pass.
- Builds and starts the Node.js API container (`taskapp`) on port `3000`.

### 3. Start Frontend (Local Dev)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to interact with TaskFlow!

---

## 🤖 The AI Rematch (Stage 7)

I asked an AI to build the identical secured API from a prompt, then diffed its output against my handcrafted version.

### The Prompt Used
> "Write a Node.js Express server that implements authentication using Supabase and stores tasks in PostgreSQL using Docker. Include auth routes, task CRUD routes, middleware, and Swagger UI."

### AI vs Me Analysis

1. **Token Extraction:** The AI successfully parsed the `Authorization` header and correctly split the `"Bearer "` prefix.
2. **Security Flaws:** 
   - The AI didn't configure `.env` validation out of the box.
   - It did not handle database connection retry loops when Postgres takes a few seconds to initialize in Docker.
3. **Improved Prompt:** "Ensure database connection retries on container boot, load credentials safely from .env, handle errors cleanly without crashing, and include Swagger annotations."
