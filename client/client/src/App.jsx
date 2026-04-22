import { useState, useEffect, useCallback, useRef } from 'react';
import { useBluetoothMesh } from './services/BluetoothService.js';
import { KNOWN_DEVICES } from './services/BluetoothService.js';
import { useWebRTCMesh } from './services/WebRTCMesh.js';
import StatusBar from './components/StatusBar.jsx';
import SOSButton from './components/SOSButton.jsx';
import AlertList from './components/AlertList.jsx';
import DeviceList from './components/DeviceList.jsx';
import PermissionsModal from './components/PermissionsModal.jsx';
import ChatTab from './components/ChatTab.jsx';
import TaskList from './components/TaskList.jsx';
import './App.css';
import './components/MessageStyles.css';

function App() {
  const [mockMode, setMockMode] = useState(false);
  const bleHook = useBluetoothMesh(mockMode);
  const {
    devices: bleDevices,
    connectedDevices: blePeers,
    btStatus,
    alerts: bleAlerts,
    messages: bleMessages,
    scanDevices,
    connectDevice,
    requestBluetooth,
    sendSOS: bleSendSOS,
    sendMessage: bleSendMessage
  } = bleHook;
  const webrtc = useWebRTCMesh();
  const {
    peers: webrtcPeers,
    alerts: webrtcAlerts,
    messages: webrtcMessages,
    sendSOS: sendWebRTCSOS,
    sendMessage: webrtcSendMessage
  } = webrtc;

  // Merge states
  const allDevices = [...bleDevices.map(d => ({...d, network: 'BLE' })), 
                     ...webrtcPeers.map(id => ({id, name: `WebRTC ${id.slice(0,8)}`, network: 'WebRTC' }))];
  const allPeers = [...blePeers.map(p => ({...p, network: 'BLE' })), 
                    ...webrtcPeers.map(id => ({id, name: `WebRTC ${id.slice(0,8)}`, network: 'WebRTC' }))];
  const allAlerts = [...bleAlerts, ...webrtcAlerts];
  const allMessages = [...bleMessages, ...webrtcMessages];

  const [location, setLocation] = useState('Unknown');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const voiceRef = useRef(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);

  const [myRole, setMyRole] = useState('MONITOR');
  const [sharedTasks, setSharedTasks] = useState([]);
  const taskSeenRef = useRef(new Set());

  // Task sync BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('mesh-tasks');
    const handleTask = (event) => {
      if (event.data.type === 'task-update') {
        const task = event.data.task;
        // Always upsert incoming tasks so manager updates (assign/status) sync.
        setSharedTasks(prev => {
          const exists = prev.find(t => t.id === task.id);
          if (exists) {
            return prev.map(t => (t.id === task.id ? task : t));
          }
          taskSeenRef.current.add(task.id);
          return [task, ...prev.slice(0, 50)];
        });
      }
    };
    channel.addEventListener('message', handleTask);
    return () => channel.removeEventListener('message', handleTask);
  }, []);

  // Geolocation - click retry works
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation(`Lat:${latitude.toFixed(6)}° Lon:${longitude.toFixed(6)}° (±${accuracy.toFixed(0)}m)`);
        setHasLocation(true);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocation('Location denied - manual OK');
      },
      { 
        enableHighAccuracy: true, 
        timeout: 5000, 
        maximumAge: 60000 
      }
    );
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Permissions modal
  useEffect(() => {
    if (btStatus === 'permission-denied') setShowPermModal(true);
  }, [btStatus]);

  // Voice SOS
  const toggleVoice = useCallback(() => {
    if (voiceRef.current) {
      voiceRef.current.stop();
      voiceRef.current = null;
      setIsVoiceActive(false);
      return;
    }
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert('Voice not supported');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = async (e) => {
      const text = e.results[e.results.length - 1][0].transcript.toLowerCase();
      if (text.includes('help') || text.includes('sos') || text.includes('emergency')) {
        handleSOS();
        const utterance = new SpeechSynthesisUtterance(`SOS sent to all meshes`);
        speechSynthesis.speak(utterance);
      }
    };
    recognition.onerror = (e) => console.log('Voice error:', e.error);
    recognition.onend = () => setIsVoiceActive(false);
    recognition.start();
    voiceRef.current = recognition;
    setIsVoiceActive(true);
  }, []);

  const handleScan = async () => {
    try {
      if (!mockMode) await requestBluetooth();
      await scanDevices();
    } catch (err) {
      console.error('Scan failed:', err);
    }
  };

  const handleConnect = useCallback((device) => {
    connectDevice(device);
  }, [connectDevice]);

  const handleSOS = async () => {
    navigator.vibrate?.([200, 100, 200]);
    bleSendSOS(location);
    sendWebRTCSOS(location);
  };

  const deviceId = useRef(`tab_${Math.random().toString(36).slice(-6)}`).current;
  const handleSendMessage = useCallback(async (text) => {
    try {
      bleSendMessage(text);
      webrtcSendMessage(text);
      navigator.vibrate?.([100]);
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [bleSendMessage, webrtcSendMessage]);

  const isConnected = allPeers.length > 0 || mockMode;

  return (
    <div className="app">
      <h1 className="title">🔵 Dual Mesh SOS + Chat (BLE + WebRTC)</h1>
      
      <StatusBar 
        btStatus={btStatus} 
        connectedDevices={allPeers} 
        alerts={allAlerts} 
        messages={allMessages}
        mockMode={mockMode}
        onToggleMock={() => setMockMode(!mockMode)}
      />

      <DeviceList 
        devices={allDevices} 
        connectedDevices={allPeers}
        onScan={handleScan} 
        onConnect={handleConnect}
        knownDevices={KNOWN_DEVICES}
        btStatus={btStatus}
        mockMode={mockMode}
      />

      <div className="sos-container">
        <SOSButton onSOS={handleSOS} isConnected={isConnected} />
      </div>

      <button 
        className="voice-btn"
        onClick={toggleVoice}
        disabled={btStatus === 'unsupported'}
      >
        {isVoiceActive ? '🛑 Stop Listening' : '🎤 Voice SOS (say "help")'}
      </button>

      <div className="location-info" onClick={getCurrentLocation} style={{cursor: 'pointer'}}>
        📍 {location} {hasLocation ? '✅' : '🔄 Click to refresh'}
      </div>

      <AlertList alerts={allAlerts} />

      <TaskList 
        myRole={myRole}
        connectedDevices={allPeers}
        tasks={sharedTasks}
        onAssignTask={(task) => {
          const channel = new BroadcastChannel('mesh-tasks');
          channel.postMessage({ type: 'task-update', task });
          setSharedTasks(prev => prev.map(t => t.id === task.id ? task : t));
        }}
        onChangeRole={setMyRole}
        onAddTask={(task) => {
          const channel = new BroadcastChannel('mesh-tasks');
          channel.postMessage({ type: 'task-update', task });
          setSharedTasks(prev => [task, ...prev]);
        }}
      />

      <ChatTab 
        messages={allMessages}
        connectedDevices={allPeers}
        onSendMessage={handleSendMessage}
        isConnected={isConnected}
      />

      <div className="instructions">
        <p>🚨 SOS broadcasts to BLE + WebRTC meshes</p>
        <p>Chrome/Edge + BT/Location perms • Run 'cd server && node server.js' for WebRTC</p>
        <p>Test: Multi-tab (mock/BLE) + multi-browser (WebRTC)</p>
      </div>

      <PermissionsModal 
        isOpen={showPermModal}
        onClose={() => setShowPermModal(false)}
        onRetryBT={handleScan}
        onRetryLocation={() => {
          navigator.geolocation.getCurrentPosition(
            () => setHasLocation(true),
            () => {},
            { enableHighAccuracy: true }
          );
        }}
        btStatus={btStatus}
      />
    </div>
  );
}

export default App;
