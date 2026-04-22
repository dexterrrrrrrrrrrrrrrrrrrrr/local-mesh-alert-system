import { useState, useEffect, useCallback, useRef } from 'react';

const SIGNAL_SERVER = window.location.hostname === 'localhost' ? 
  'ws://localhost:8080' : 
  window.location.host.includes('vercel.app') ? 
  'wss://mesh-signaling.onrender.com' :  // Update with your Render URL
  'ws://192.168.1.5:8080';

const ROOM = 'mesh-alerts';

export const useWebRTCMesh = () => {
  const [peers, setPeers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);
  const localStream = useRef(null);
  const peerConnections = useRef(new Map());
  const peerIds = useRef(new Set());

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  const myId = `peer_${Math.random().toString(36).substr(2, 9)}`;

  const createPeerConnection = useCallback((peerId) => {
    // Extra STUN for 2G/3G faster ICE
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceTransportPolicy: 'all' // Try all candidates fast
    });
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignaling({ type: 'ice-candidate', candidate: event.candidate, to: peerId });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        console.log('Low-latency connected to', peerId);
      }
    };

    // Data-only (no media for 2G bandwidth)
    const dc = pc.createDataChannel('mesh-data', {
      maxRetransmits: 0, // Fire-and-forget for SOS
      ordered: false
    });
    dc.binaryType = 'arraybuffer'; // Efficient
    dc.onopen = () => console.log('Data channel low-latency to', peerId);
    dc.onmessage = (event) => {
      try {
        const compact = JSON.parse(event.data);
        const data = {
          type: compact.t === 'a' ? 'alert' : 'message',
          id: compact.i,
          from: compact.f,
          location: compact.l,
          text: compact.x,
          time: new Date(compact.tm * 1000).toISOString()
        };
        if (data.type === 'alert') {
          setAlerts(prev => [data, ...prev.slice(0, 20)]);
        } else {
          setMessages(prev => [data, ...prev.slice(0, 100)]);
        }
      } catch(e) {
        console.warn('Decode failed');
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }, []);

  const sendSignaling = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ from: myId, room: ROOM, ...data }));
    }
  }, []);

  const sendData = useCallback((data) => {
    // Compact payload for 2G/3G
    const compact = {
      t: data.type === 'alert' ? 'a' : 'm',
      i: data.id?.slice(-8),
      f: data.from?.slice(-6),
      l: data.location || '',
      x: data.text,
tm: Math.floor((data.time || Date.now()) / 1000)

    };
    const payload = JSON.stringify(compact);
    
    // Priority: SOS immediate, chat throttle
    peerConnections.current.forEach((pc) => {
      const dc = pc.getDataChannels()[0];
      if (dc && dc.readyState === 'open') {
        dc.send(payload);
      }
    });
  }, []);

  const sendSOS = useCallback((location) => {
    const alert = {
      id: Date.now().toString(),
      type: '🚨 EMERGENCY SOS',
      location: location || 'Unknown',
      time: new Date().toISOString(),
      from: myId
    };
    sendData({ type: 'alert', ...alert });
    setAlerts(prev => [alert, ...prev.slice(0, 20)]);
    return alert;
  }, [sendData]);

  const sendMessage = useCallback((text) => {
    const msg = {
      type: 'message',
      id: Date.now().toString(),
      text,
      from: myId,
      time: new Date().toISOString()
    };
    sendData(msg);
    setMessages(prev => [msg, ...prev.slice(0, 100)]);
  }, [sendData]);

  // Connect WS and join room
  useEffect(() => {
    ws.current = new WebSocket(SIGNAL_SERVER);
    
    ws.current.onopen = () => {
      sendSignaling({ type: 'join', room: ROOM, from: myId });
    };

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'joined') {
        console.log('Joined room, peers:', msg.peers);
      } else if (msg.type === 'peer-joined') {
        const peerId = msg.peerId;
        if (!peerConnections.current.has(peerId)) {
          const pc = createPeerConnection(peerId);
          // Create offer
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            sendSignaling({ type: 'offer', offer, to: peerId });
          });
        }
      } else if (msg.type === 'offer' && msg.from !== myId) {
        const pc = createPeerConnection(msg.from);
        pc.setRemoteDescription(new RTCSessionDescription(msg.offer))
          .then(() => pc.createAnswer())
          .then(answer => {
            pc.setLocalDescription(answer);
            sendSignaling({ type: 'answer', answer, to: msg.from });
          });
      } else if (msg.type === 'answer' && msg.from !== myId) {
        const pc = peerConnections.current.get(msg.from);
        if (pc) pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
      } else if (msg.type === 'ice-candidate' && msg.from !== myId) {
        const pc = peerConnections.current.get(msg.from);
        if (pc && msg.candidate) {
          pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      }
    };

    ws.current.onclose = () => {
      console.log('Signaling disconnected');
    };

    return () => {
      if (ws.current) ws.current.close();
      peerConnections.current.forEach(pc => pc.close());
    };
  }, [sendSignaling, createPeerConnection]);

  return {
    peers: Array.from(peerConnections.current.keys()),
    alerts,
    messages,
    sendSOS,
    sendMessage
  };
};

export default useWebRTCMesh;
