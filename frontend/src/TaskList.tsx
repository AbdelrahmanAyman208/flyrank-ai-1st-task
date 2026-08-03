import type { Task, Stats } from './api';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  stats?: Stats | null;
  onToggle: (id: number, done: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string, deadline: string | null) => Promise<void>;
}

export default function TaskList({ tasks, stats, onToggle, onDelete, onEdit }: TaskListProps) {
  if (tasks.length === 0 && (!stats || stats.total === 0)) {
    return (
      <div className="task-list--empty" id="task-list-empty">
        <div className="empty-icon">📋</div>
        <p>No tasks yet — add one above!</p>
      </div>
    );
  }

  if (tasks.length === 0 && stats && stats.total > 0) {
    return (
      <div className="task-list--empty" id="task-list-empty">
        <div className="empty-icon">🔍</div>
        <p>No tasks match your current filters.</p>
      </div>
    );
  }

  const doneCount = stats ? stats.completed : tasks.filter((t) => t.done).length;
  const totalCount = stats ? stats.total : tasks.length;

  return (
    <>
      <div className="task-stats">
        <span>
          {doneCount} of {totalCount} completed
        </span>
        <span className="task-stats__count">{totalCount} task{totalCount !== 1 ? 's' : ''}</span>
      </div>
      <ul className="task-list" id="task-list">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </ul>
    </>
  );
}
