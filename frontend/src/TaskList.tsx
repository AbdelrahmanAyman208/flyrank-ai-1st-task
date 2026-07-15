import type { Task } from './api';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: number, done: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="task-list--empty" id="task-list-empty">
        <div className="empty-icon">📋</div>
        <p>No tasks yet — add one above!</p>
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;

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
          <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </ul>
    </>
  );
}
