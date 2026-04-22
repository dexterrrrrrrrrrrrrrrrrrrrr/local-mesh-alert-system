const DeviceList = ({ devices, connectedDevices, onScan, onConnect, knownDevices = [], btStatus, mockMode }) => {
  const handleScanClick = () => {
    onScan();
  };

  const handleConnectClick = (device) => {
    // BLE devices have connect function, WebRTC auto-connects via signaling
    if (device.network === 'BLE') {
      onConnect(device);
    } else {
      console.log('WebRTC peer discovered:', device.id);
    }
  };

  // Mock only for BLE
  const bleDevices = mockMode ? [
    { id: 'mock1', name: 'Mock Node A', rssi: -65, network: 'BLE' },
    { id: 'mock2', name: 'Mock Node B', rssi: -72, network: 'BLE' },
    { id: 'mock3', name: 'Mock Node C', rssi: -58, network: 'BLE' }
  ] : devices.filter(d => d.network === 'BLE');

  const allDevices = [...bleDevices, ...devices.filter(d => d.network === 'WebRTC')];

  if (btStatus === 'scanning') {
    return (
      <div className="device-section">
        <div className="loading">
          <div className="spinner"></div>
          🔍 Scanning BLE + WebRTC mesh...
        </div>
      </div>
    );
  }

  if (allDevices.length === 0 && bleDevices.length === 0) {
    return (
      <div className="device-section">
        <div className="known-devices">
          <h4>📍 Static BLE Relays:</h4>
          <div className="known-relays">
            {knownDevices.map((known) => (
              <button 
                key={known.id}
                className="known-relay-btn"
                onClick={() => onConnect({ id: known.id, name: known.name, network: 'BLE', static: true })}
              >
                🔗 {known.name}
              </button>
            ))}
          </div>
        </div>

        <button className="scan-btn" onClick={handleScanClick}>
          🔍 Scan BLE Mesh Nodes
        </button>

        <div className="webrtc-info-container">
          <p>🌐 WebRTC auto-discovers via signaling server (ws://localhost:8080)</p>
          {mockMode && <p>🧪 Mock BLE peers ready</p>}
          {!mockMode && <p>Enable Mock or check BT/server</p>}
        </div>

      </div>
    );
  }

  const bleConnected = connectedDevices.filter(p => p.network === 'BLE');
  const webrtcConnected = connectedDevices.filter(p => p.network === 'WebRTC');

  return (
    <div className="device-section">
      <h3>📡 Mesh Devices ({allDevices.length})</h3>
      <div className="network-tabs">
        <span className="network-ble">🔵 BLE: {bleDevices.length}</span>
        <span className="network-webrtc">🌐 WebRTC: {devices.filter(d => d.network === 'WebRTC').length}</span>
      </div>
      <div className="devices-grid">
        {allDevices.map((device) => {
          const isConnected = connectedDevices.some(c => c.id === device.id);
          return (
            <div key={device.id} className={`device-card ${isConnected ? 'connected' : ''} ${device.network?.toLowerCase()}`}>
              <div className="device-name">
                {device.name} 
                <span className={`network-badge ${device.network?.toLowerCase()}`}>
                  {device.network === 'BLE' ? '🔵 BLE' : '🌐 WebRTC'}
                </span>
              </div>
              {device.rssi && <div className="device-rssi">📶 {device.rssi} dBm</div>}
              <button 
                className="connect-btn"
                onClick={() => handleConnectClick(device)}
                disabled={isConnected || device.network === 'WebRTC'}
                title={device.network === 'WebRTC' ? 'Auto-connected via signaling' : ''}
              >
                {isConnected ? '✅ Connected' : device.network === 'WebRTC' ? '🔗 Auto' : '🔗 Connect'}
              </button>
            </div>
          );
        })}
      </div>
      {(bleConnected.length > 0 || webrtcConnected.length > 0) && (
        <div className="connected-summary">
          Connected: 
          {bleConnected.map(d => <span key={d.id} className="peer-tag ble">🔵 {d.name}</span>)}
          {webrtcConnected.map(d => <span key={d.id} className="peer-tag webrtc">🌐 {d.name}</span>)}
        </div>
      )}
    </div>
  );
};

export default DeviceList;

