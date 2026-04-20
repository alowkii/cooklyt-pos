const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

let wss;

function init(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.restaurantId = null; // unauthenticated until AUTH message arrives

    ws.on('message', (raw) => {
      try {
        const { type, token } = JSON.parse(raw);
        if (type === 'AUTH' && token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          ws.restaurantId = decoded.restaurantId;
          ws.send(JSON.stringify({ event: 'CONNECTED', data: {}, timestamp: Date.now() }));
        }
      } catch {
        // Bad JSON or invalid token — connection stays unauthenticated
      }
    });

    ws.on('error', (err) => console.error('WebSocket error:', err));
  });
}

// Only delivers to clients authenticated to the same restaurant
function broadcast(event, data, restaurantId) {
  if (!wss) return;
  const message = JSON.stringify({ event, data, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.restaurantId === restaurantId) {
      client.send(message);
    }
  });
}

module.exports = { init, broadcast };
