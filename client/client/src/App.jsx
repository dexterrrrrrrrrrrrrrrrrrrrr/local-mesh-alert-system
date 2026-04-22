import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './contexts/AuthContext.jsx';
import { useBluetoothMesh } from './services/BluetoothService.js';
import { KNOWN_DEVICES } from './services/BluetoothService.js';
import { useWebRTCMesh } from './services/WebRTCMesh.js';
import StatusBar from './components/StatusBar.jsx';
import SOSForm from './components/SOSForm.jsx';
import AlertList from './components/AlertList.jsx';
import DeviceList from './components/DeviceList.jsx';
import PermissionsModal from './components/PermissionsModal.jsx';
import ChatTab from './components/ChatTab.jsx';
import TaskList from './components/TaskList.jsx';
import './App.css';
import './components/MessageStyles.css';

const TASKS_STORAGE_KEY = 'mesh-tasks-v2';
const TASKS_OFFLINE_QUEUE_KEY = 'mesh-tasks-offline-queue-v2';

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onLogin(username, password);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <h2>🔐 Mesh Portal Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username (manager, staff1-3, guest)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!username === 'guest'}
        />
        <button type="submit">Login</button>
      </form>
      <p>Demo: manager/admin, staff1/pass, guest/(empty)</p>
      <div className="error">{error}</div>
    </div>
  );
}

function App() {
  const { session, isLoading, login, logout, isAuthed } = useAuth();
  const [connectMode, setConnectMode] = useState(false);
  const bleHook = useBluetoothMesh(connectMode);
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

  const portal = session?.role === 'manager' ? 'manager' : session?.role === 'guest' ? 'guest' : 'staff';
  const staffId = session?.id || 'staff1';
  const [sharedTasks, setSharedTasks] = useState(() => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [taskNotifications, setTaskNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);

  // Service Worker registration for PWA + offline sync
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg))
        .catch(err => console.log('SW registration failed'));
      
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_OFFLINE_DATA') {
          syncOfflineQueue();
        }
      });
    }
  }, []);

  // Offline SOS/Message queue
  const queueAction = useCallback((type, data) => {
    const queued = {
      id: Date.now().toString(),
      type,
      data,
      timestamp: Date.now()
    };
    setOfflineQueue(prev => [queued, ...prev.slice(0, 50)]);
    localStorage.setItem('mesh-offline-queue', JSON.stringify([queued, ...offlineQueue.slice(0, 49)]));
  }, [offlineQueue]);

  const syncOfflineQueue = useCallback(async () => {
    const stored = JSON.parse(localStorage.getItem('mesh-offline-queue') || '[]');
    for (const item of stored) {
      try {
        if (item.type === 'sos') {
          sendWebRTCSOS(item.data.location);
        } else if (item.type === 'message') {
          webrtcSendMessage(item.data.text);
        }
      } catch {}
    }
    localStorage.removeItem('mesh-offline-queue');
    setOfflineQueue([]);
  }, [sendWebRTCSOS, webrtcSendMessage]);

  // Task sync BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('mesh-tasks');
    const mergeTaskByTimestamp = (prev, incomingTask) => {
      const existing = prev.find((t) => t.id === incomingTask.id);
      if (!existing) {
        return [incomingTask, ...prev].slice(0, 100);
      }
      const existingTs = new Date(existing.updatedAt || 0).getTime();
      const incomingTs = new Date(incomingTask.updatedAt || 0).getTime();
      if (incomingTs <= existingTs) {
        return prev;
      }
      return prev.map((t) => (t.id === incomingTask.id ? incomingTask : t));
    };

    const handleTask = (event) => {
      if (event.data.type !== 'task-update') return;
      const task = event.data.task;
      setSharedTasks((prev) => mergeTaskByTimestamp(prev, task));
    };

    channel.addEventListener('message', handleTask);
    return () => channel.removeEventListener('message', handleTask);
  }, []);

  useEffect(() => {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(sharedTasks));
  }, [sharedTasks]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const upsertTask = useCallback((incomingTask, source = 'local') => {
    setSharedTasks((prev) => {
      const existing = prev.find((t) => t.id === incomingTask.id);
      const existingTs = new Date(existing?.updatedAt || 0).getTime();
      const incomingTs = new Date(incomingTask.updatedAt || 0).getTime();

      if (existing && incomingTs <= existingTs) {
        return prev;
      }

      const next = existing
        ? prev.map((t) => (t.id === incomingTask.id ? incomingTask : t))
        : [incomingTask, ...prev];

      if (existing) {
        const justCompleted = Object.keys(incomingTask.statusByStaff || {}).filter((staff) => {
          const prevStatus = existing.statusByStaff?.[staff] || 'pending';
          const nextStatus = incomingTask.statusByStaff?.[staff] || 'pending';
          return prevStatus !== 'completed' && nextStatus === 'completed';
        });
        if (justCompleted.length > 0) {
          setTaskNotifications((prevN) => [
            ...justCompleted.map((staff) => ({
              id: `${incomingTask.id}-${staff}-${incomingTask.updatedAt}`,
              text: `${staff.toUpperCase()} completed "${incomingTask.title}"`,
              time: incomingTask.updatedAt
            })),
            ...prevN
          ].slice(0, 20));
        }
      }

      return next.slice(0, 100);
    });

    if (source === 'local') {
      if (isOnline) {
        const channel = new BroadcastChannel('mesh-tasks');
        channel.postMessage({ type: 'task-update', task: incomingTask });
      } else {
        try {
          const queued = JSON.parse(localStorage.getItem(TASKS_OFFLINE_QUEUE_KEY) || '[]');
          queued.push(incomingTask);
          localStorage.setItem(TASKS_OFFLINE_QUEUE_KEY, JSON.stringify(queued.slice(-200)));
        } catch {
          // ignore queue persistence issues
        }
      }
    }
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    const channel = new BroadcastChannel('mesh-tasks');
    try {
      const queued = JSON.parse(localStorage.getItem(TASKS_OFFLINE_QUEUE_KEY) || '[]');
      queued.forEach((task) => channel.postMessage({ type: 'task-update', task }));
      localStorage.removeItem(TASKS_OFFLINE_QUEUE_KEY);
    } catch {
      // ignore queue parse errors
    }
  }, [isOnline]);

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

  const handleSendSOS = useCallback(async (emergencyText) => {
    navigator.vibrate?.([200, 100, 200]);
    bleSendSOS(emergencyText);
    if (isOnline) {
      sendWebRTCSOS(emergencyText);
    } else {
      queueAction('sos', { location: emergencyText });
      // Show queued notification
      setAlerts(prev => [{
        id: Date.now().toString(),
        type: '📶 SOS Queued (Offline)',
        location: emergencyText,
        time: new Date().toISOString(),
        from: 'SYSTEM'
      }, ...prev.slice(0, 19)]);
    }
  }, [bleSendSOS, sendWebRTCSOS, isOnline, queueAction]);

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
      const text = e.results[e.results.length - 1][0].transcript;
      if (text.toLowerCase().includes('help') || text.toLowerCase().includes('sos') || text.toLowerCase().includes('emergency')) {
        handleSendSOS(text);
        const utterance = new SpeechSynthesisUtterance(`SOS "${text}" sent to all meshes (offline queued + sync)`);
        speechSynthesis.speak(utterance);
      }
    };
    recognition.onerror = (e) => console.log('Voice error:', e.error);
    recognition.onend = () => setIsVoiceActive(false);
    recognition.start();
    voiceRef.current = recognition;
    setIsVoiceActive(true);
  }, [handleSendSOS, location]);

  const handleScan = async () => {
    try {
      await scanDevices();
    } catch (err) {
      console.error('Scan failed:', err);
    }
  };

  const handleConnect = useCallback((device) => {
    connectDevice(device);
  }, [connectDevice]);

  const handleSendMessage = useCallback(async (text) => {
    try {
      bleSendMessage(text);
      if (isOnline) {
        webrtcSendMessage(text);
      } else {
        queueAction('message', { text });
      }
      navigator.vibrate?.([100]);
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [bleSendMessage, webrtcSendMessage, isOnline, queueAction]);

  const isConnected = allPeers.length > 0 || connectMode;

  if (isLoading) {
    return <div className="app loading">Loading Mesh Portal...</div>;
  }

  if (!isAuthed) {
    return (
      <div className="app">
        <LoginForm onLogin={login} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1 className="title">🔴 {session?.role?.toUpperCase() || 'MESH'} Mesh Portal</h1>
        <button className="logout-btn" onClick={logout}>Logout ({session?.username || 'User'})</button>
      </div>
      
        <StatusBar 
        btStatus={btStatus} 
        connectedDevices={allPeers} 
        alerts={allAlerts} 
        messages={allMessages}
        connectMode={connectMode}
        onToggleConnect={() => setConnectMode(!connectMode)}
        isOnline={isOnline}
      />

      <DeviceList 
        devices={allDevices} 
        connectedDevices={allPeers}
        onScan={handleScan} 
        onConnect={handleConnect}
        knownDevices={KNOWN_DEVICES}
        btStatus={btStatus}
        connectMode={connectMode}
      />

      <SOSForm onSend={handleSendSOS} location={location} />

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
        portal={portal}
        staffId={staffId}
        connectedDevices={allPeers}
        tasks={sharedTasks}
        isOnline={isOnline}
        notifications={taskNotifications}
        onUpsertTask={(task) => upsertTask(task, 'local')}
        session={session}
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
