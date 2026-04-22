import { useState, useEffect } from 'react';

const ROLES = {
  MANAGER: ' Manager',
  RELAY: ' Relay',
  MONITOR: ' Monitor',
  EMERGENCY: ' Emergency'
};

const DEFAULT_TASKS = [
  'Evacuate floor 3',
  'Check room 101',
  'Secure east exit',
  'Assist injured',
  'Report status'
];


const TaskList = ({ myRole, connectedDevices, tasks = DEFAULT_TASKS, onAssignTask, onChangeRole, onAddTask }) => {

  const [newTask, setNewTask] = useState('');


  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: Date.now().toString(),
        text: newTask.trim(),
        assignedTo: null,
        status: 'pending',
        time: new Date().toLocaleString()
      };
      onAddTask(task);
      setNewTask('');
    }
  };



  const assignToDevice = (taskId, deviceId) => {
    const updated = tasks.map(task => 
      task.id === taskId ? { ...task, assignedTo: deviceId, status: 'assigned' } : task
    );
    onAssignTask(updated.find(t => t.id === taskId));
  };


  return (
    <div className="task-section">
      <h3>📋 Coordination Tasks ({tasks.length})</h3>
      
      {myRole === ROLES.MANAGER && (
        <div className="task-input">
          <input 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="New task (Manager only)"
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
          />
          <button onClick={addTask}>➕</button>
        </div>
      )}

      <div className="tasks-grid">
        {tasks.map(task => (
          <div key={task.id} className={`task-card ${task.status}`}>
            <div className="task-text">{task.text}</div>
            <div className="task-time">{task.time}</div>
            <div className="task-status">

Status: {task.status?.toUpperCase() || 'PENDING'}




              {task.assignedTo && (
                <span className="assigned"> → {connectedDevices.find(d => d.id === task.assignedTo)?.name}</span>
              )}
            </div>
            {myRole === ROLES.MANAGER && !task.assignedTo && (
              <div className="assign-buttons">
                {connectedDevices.map(device => (
                  <button 
                    key={device.id}
                    onClick={() => assignToDevice(task.id, device.id)}
                    className="assign-btn"
                  >
                    Assign {device.name.slice(0, 8)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="role-selector">
        <h4>My Role: {myRole}</h4>
        {onChangeRole && (
          <select onChange={(e) => onChangeRole(e.target.value)} value={myRole}>
            {Object.values(ROLES).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default TaskList;

