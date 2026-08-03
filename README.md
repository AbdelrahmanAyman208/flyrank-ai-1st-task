# FlyRank TaskFlow: Full-Stack Task Management System

A production-ready, full-stack CRUD application for managing tasks, secured with Supabase Authentication. This project demonstrates a secure REST API with JWT verification, a beautiful React frontend with a premium Glassmorphism design, and strict multi-tenant data isolation.

## 🚀 Architecture & Tech Stack

### Frontend (React + Vite)
- **Framework**: React.js with Vite
- **Styling**: Custom CSS with a stunning Light Glassmorphism theme, vibrant gradients, and micro-animations.
- **Routing**: `react-router-dom` for client-side navigation (Login, Signup, Dashboard).
- **State Management**: React Context (`AuthContext`) for global authentication state.

### Backend (Node.js + Express)
- **Framework**: Express.js REST API.
- **Identity Provider**: Supabase Auth (utilizing the Admin API for rate-limit bypass during local dev).
- **Security**: 
  - User accounts and token signing managed externally by Supabase.
  - API verifies JWTs locally via `supabase.auth.getUser()`.
  - Reusable Express middleware (`requireAuth`) protects private routes.
- **Documentation**: Swagger UI with interactive Bearer token authorization.

### Database Layer (SQLite via `sql.js`)
- **Engine**: `sql.js` (WebAssembly port of SQLite).
- **Multi-Tenancy**: Every task is securely tied to a `user_id`. Users can *only* read, create, update, and delete their own tasks.
- **Data Access Layer**: All SQL operations are isolated in `db.js`.
- **Persistence**: Auto-sync mechanism flushes the in-memory SQLite buffer to `tasks.db` on disk.

---

## 🎨 Premium Glassmorphism UI
The frontend was completely redesigned from scratch to feature:
- A bright, professional Light Glassmorphism theme.
- Dynamic floating mesh backgrounds and particle animations.
- Frosted glass cards (`backdrop-filter: blur(24px)`).
- Seamless routing between beautiful Login, Signup, and Dashboard screens.

---

## 🔒 Authentication Flow & Multi-Tenancy

1. **Sign up**: The client sends a username, email, and password. The backend uses the Supabase Admin API to instantly create and verify the account (bypassing email rate limits).
2. **Log in**: Supabase checks the credentials and returns a JSON Web Token (JWT).
3. **The Request**: The React frontend automatically intercepts API calls and attaches the JWT in an `Authorization: Bearer <token>` header.
4. **Verification**: The Express middleware verifies the token. 
5. **Data Isolation**: The backend extracts the `user.id` from the verified token and injects it into every SQL query, guaranteeing users never see each other's tasks.

---

## 🔌 API Endpoints & Auth Requirements

The API is fully documented via Swagger at `http://localhost:3000/docs`.

| Method | Path | Auth Required? | Description |
|---|---|---|---|
| **POST** | `/auth/signup` | No | Create a new user account (Requires username, email, password) |
| **POST** | `/auth/login` | No | Authenticate & return a JWT |
| **POST** | `/auth/logout` | **Yes** (Bearer) | End the user's session |
| **GET** | `/tasks` | **Yes** (Bearer) | Get all tasks belonging to the logged-in user |
| **POST** | `/tasks` | **Yes** (Bearer) | Create a new task tied to the user |
| **PUT** | `/tasks/:id` | **Yes** (Bearer) | Update a task (fails if user doesn't own it) |
| **DELETE**| `/tasks/:id` | **Yes** (Bearer) | Delete a task (fails if user doesn't own it) |
| **GET** | `/stats` | **Yes** (Bearer) | Get task statistics scoped to the user |

---

## 💻 Quick Start

### 1. Setup Environment
```bash
# Copy the example env file
cp .env.example .env
```
Edit `.env` and add your Supabase credentials, including the `SUPABASE_SERVICE_KEY` for local development.

### 2. Start the Backend
```bash
npm install
npm start
```
*The API will start on port 3000.*

### 3. Start the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The React app will start on port 5173.*

### 4. Experience TaskFlow
1. Open `http://localhost:5173` in your browser.
2. You will be redirected to the **Signup** page. Create an account.
3. You will be automatically redirected to the **Login** page. Log in.
4. Enjoy the beautiful Dashboard and create some tasks!

---

## 🤖 The AI Rematch (Stage 7)

I asked an AI to build the identical secured API from a prompt, then diffed its output against my handcrafted version.

### The Prompt Used
> "Write a Node.js Express server that implements authentication using Supabase. Include the following 5 routes: 
> 1. POST /auth/signup (returns 201 or 400)
> 2. POST /auth/login (returns 200 or 401, provides a JWT access token)
> 3. POST /auth/logout (protected route, returns 204)
> 4. GET /public/info (open route, returns 200)
> 5. GET /protected/profile (protected route, returns 200). 
> For the protected routes, extract the bearer token from the Authorization header and verify it using supabase.auth.getUser(token). Write a reusable middleware for this verification."

### AI vs Me Analysis

1. **Token Extraction:** The AI successfully parsed the `Authorization` header and correctly split the `"Bearer "` prefix. It correctly returned a 401 if the header was missing entirely.
2. **Security Flaws:** 
   - The AI didn't configure `.env` handling out of the box, hardcoding the Supabase keys or relying on undefined process env vars without validation. 
   - It did not check `if (error)` comprehensively when calling `supabase.auth.getUser()`, meaning if Supabase returned a generic error, the API might crash instead of cleanly returning a 401.
3. **Missing Context:** I forgot to specify that the Swagger UI bearer authorization configuration (`securitySchemes`) needed to be included, so the AI completely omitted the documentation generation.
4. **Improved Prompt (One Sentence):** "Ensure the Supabase client loads credentials safely from a .env file, handle all Supabase network errors cleanly without crashing, and include Swagger JS-Doc annotations with a BearerAuth security scheme."
