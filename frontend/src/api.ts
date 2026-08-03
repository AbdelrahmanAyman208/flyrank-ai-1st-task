/* ───────────────────────────────────────────────────────
   api.ts — Typed API client for the Task backend
   ─────────────────────────────────────────────────────── */

export interface Task {
  id: number;
  title: string;
  done: boolean;
  deadline: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Stats {
  total: number;
  completed: number;
  pending: number;
}

const BASE = ''; // Vite proxy handles /tasks → localhost:3000

// We need a way to get the token for protected routes
export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export async function fetchTasks(params?: { search?: string; done?: string; sort?: string }): Promise<Task[]> {
  const url = new URL(`${BASE}/tasks`, window.location.origin);
  if (params?.search) url.searchParams.set('search', params.search);
  if (params?.done && params.done !== 'all') url.searchParams.set('done', params.done);
  if (params?.sort) url.searchParams.set('sort', params.sort);

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
  });
  return handleResponse<Task[]>(res);
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${BASE}/stats`, {
    headers: getHeaders(),
  });
  return handleResponse<Stats>(res);
}

export async function createTask(title: string, deadline: string | null = null): Promise<Task> {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, deadline }),
  });
  return handleResponse<Task>(res);
}

export async function updateTask(
  id: number,
  fields: { title?: string; done?: boolean; deadline?: string | null },
): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(fields),
  });
  return handleResponse<Task>(res);
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${id}`, { 
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse<void>(res);
}

// --- Auth Endpoints ---

export async function loginUser(email: string, password: string): Promise<any> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<any>(res);
}

export async function signupUser(username: string, email: string, password: string): Promise<any> {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return handleResponse<any>(res);
}

export async function logoutUser(): Promise<void> {
  const res = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse<void>(res);
}
