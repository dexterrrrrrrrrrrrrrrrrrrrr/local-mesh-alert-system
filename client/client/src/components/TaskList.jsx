import { useMemo, useState } from 'react';

const STAFF_OPTIONS = [
  { id: 'staff1', label: 'Staff 1' },
  { id: 'staff2', label: 'Staff 2' },
  { id: 'staff3', label: 'Staff 3' }
];

const PRIORITIES = ['low', 'medium', 'high'];

const TaskList = ({
  portal,
  staffId,
  onPortalChange,
  onStaffChange,
  tasks = [],
  isOnline,
  notifications = [],
  onUpsertTask
}) => {
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    assignees: []
  });

  const managerViewTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    [tasks]
  );

  const staffTasks = useMemo(
    () => managerViewTasks.filter((task) => task.assignees?.includes(staffId)),
    [managerViewTasks, staffId]
  );

  const taskCounts = useMemo(() => ({
    pending: tasks.filter((t) => Object.values(t.statusByStaff || {}).includes('pending')).length,
    inProgress: tasks.filter((t) => Object.values(t.statusByStaff || {}).includes('in_progress')).length,
    completed: tasks.filter((t) => Object.values(t.statusByStaff || {}).every((s) => s === 'completed')).length
  }), [tasks]);

  const createTask = () => {
    if (!taskForm.title.trim() || taskForm.assignees.length === 0) return;

    const now = new Date().toISOString();
    const statusByStaff = taskForm.assignees.reduce((acc, assignee) => {
      acc[assignee] = 'pending';
      return acc;
    }, {});

    onUpsertTask({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      deadline: taskForm.deadline || null,
      assignees: taskForm.assignees,
      statusByStaff,
      createdAt: now,
      updatedAt: now
    });

    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      deadline: '',
      assignees: []
    });
  };

  const updateStaffStatus = (task, nextStatus) => {
    onUpsertTask({
      ...task,
      statusByStaff: {
        ...task.statusByStaff,
        [staffId]: nextStatus
      },
      updatedAt: new Date().toISOString()
    });
  };

  const toggleAssignee = (id) => {
    setTaskForm((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(id)
        ? prev.assignees.filter((s) => s !== id)
        : [...prev.assignees, id]
    }));
  };

  const renderTaskCard = (task, viewer = 'manager') => (
    <div key={task.id} className={`task-card ${task.priority}`}>
      <div className="task-text">{task.title}</div>
      <div className="task-meta">Priority: {task.priority.toUpperCase()}</div>
      {task.description && <div className="task-meta">{task.description}</div>}
      <div className="task-meta">Deadline: {task.deadline ? new Date(task.deadline).toLocaleString() : 'Not set'}</div>
      <div className="task-meta">
        Assignees: {task.assignees.map((id) => STAFF_OPTIONS.find((s) => s.id === id)?.label).join(', ')}
      </div>

      <div className="task-status-list">
        {task.assignees.map((id) => (
          <div key={`${task.id}-${id}`} className="task-status-row">
            <span>{STAFF_OPTIONS.find((s) => s.id === id)?.label}</span>
            <strong>{(task.statusByStaff?.[id] || 'pending').replace('_', ' ').toUpperCase()}</strong>
          </div>
        ))}
      </div>

      {viewer === 'staff' && (
        <div className="assign-buttons">
          {(task.statusByStaff?.[staffId] || 'pending') === 'pending' && (
            <button className="assign-btn" onClick={() => updateStaffStatus(task, 'in_progress')}>Accept Task</button>
          )}
          {(task.statusByStaff?.[staffId] || 'pending') === 'in_progress' && (
            <button className="assign-btn" onClick={() => updateStaffStatus(task, 'completed')}>Complete Task</button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="task-section">
      <h3>📋 Multi-Role Task Portals</h3>

      <div className="role-selector">
        <label>Portal</label>
        <select value={portal} onChange={(e) => onPortalChange(e.target.value)}>
          <option value="manager">Manager Portal</option>
          <option value="staff">Staff Portal</option>
          <option value="guest">Guest Portal</option>
        </select>
        {portal === 'staff' && (
          <>
            <label>Staff Member</label>
            <select value={staffId} onChange={(e) => onStaffChange(e.target.value)}>
              {STAFF_OPTIONS.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.label}</option>
              ))}
            </select>
          </>
        )}
        <div className="task-meta">Sync: {isOnline ? 'Online (real-time)' : 'Offline (queued)'}</div>
      </div>

      {portal === 'manager' && (
        <>
          <div className="task-input task-form-grid">
            <input
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Task title"
            />
            <input
              value={taskForm.description}
              onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Task description"
            />
            <select
              value={taskForm.priority}
              onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
            <input
              type="datetime-local"
              value={taskForm.deadline}
              onChange={(e) => setTaskForm((p) => ({ ...p, deadline: e.target.value }))}
            />
            <div className="assignee-selector">
              {STAFF_OPTIONS.map((staff) => (
                <label key={staff.id}>
                  <input
                    type="checkbox"
                    checked={taskForm.assignees.includes(staff.id)}
                    onChange={() => toggleAssignee(staff.id)}
                  />
                  {staff.label}
                </label>
              ))}
            </div>
            <button onClick={createTask}>Create Task</button>
          </div>

          {notifications.length > 0 && (
            <div className="task-notifications">
              <h4>Completion Notifications</h4>
              {notifications.slice(0, 5).map((item) => (
                <div key={item.id} className="task-meta">✅ {item.text}</div>
              ))}
            </div>
          )}

          <div className="tasks-grid">
            {managerViewTasks.map((task) => renderTaskCard(task, 'manager'))}
          </div>
        </>
      )}

      {portal === 'staff' && (
        <div className="tasks-grid">
          {staffTasks.length === 0
            ? <div className="task-card"><div className="task-meta">No tasks assigned.</div></div>
            : staffTasks.map((task) => renderTaskCard(task, 'staff'))}
        </div>
      )}

      {portal === 'guest' && (
        <div className="task-notifications">
          <h4>Guest Dashboard (View Only)</h4>
          <div className="task-meta">Pending: {taskCounts.pending}</div>
          <div className="task-meta">In Progress: {taskCounts.inProgress}</div>
          <div className="task-meta">Completed: {taskCounts.completed}</div>
          <div className="tasks-grid">
            {managerViewTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-text">{task.title}</div>
                <div className="task-meta">Priority: {task.priority.toUpperCase()}</div>
                <div className="task-meta">
                  Status: {Object.values(task.statusByStaff || {}).join(', ').replaceAll('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;

