const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

const rooms = new Map(); // room -> Set<ws>

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.peerId = null;
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      console.log('Signaling:', msg.type, msg.to || msg.room);
      
      if (msg.type === 'join') {
        ws.peerId = msg.from;
        const room = rooms.get(msg.room) || new Set();
        room.add(ws);
        rooms.set(msg.room, room);
        ws.room = msg.room;
        ws.send(JSON.stringify({ type: 'joined', room: msg.room, peers: Array.from(room).length - 1 }));
        
        // Notify others
        room.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-joined', peerId: msg.from }));
          }
        });
        return;
      }

      
      // Relay to specific peer or room
      if (msg.to) {
        const room = rooms.get(msg.room);
        if (room) {
          const target = Array.from(room).find(c => c.peerId === msg.to);
          if (target && target.readyState === WebSocket.OPEN) {
            target.send(JSON.stringify(msg));
          }
        }
      } else {

        // Broadcast to room except sender
        const room = rooms.get(msg.room);
        if (room) {
          room.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(msg));
            }
          });
        }
      }
    } catch (e) {
      console.error('Signaling error:', e);
    }
  });
  
  ws.on('close', () => {
    if (ws.room) {
      const room = rooms.get(ws.room);
      if (room) {
        room.delete(ws);
        if (room.size === 0) rooms.delete(ws.room);
      }
    }
    console.log('Client disconnected');
  });
});

console.log('WebRTC Signaling Server running on ws://localhost:8080');
console.log('Room: mesh-alerts');
