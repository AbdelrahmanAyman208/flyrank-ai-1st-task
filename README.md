# Task API

Minimal CRUD REST API for managing a to-do list — Node.js + Express, in-memory storage.

## Quick Start

```bash
npm install
npm start
```

The server starts on **http://localhost:3000**.  
Swagger UI is available at **http://localhost:3000/docs**, generated dynamically from JSDoc comments via `swagger-jsdoc`.

![Swagger UI Screenshot](./swagger-screenshot.png)

## Endpoints

| Method | Path          | Status | Description                    |
|--------|---------------|--------|--------------------------------|
| GET    | `/`           | 200    | API info (name, version)       |
| GET    | `/health`     | 200    | Health check                   |
| GET    | `/tasks`      | 200    | List all tasks (supports pagination) |
| GET    | `/tasks/:id`  | 200    | Get one task (404 if missing)  |
| POST   | `/tasks`      | 201    | Create a task from JSON body   |
| PUT    | `/tasks/:id`  | 200    | Update title and/or done       |
| DELETE | `/tasks/:id`  | 204    | Delete a task (404 if missing) |

### Pagination on `GET /tasks`

The `GET /tasks` endpoint supports pagination via query parameters:
- `limit`: The maximum number of items to return.
- `offset`: The number of items to skip before returning the result.

Example: `GET /tasks?limit=2&offset=2`

**Why paginate?** Real APIs never return "everything". Unbounded list endpoints can cause severe performance bottlenecks, excessive memory usage on both the server and client, high bandwidth costs, and can be exploited as vectors for Denial-of-Service (DoS) attacks.

## Example Requests

```bash
# List tasks with pagination
curl "http://localhost:3000/tasks?limit=2&offset=0"

# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Express"}'

# Update a task
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Delete a task
curl -X DELETE http://localhost:3000/tasks/1
```

---

## AI vs Me (Stage 7)

I simulated hiring the fastest junior developer on earth by prompting an AI to build the exact same API.

**My Prompt:**
> Write a small CRUD REST API for managing a to-do list using Node.js and Express. Use in-memory storage (a JavaScript array) initialized with 3 sample tasks. Each task has: id (number), title (string), done (boolean).
> Provide these endpoints:
> 1. GET / - returns { name: 'Task API', version: '1.0', endpoints: ['/tasks'] }
> 2. GET /health - returns { status: 'ok' }
> 3. GET /tasks - returns the full list of tasks
> 4. GET /tasks/:id - returns a single task or 404 with JSON { error: 'Task <id> not found' }
> 5. POST /tasks - creates a task from { title: '...' }. Set done: false and assign the next available id. Return 201. If title is missing or empty, return 400 with a JSON error.
> 6. PUT /tasks/:id - updates title or done. Return 400 if body is invalid/empty, 404 if not found.
> 7. DELETE /tasks/:id - removes the task and returns 204. Return 404 if not found.
> Also, add Swagger UI at /docs using swagger-ui-express, and serve a hand-written openapi.json. The server should listen on port 3000.

### Comparison

1. **What did the AI do better?**
   The AI's code is very concise and readable. It correctly implemented the boilerplate for Express and `swagger-ui-express` without over-engineering it. I easily understood its logic because it's a very standard Express approach.

2. **What did it get wrong or quietly ignore?**
   - It ignored the `endpoints: ['/tasks']` requirement in `GET /`, returning only `{ name, version }`.
   - In `PUT /tasks/:id`, it completely forgot to return a `400` error if the request body was empty or didn't contain valid fields, quietly passing a `200` with no changes instead.
   - For `GET /tasks/:id`, it used `parseInt(req.params.id)` without specifying the radix (base 10), which is a common minor anti-pattern in JS.

3. **What did my prompt forget to specify?**
   I forgot to explicitly specify that `id` matching must be strictly numeric, so the AI decided to rely on basic equality which could be buggy if types mismatched. I also forgot to tell it *how* to validate the PUT body, so it just didn't.

### One Rematch

I updated my prompt to be much more defensive based on the AI's mistakes:
> "... 6. PUT /tasks/:id - updates title or done. **CRITICAL: Return 400 if BOTH title and done are missing in the request body.** Return 404 if not found... Ensure all `parseInt` calls use radix 10."

**What changed:** The AI successfully added the validation block for the `PUT` endpoint and corrected its `parseInt` calls, proving that the output is only as good as the specification!
