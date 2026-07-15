/* ───────────────────────────────────────────────────────
   api.ts — Typed API client for the Task backend
   ─────────────────────────────────────────────────────── */

export interface Task {
  id: number;
  title: string;
  done: boolean;
  deadline: string | null;
}

const BASE = ''; // Vite proxy handles /tasks → localhost:3000

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${BASE}/tasks`);
  return handleResponse<Task[]>(res);
}

export async function createTask(title: string, deadline: string | null = null): Promise<Task> {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return handleResponse<Task>(res);
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' });
  return handleResponse<void>(res);
}
