import { useCallback, useEffect, useState } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask } from './api';
import type { Task } from './api';
import TaskInput from './TaskInput';
import TaskList from './TaskList';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Load tasks on mount ── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchTasks();
        if (!cancelled) {
          setTasks(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tasks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Handlers ── */
  const handleAdd = useCallback(async (title: string, deadline: string | null) => {
    try {
      const newTask = await createTask(title, deadline);
      setTasks((prev) => [...prev, newTask]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err; // Re-throw so TaskInput knows submission failed
    }
  }, []);

  const handleToggle = useCallback(async (id: number, done: boolean) => {
    try {
      const updated = await updateTask(id, { done });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err; // Re-throw so TaskItem can revert the removing state
    }
  }, []);

  return (
    <>
      {/* Animated Background Particles */}
      <div className="particles-container">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      {/* Header */}
      <header className="app-header">
        <h1 className="app-header__logo">TaskFlow</h1>
        <p className="app-header__subtitle">Your tasks, beautifully organized</p>
      </header>

      {/* Hero Illustrations (Left and Right) */}
      <div className="hero-image-left floating-anim">
        <img src="/hero.png" alt="TaskFlow decoration left" />
      </div>
      <div className="hero-image-right floating-anim-delayed">
        <img src="/hero.png" alt="TaskFlow decoration right" />
      </div>

      {/* Main Card */}
      <main className="glass-card">
        {/* Error banner */}
        {error && (
          <div className="error-banner" role="alert" id="error-banner">
            <span className="error-banner__icon">⚠</span>
            <span className="error-banner__text">{error}</span>
            <button
              className="error-banner__dismiss"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input */}
        <TaskInput onAdd={handleAdd} disabled={loading} />

        {/* Divider */}
        <div className="section-divider" />

        {/* List */}
        {loading ? (
          <div className="loading-container" id="loading-indicator">
            <div className="loading-spinner" />
            <span className="loading-text">Loading tasks…</span>
          </div>
        ) : (
          <TaskList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        TaskFlow &middot; Powered by Task API
      </footer>
    </>
  );
}
