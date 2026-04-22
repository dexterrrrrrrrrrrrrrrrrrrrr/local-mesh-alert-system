import { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSend, isConnected, disabled = false, placeholder = 'Type a message...' }) => {
  const [text, setText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (text.trim() && onSend) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmoji = (emoji) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text]);

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={isConnected ? placeholder : '🔗 Connect to mesh to chat'}
          className="message-textarea"
          rows={1}
          disabled={!isConnected || disabled}
          maxLength={500}
        />
        <div className="input-actions">
          <button 
            className="emoji-btn"
            onClick={() => {/* Future: emoji picker modal */}}
            title="Emoji"
            disabled={!isConnected}
          >
            😀
          </button>
          <button 
            className={`send-btn ${!isConnected || !text.trim() ? 'disabled' : ''}`}
            onClick={handleSend}
            disabled={!isConnected || !text.trim() || disabled}
          >
            {isConnected ? '📤' : '🔌'}
          </button>
        </div>
      </div>
      <div className={`input-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? `Mesh Chat Active (${navigator.onLine ? 'Online' : 'Offline'})` : 'Connect peers to enable chat'}
      </div>
      <div className="char-count">{text.length}/500</div>
    </div>
  );
};

export default MessageInput;

