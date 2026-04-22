import { useState, useEffect } from 'react';

const StatusBar = ({ btStatus, connectedDevices, alerts, messages, mockMode, onToggleMock }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'scanning': return '🔍';
      case 'disconnected': return '🔴';
      case 'unsupported': return '❌';
      default: return '⚪';
    }
  };

  const battery = navigator.getBattery?.()?.level * 100 || 'N/A';

  return (
    <div className="status-bar">
      <div className="status-item">
        {getStatusIcon(btStatus)} BT: {btStatus}
      </div>
      <div className={`status-item ${messages && messages.length > 0 ? 'has-messages' : ''}`}>

        Mesh: {connectedDevices.length} peers 
        <span style={{color: connectedDevices.length > 0 ? '#00ff88' : '#ff6b6b', fontWeight: 'bold'}}>•</span>
        {messages && messages.length > 0 && (
          <span className="badge">💬{messages.length}</span>
        )}

      </div>
      <div className="status-item">
        🚨 {alerts.length}
      </div>
      <div className="status-item">
        🔋 {Math.round(battery)}%
      </div>
      <div className="status-item">
        {mockMode ? '🧪 Mock ON' : '📱 Live'}
        {mockMode && (
          <button 
            onClick={onToggleMock} 
            className="mock-off-btn"
            title="Disable Mock"
          >
            OFF
          </button>
        )}
      </div>
      {!mockMode && (
        <div className="status-item">
          <button 
            onClick={onToggleMock} 
            className="mock-toggle-btn"
            title="Enable Mock Mode"
          >
            🧪 Mock
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusBar;

