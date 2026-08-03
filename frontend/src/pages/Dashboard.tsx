import { useCallback, useEffect, useState } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask, fetchStats, logoutUser } from '../api';
import type { Task, Stats } from '../api';
import TaskInput from '../TaskInput';
import TaskList from '../TaskList';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, true, false
  const [sortOrder, setSortOrder] = useState(''); // '', 'title'
  
  const { logout, username } = useAuth();
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  /* ── Load tasks and stats on mount & filter changes ── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [tasksData, statsData] = await Promise.all([
          fetchTasks({ search: debouncedSearch, done: statusFilter, sort: sortOrder }),
          fetchStats()
        ]);
        if (!cancelled) {
          setTasks(tasksData);
          setStats(statsData);
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
  }, [debouncedSearch, statusFilter, sortOrder]);

  /* ── Handlers ── */
  const reloadData = useCallback(async () => {
    try {
      const [tasksData, statsData] = await Promise.all([
        fetchTasks({ search: debouncedSearch, done: statusFilter, sort: sortOrder }),
        fetchStats()
      ]);
      setTasks(tasksData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
  }, [debouncedSearch, statusFilter, sortOrder]);

  const handleAdd = useCallback(async (title: string, deadline: string | null) => {
    try {
      await createTask(title, deadline);
      await reloadData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err; // Re-throw so TaskInput knows submission failed
    }
  }, [reloadData]);

  const handleToggle = useCallback(async (id: number, done: boolean) => {
    try {
      await updateTask(id, { done });
      await reloadData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [reloadData]);

  const handleEdit = useCallback(async (id: number, title: string, deadline: string | null) => {
    try {
      await updateTask(id, { title, deadline });
      await reloadData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit task');
      throw err;
    }
  }, [reloadData]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteTask(id);
      await reloadData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err; // Re-throw so TaskItem can revert the removing state
    }
  }, [reloadData]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error("Logout request failed", e);
    } finally {
      logout(); // clear token locally
      navigate('/login');
    }
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '560px', margin: '0 auto' }}>
          <div>
            <h1 className="app-header__logo" style={{ textAlign: 'left', marginBottom: '2px' }}>TaskFlow</h1>
            <p className="app-header__subtitle" style={{ textAlign: 'left' }}>Welcome back, {username || 'User'} 👋</p>
          </div>
          <button onClick={handleLogout} className="task-save-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            Logout
          </button>
        </div>
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

        {/* Filter Bar */}
        <div className="filter-bar">
          <input
            type="text"
            className="filter-search"
            placeholder="Search tasks..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="filter-selects">
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="false">Pending</option>
              <option value="true">Completed</option>
            </select>
            <select 
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="">Sort by Added</option>
              <option value="title">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider" />

        {/* List */}
        {loading && tasks.length === 0 ? (
          <div className="loading-container" id="loading-indicator">
            <div className="loading-spinner" />
            <span className="loading-text">Loading tasks…</span>
          </div>
        ) : (
          <TaskList tasks={tasks} stats={stats} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        TaskFlow &middot; Powered by Task API
      </footer>
    </>
  );
}
