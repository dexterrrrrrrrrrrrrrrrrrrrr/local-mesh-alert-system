import { useState, useEffect, useRef, useCallback } from 'react';

const SOS_SERVICE_UUID = '56DE735C-F02B-6E31-55EB-B96359677507';
const ALERT_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const STATUS_CHAR_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';
const MESSAGE_CHAR_UUID = '0000fff3-0000-1000-8000-00805f9b34fb';

const KNOWN_DEVICES = [
  { id: 'relay1', name: '🔵 RELAY1', serviceUUID: '56DE735C-F02B-6E31-55EB-B96359677507' },
  { id: 'relay2', name: '🔵 RELAY2', serviceUUID: '56DE735C-F02B-6E31-55EB-B96359677507' },
  { id: 'relay3', name: '🔵 RELAY3', serviceUUID: '56DE735C-F02B-6E31-55EB-B96359677507' }
];

export { KNOWN_DEVICES };

export const useBluetoothMesh = (mockMode = false) => {
  const [devices, setDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [btStatus, setBtStatus] = useState('disabled');
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState([]);
  const seenAlerts = useRef(new Set());
  const seenMessages = useRef(new Set());
  const connectionsRef = useRef([]);

  // Request Bluetooth access
  const requestBluetooth = useCallback(async () => {
    try {
      if (!navigator.bluetooth) {
        setBtStatus('unsupported');
        throw new Error('Web Bluetooth not supported');
      }
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SOS_SERVICE_UUID] }],
        optionalServices: [SOS_SERVICE_UUID, ALERT_CHAR_UUID, STATUS_CHAR_UUID],
        acceptAllDevices: false
      });
      return device;
    } catch (err) {
      setBtStatus('permission-denied');
      throw err;
    }
  }, []);

  // Scan for nearby devices
  const scanDevices = useCallback(async () => {
    try {
      setBtStatus('scanning');
      const options = {
        filters: [{ services: [SOS_SERVICE_UUID] }],
        keepRepeatedDevices: true
      };
      if (mockMode) {
        setTimeout(() => {
          setDevices([
            { id: 'mock1', name: 'Mock BLE Node A', rssi: -65, network: 'BLE' },
            { id: 'mock2', name: 'Mock BLE Node B', rssi: -72, network: 'BLE' },
            { id: 'mock3', name: 'Mock BLE Node C', rssi: -58, network: 'BLE' }
          ]);
          setBtStatus('scan-complete');
        }, 2000);
        return;
      }
      const scanHandle = await navigator.bluetooth.requestLEScan(options);
      const handleAdvertisement = (event) => {
        const device = event.device;
        if (!devices.some(d => d.id === device.id)) {
          setDevices(prev => [...prev, { id: device.id, name: device.name || 'Unknown BLE Mesh Node', rssi: event.rssi || 0, network: 'BLE' }]);
        }
      };
      navigator.bluetooth.addEventListener('advertisementreceived', handleAdvertisement);
      setTimeout(() => {
        navigator.bluetooth.removeEventListener('advertisementreceived', handleAdvertisement);
        scanHandle.stop();
        setBtStatus('scan-complete');
      }, 10000);
    } catch (err) {
      console.error('Scan failed:', err);
      setBtStatus('scan-failed');
    }
  }, [devices, mockMode]);

  // Global BroadcastChannel for cross-tab sync
  useEffect(() => {
    const messagesChannel = new BroadcastChannel('ble-mesh-messages');
    const alertsChannel = new BroadcastChannel('ble-mesh-alerts');
    
    const handleMessages = (event) => {
      if (event.data.type === 'message') {
        const msg = event.data.message;
        if (!seenMessages.current.has(msg.id)) {
          seenMessages.current.add(msg.id);
          setMessages(prev => [msg, ...prev.slice(0, 100)]);
        }
      }
    };

    const handleAlerts = (event) => {
      if (event.data.type === 'alert') {
        const alert = event.data.alert;
        if (!seenAlerts.current.has(alert.id)) {
          seenAlerts.current.add(alert.id);
          setAlerts(prev => [alert, ...prev.slice(0, 20)]);
        }
      }
    };

    messagesChannel.addEventListener('message', handleMessages);
    alertsChannel.addEventListener('message', handleAlerts);

    return () => {
      messagesChannel.removeEventListener('message', handleMessages);
      alertsChannel.removeEventListener('message', handleAlerts);
    };
  }, []);

  // Connect to device GATT (mock implementation)
  const connectDevice = useCallback(async (device) => {
    if (device.id.startsWith('mock')) {
      const peerData = { id: device.id, name: device.name, network: 'BLE' };
      setConnectedDevices(prev => [...prev, peerData]);
      // Cross-tab sync
      const channel = new BroadcastChannel('mesh-peers');
      channel.postMessage({ type: 'peer-connected', peer: peerData });
      console.log('Mock connected:', device.name);
      return;
    }

    try {
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SOS_SERVICE_UUID);
      const alertChar = await service.getCharacteristic(ALERT_CHAR_UUID);
      const statusChar = await service.getCharacteristic(STATUS_CHAR_UUID);
      const messageChar = await service.getCharacteristic(MESSAGE_CHAR_UUID);

      // Enable notifications
      await alertChar.startNotifications();
      await messageChar.startNotifications();

      const conn = { device, server, alertChar, statusChar, messageChar };
      connectionsRef.current.push(conn);
      setConnectedDevices(prev => [...prev, { id: device.id, name: device.name || 'Mesh Node' }]);
    } catch (err) {
      console.error('Connect failed:', err);
    }
  }, []);

  // Connect to known device
  const connectKnownDevice = useCallback(async (known) => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [known.serviceUUID] }],
        optionalServices: [SOS_SERVICE_UUID]
      });
      await connectDevice(device);
    } catch (err) {
      console.error('Known device connect failed:', err);
    }
  }, [connectDevice]);

  // Send SOS
  const sendSOS = useCallback(async (location) => {
    const alert = {
      id: Date.now().toString(),
      type: '🚨 EMERGENCY SOS',
      location: location || 'Unknown',
      time: new Date().toLocaleString(),
      ttl: 10
    };

    // Broadcast via channels
    const channel = new BroadcastChannel('ble-mesh-alerts');
    channel.postMessage({ type: 'alert', alert });

    // Send to BLE connections
    for (const conn of connectionsRef.current) {
      try {
        await conn.alertChar.writeValueWithResponse(new TextEncoder().encode(JSON.stringify(alert)));
      } catch (err) {
        console.error('BLE write failed:', err);
      }
    }

    seenAlerts.current.add(alert.id);
    setAlerts(prev => [alert, ...prev.slice(0, 20)]);
    return alert;
  }, []);

  // Send message
  const sendMessage = useCallback(async (text) => {
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      from: 'me',
      text: text,
      time: new Date().toISOString()
    };

    // Broadcast via channels
    const channel = new BroadcastChannel('ble-mesh-messages');
    channel.postMessage({ type: 'message', message });

    // Send to BLE connections
    for (const conn of connectionsRef.current) {
      try {
        await conn.messageChar.writeValueWithResponse(new TextEncoder().encode(JSON.stringify(message)));
      } catch (err) {
        console.error('BLE write failed:', err);
      }
    }

    seenMessages.current.add(message.id);
    setMessages(prev => [message, ...prev.slice(0, 100)]);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      connectionsRef.current.forEach(conn => conn.server?.disconnect());
      connectionsRef.current = [];
    };
  }, []);

  return {
    devices,
    connectedDevices,
    btStatus,
    alerts,
    messages,
    scanDevices,
    connectDevice,
    connectKnownDevice,
    sendSOS,
    sendMessage,
    requestBluetooth
  };
};
