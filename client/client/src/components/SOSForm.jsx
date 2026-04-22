import { useState } from 'react';
import './SOSButton.css';

const SOSForm = ({ onSend, location }) => {
  const [message, setMessage] = useState(location || '');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
    }
    setShowForm(false);
  };

  return (
    <div className="sos-container">
      <button 
        className="sos-btn"
        onClick={() => setShowForm(true)}
        type="button"
      >
        🚨 EMERGENCY SOS
      </button>
      
      {showForm && (
        <div className="sos-form-overlay">
          <form onSubmit={handleSubmit} className="sos-form">
            <h3>Emergency Details</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Where is the emergency? (e.g. Room 101, Lobby, Kitchen)"
              rows="3"
              autoFocus
            />
            <div className="sos-form-actions">
              <button type="submit" className="sos-send-btn">SEND SOS</button>
              <button type="button" onClick={() => setShowForm(false)} className="sos-cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SOSForm;

