import { useEffect, useRef } from 'react';

const AlertList = ({ alerts }) => {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && alerts.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [alerts]);

  if (alerts.length === 0) {
    return (
      <div className="no-alerts">
        <p>🟢 No alerts - Mesh ready</p>
        <p>Press SOS to test mesh relay</p>
      </div>
    );
  }

  return (
    <div className="alert-list" ref={listRef}>
      {alerts.map((alert) => (
        <div key={alert.id} className="alert-card">
          <div className="alert-header">
            <span className="alert-type">{alert.type}</span>

<span className="alert-time">{alert.time ? new Date(alert.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}</span>


          </div>
          <div className="alert-location">📍 {alert.location}</div>
          {alert.ttl && <div className="alert-ttl">TTL: {alert.ttl}</div>}
        </div>
      ))}
    </div>
  );
};

export default AlertList;

