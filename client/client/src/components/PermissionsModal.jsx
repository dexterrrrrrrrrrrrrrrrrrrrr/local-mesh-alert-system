import { useState } from 'react';
import { useBluetoothMesh } from '../services/BluetoothService.js';

const PermissionsModal = ({ isOpen, onClose, onRetryBT, onRetryLocation, btStatus }) => {
  if (!isOpen) return null;

  const handleRetryBT = () => {
    onRetryBT();
    onClose();
  };

  const handleRetryLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => window.location.reload(),
        () => alert('Location still denied'),
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: 'white', padding: '2rem', borderRadius: '20px', maxWidth: '500px',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#d32f2f', marginBottom: '1rem' }}>🔐 Permissions Required</h2>
        <p><strong>Bluetooth Mesh SOS needs:</strong></p>
        <ul style={{ margin: '1rem 0' }}>
          <li>📱 <strong>Bluetooth</strong>: Scan/connect nearby devices</li>
          <li>📍 <strong>Location</strong>: Tag alerts with coords</li>
        </ul>

        {btStatus === 'permission-denied' && (
          <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '10px', margin: '1rem 0' }}>
            <strong>BT Denied:</strong> Click "Allow" in popup, or reset:
            <ol style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <li>Chrome → chrome://flags → "Web Bluetooth" → Enabled</li>
              <li>Site Settings → Bluetooth → Allow</li>
              <li>Reload + try again</li>
            </ol>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <button onClick={handleRetryBT} style={{
            padding: '1rem 2rem', background: 'linear-gradient(45deg, #4facfe, #00f2fe)',
            color: 'white', border: 'none', borderRadius: '30px', fontSize: '1.1rem', cursor: 'pointer'
          }}>
            🔄 Retry Bluetooth
          </button>
          <button onClick={handleRetryLocation} style={{
            padding: '1rem 2rem', background: 'linear-gradient(45deg, #00b894, #00cec9)',
            color: 'white', border: 'none', borderRadius: '30px', fontSize: '1.1rem', cursor: 'pointer'
          }}>
            📍 Retry Location
          </button>
          <button onClick={onClose} style={{
            padding: '1rem 2rem', background: '#95a5a6', color: 'white', border: 'none',
            borderRadius: '30px', fontSize: '1.1rem', cursor: 'pointer'
          }}>
            ❌ Close
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', marginTop: '2rem' }}>
          Chrome/Edge only • localhost/HTTPS required
        </p>
      </div>
    </div>
  );
};

export default PermissionsModal;

