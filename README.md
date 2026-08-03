# FlyRank TaskFlow: Full-Stack Task Management System (A4 Auth)

A production-ready, full-stack CRUD application for managing tasks, now secured with Supabase Authentication. This project demonstrates a secure REST API with JWT verification, protected routes, and a reusable auth middleware.

## 🚀 Architecture & Tech Stack

### Backend (Node.js + Express)
- **Framework**: Express.js REST API.
- **Identity Provider**: Supabase Auth
- **Security**: 
  - User accounts and token signing managed externally by Supabase.
  - API verifies JWTs locally via `supabase.auth.getUser()`.
  - Reusable Express middleware (`requireAuth`) protects private routes.
- **Documentation**: Swagger UI with interactive Bearer token authorization.

### Database Layer (SQLite via `sql.js`)
- **Engine**: `sql.js` (WebAssembly port of SQLite).
- **Data Access Layer**: All SQL operations are isolated in `db.js`.
- **Persistence**: Auto-sync mechanism flushes the in-memory SQLite buffer to `tasks.db` on disk.

---

## 🔒 Authentication Flow (The Trust Triangle)

1. **Sign up / Log in**: The client sends credentials (`email` + `password`) to Supabase.
2. **The token**: Supabase checks the credentials and returns a JSON Web Token (JWT).
3. **The request**: The client calls the backend API, attaching the JWT in an `Authorization: Bearer <token>` header.
4. **Verification**: The Express middleware asks Supabase "is this token real?". If yes, the protected route executes.

---

## 🔌 API Endpoints & Auth Requirements

The API is fully documented via Swagger at `http://localhost:3000/docs`.

| Method | Path | Auth Required? | Description | Status Codes |
|---|---|---|---|---|
| **POST** | `/auth/signup` | No | Create a new user account | 201 Created / 400 Bad Request |
| **POST** | `/auth/login` | No | Authenticate & return a JWT | 200 OK / 401 Unauthorized / 429 Too Many Requests |
| **POST** | `/auth/logout` | **Yes** (Bearer) | End the user's session | 204 No Content / 401 Unauthorized |
| **POST** | `/auth/refresh` | No | Get new access token | 200 OK / 401 Unauthorized |
| **GET** | `/public/info` | No | Read public data | 200 OK |
| **GET** | `/protected/profile` | **Yes** (Bearer) | Read private profile data | 200 OK / 401 Unauthorized |
| **GET** | `/protected/dashboard`| **Yes** (Bearer) | Dashboard data (proves middleware reuse) | 200 OK / 401 Unauthorized |
| **GET** | `/admin/users` | **Yes** (Bearer + Role) | Admin only route (Stretch Goal) | 200 OK / 401 Unauthorized / 403 Forbidden |

### Stretch Goals Implemented

1. **401 vs 403 (Authorization)**: The `GET /admin/users` endpoint demonstrates the difference. `401 Unauthorized` means "I don't know you" (missing or bad token). `403 Forbidden` means "I know exactly who you are, and you still may not enter" (valid token, but user is not an admin).
2. **Refresh Tokens**: The `POST /auth/refresh` endpoint exchanges a long-lived refresh token for a new access token. Access tokens are short-lived to limit the window of vulnerability if stolen.
3. **Rate Limiting**: `POST /auth/login` is protected against brute-force attacks via `express-rate-limit` (max 5 attempts per 15 mins).

---

## 💻 Quick Start

### 1. Setup Environment
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Supabase credentials
```
> **Note**: Your `.env` file is git-ignored and will never be committed to GitHub.

### 2. Start the Backend
```bash
npm install
npm start
```
*The API will start on port 3000.*

### 3. Try it in Swagger
1. Open `http://localhost:3000/docs`
2. Run `POST /auth/signup` to create an account
3. Run `POST /auth/login` and copy the `access_token`
4. Click the **Authorize** button (padlock icon) at the top of the page and paste the token
5. Run `GET /protected/profile` directly from the browser

*(Insert Swagger Screenshot Here)*

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
