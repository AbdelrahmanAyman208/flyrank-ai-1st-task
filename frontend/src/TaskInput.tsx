import { useState } from 'react';

interface TaskInputProps {
  onAdd: (title: string, deadline: string | null) => Promise<void>;
  disabled?: boolean;
}

export default function TaskInput({ onAdd, disabled }: TaskInputProps) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showDeadline, setShowDeadline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && !submitting && !disabled;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const value = title.trim();
    const deadlineValue = deadline || null;
    setSubmitting(true);
    try {
      await onAdd(value, deadlineValue);
      setTitle('');
      setDeadline('');
      setShowDeadline(false);
    } finally {
      setSubmitting(false);
    }
  }

  // Get today's date string for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <form className="task-input-form" onSubmit={handleSubmit}>
      <div className="task-input-wrapper">
        <input
          id="task-input-field"
          className="task-input"
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting || disabled}
          autoComplete="off"
          autoFocus
        />
        <button
          id="task-deadline-toggle"
          className={`task-deadline-toggle${showDeadline ? ' active' : ''}`}
          type="button"
          onClick={() => setShowDeadline(!showDeadline)}
          aria-label="Toggle deadline picker"
          title="Set a deadline"
          disabled={submitting || disabled}
        >
          📅
        </button>
        <button
          id="task-add-btn"
          className="task-input-btn"
          type="submit"
          disabled={!canSubmit}
          aria-label="Add task"
        >
          +
        </button>
      </div>
      {showDeadline && (
        <div className="task-deadline-row">
          <label htmlFor="task-deadline-input" className="task-deadline-label">
            Deadline
          </label>
          <input
            id="task-deadline-input"
            className="task-deadline-input"
            type="date"
            value={deadline}
            min={today}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={submitting || disabled}
          />
          {deadline && (
            <button
              type="button"
              className="task-deadline-clear"
              onClick={() => setDeadline('')}
              aria-label="Clear deadline"
              title="Clear deadline"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </form>
  );
}
