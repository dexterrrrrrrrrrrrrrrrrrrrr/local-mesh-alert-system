const DeviceList = ({ devices, connectedDevices, onScan, onConnect, knownDevices = [], btStatus, connectMode }) => {
  const getDisplayName = (device) => {
    if (device?.id === 'mock1') return 'Staff 1';
    if (device?.id === 'mock2') return 'Staff 2';
    if (device?.id === 'mock3') return 'Staff 3';
    return device?.name || 'Unknown';
  };

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

  // Connect mode for simulated BLE
  const bleDevices = connectMode ? [
    { id: 'mock1', name: 'Staff 1', rssi: -65, network: 'BLE' },
    { id: 'mock2', name: 'Staff 2', rssi: -72, network: 'BLE' },
    { id: 'mock3', name: 'Staff 3', rssi: -58, network: 'BLE' }
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
          {connectMode && <p>🔗 Connect BLE peers ready</p>}
          {!connectMode && <p>Enable Connect or check BT/server</p>}
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
                {getDisplayName(device)} 
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
          {bleConnected.map(d => <span key={d.id} className="peer-tag ble">🔵 {getDisplayName(d)}</span>)}
          {webrtcConnected.map(d => <span key={d.id} className="peer-tag webrtc">🌐 {getDisplayName(d)}</span>)}
        </div>
      )}
    </div>
  );
};

export default DeviceList;

