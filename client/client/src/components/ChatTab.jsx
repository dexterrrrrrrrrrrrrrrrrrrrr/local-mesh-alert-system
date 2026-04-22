import { useState } from 'react';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';

const ChatTab = ({ messages, connectedDevices, onSendMessage, isConnected }) => {
  const [showMessages, setShowMessages] = useState(true);

  return (
    <div className="chat-tab">
      <div className="tab-header">
        <button 
          className={`tab-btn ${showMessages ? 'active' : ''}`}
          onClick={() => setShowMessages(true)}
        >
          💬 Messages ({messages.length})
        </button>
        <span className="tab-divider">|</span>
        <button 
          className={`tab-btn ${!showMessages ? 'active' : ''}`}
          onClick={() => setShowMessages(false)}
        >
          👥 Peers ({connectedDevices.length})
        </button>
      </div>
      
      {showMessages ? (
        <div className="messages-section">
          <MessageList 
            messages={messages} 
            connectedDevices={connectedDevices}
            currentUserId="me"
          />
          <MessageInput 
            onSend={onSendMessage}
            isConnected={isConnected}
          />
        </div>
      ) : (
        <div className="peers-placeholder">
          <p>🧑‍🤝‍🧑 Peer list with direct messaging coming soon!</p>
          <p>Current messages broadcast to all {connectedDevices.length} peers.</p>
        </div>
      )}
    </div>
  );
};

export default ChatTab;

