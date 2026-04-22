import { useEffect, useRef } from 'react';

const MessageList = ({ messages, connectedDevices, currentUserId = 'me' }) => {
  const listRef = useRef(null);

  // Resolve device name by ID
  const getPeerName = (deviceId) => {
    const device = connectedDevices.find(d => d.id === deviceId);
    return device ? device.name : 'Unknown';
  };

  // Generate avatar color based on ID
  const getAvatarColor = (deviceId) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
    let hash = 0;
    for (let i = 0; i < deviceId.length; i++) {
      hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };


  useEffect(() => {
    if (listRef.current) {
      const scrollHeight = listRef.current.scrollHeight;
      listRef.current.scrollTop = scrollHeight;
    }
  }, [messages]);


  if (messages.length === 0) {
    return (
      <div className="no-messages">
        <div className="empty-chat">
          💬 No messages yet
        </div>
        <p>Send a message to start chatting via mesh!</p>
      </div>
    );
  }


  return (
    <div className="message-list" ref={listRef} style={{display: 'flex', flexDirection: 'column-reverse'}}>
      {messages.map((msg) => (
        <div key={msg.id} className={`message-row ${msg.from === currentUserId ? 'sent' : 'received'}`}>


            <div className={`message-bubble ${msg.from === currentUserId ? 'sent' : 'received'}`}>
              <div className="message-text">{msg.text}</div>
              <div className="message-time">
                {msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
              </div>
            </div>
            {msg.from !== currentUserId && (
              <div 
                className="peer-avatar" 
                style={{ backgroundColor: getAvatarColor(msg.from) }}
                title={getPeerName(msg.from)}
              >
                {getPeerName(msg.from).charAt(0).toUpperCase() || '?'}
              </div>
            )}

        </div>
      ))}
    </div>
  );
};

export default MessageList;

