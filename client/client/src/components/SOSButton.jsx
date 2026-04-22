import { useState } from 'react';
import './SOSButton.css'; // Inline styles for simplicity, move to CSS later

const SOSButton = ({ onSOS, isConnected }) => {
  const [pressing, setPressing] = useState(false);

  const handleSOS = () => {
    if (isConnected) {
      navigator.vibrate?.(200);
      setPressing(true);
      onSOS();
      setTimeout(() => setPressing(false), 1000);
    }
  };

  return (
    <button 
      className={`sos-btn ${pressing ? 'pressing' : ''}`}
      onClick={handleSOS}
      disabled={!isConnected}
      aria-label="Emergency SOS - Hold for 3 seconds"
      style={{
        opacity: isConnected ? 1 : 0.5,
        cursor: isConnected ? 'pointer' : 'not-allowed'
      }}
    >
      {pressing ? '🚨 SOS SENT!' : '🚨 EMERGENCY SOS'}
      {isConnected ? '' : ' (Connect BT First)'}
    </button>
  );
};

export default SOSButton;

