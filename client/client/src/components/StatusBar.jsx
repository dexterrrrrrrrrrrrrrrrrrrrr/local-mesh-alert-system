import { useState, useEffect } from 'react';

const StatusBar = ({ btStatus, connectedDevices, alerts, messages, connectMode, onToggleConnect, isOnline = navigator.onLine }) => {
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

  const netStatus = isOnline ? '🌐' : '📴 Offline';

  return (
    <div className="status-bar">
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
        {netStatus}
        {isOnline ? null : <span className="queued-badge" title="Queued messages/SOS">(Q)</span>}
      </div>
      <div className="status-item">
{connectMode ? '🔗 Connect ON' : '🔌 Connect OFF'}
        {connectMode && (
          <button 
            onClick={onToggleConnect} 
            className="connect-off-btn"
            title="Disable Connect"
          >
            OFF
          </button>
        )}
      </div>
      {!connectMode && (
        <div className="status-item">
          <button 
            onClick={onToggleConnect} 
            className="connect-toggle-btn"
            title="Enable Connect Mode"
          >
            🔗 Connect
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusBar;

