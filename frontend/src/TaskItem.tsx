import { useState } from 'react';
import type { Task } from './api';

interface TaskItemProps {
  task: Task;
  onToggle: (id: number, done: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/**
 * Returns a human-readable label and a CSS modifier class for the deadline.
 */
function getDeadlineInfo(deadline: string | null, done: boolean) {
  if (!deadline || done) return null;

  const now = new Date();
  // Strip time for day-level comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDate = new Date(deadline + 'T00:00:00');
  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      label: absDays === 1 ? '1 day overdue' : `${absDays} days overdue`,
      className: 'overdue',
    };
  }
  if (diffDays === 0) {
    return { label: 'Due today', className: 'due-today' };
  }
  if (diffDays === 1) {
    return { label: 'Due tomorrow', className: 'due-soon' };
  }
  if (diffDays <= 3) {
    return { label: `Due in ${diffDays} days`, className: 'due-soon' };
  }

  // Format the date nicely
  const formatted = deadlineDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return { label: `Due ${formatted}`, className: 'due-later' };
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const [removing, setRemoving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const deadlineInfo = getDeadlineInfo(task.deadline, task.done);

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggle(task.id, !task.done);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (removing) return;
    setRemoving(true);
    // Wait for the CSS animation before actually removing
    setTimeout(async () => {
      try {
        await onDelete(task.id);
      } catch {
        setRemoving(false);
      }
    }, 280);
  }

  return (
    <li
      className={`task-item${task.done ? ' done' : ''}${removing ? ' removing' : ''}`}
      id={`task-item-${task.id}`}
    >
      <div
        className={`task-checkbox${task.done ? ' checked' : ''}`}
        role="checkbox"
        aria-checked={task.done}
        aria-label={`Mark "${task.title}" as ${task.done ? 'not done' : 'done'}`}
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        style={{ opacity: toggling ? 0.5 : 1 }}
      />
      <div className="task-content">
        <span className="task-title">{task.title}</span>
        {task.deadline && (
          <span className={`task-deadline-badge ${deadlineInfo?.className ?? ''}`}>
            <span className="task-deadline-badge__icon">⏰</span>
            {deadlineInfo ? deadlineInfo.label : task.deadline}
          </span>
        )}
      </div>
      <button
        className="task-delete"
        onClick={handleDelete}
        aria-label={`Delete "${task.title}"`}
        disabled={removing}
      >
        ✕
      </button>
    </li>
  );
}
