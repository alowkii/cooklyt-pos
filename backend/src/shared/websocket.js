const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

let wss;

const AUTH_TIMEOUT_MS = 5000;

function init(server) {
  const allowedOrigins = (process.env.CORS_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
    .split(',').map((s) => s.trim()).filter(Boolean);

  wss = new WebSocketServer({
    server,
    verifyClient: ({ origin }, cb) => {
      // Non-browser clients omit Origin — allow them through. Browser clients
      // must come from a configured origin.
      if (!origin || allowedOrigins.includes(origin)) return cb(true);
      cb(false, 403, 'Origin not allowed');
    },
  });

  wss.on('connection', (ws) => {
    ws.restaurantId = null; // unauthenticated until AUTH message arrives

    const killUnauthed = setTimeout(() => {
      if (!ws.restaurantId) ws.terminate();
    }, AUTH_TIMEOUT_MS);

    ws.on('message', (raw) => {
      try {
        if (raw.length > 8 * 1024) {
          ws.terminate();
          return;
        }
        const { type, token } = JSON.parse(raw);
        if (type === 'AUTH' && token && !ws.restaurantId) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (!decoded.restaurantId) return;
          ws.restaurantId = decoded.restaurantId;
          clearTimeout(killUnauthed);
          ws.send(JSON.stringify({ event: 'CONNECTED', data: {}, timestamp: Date.now() }));
        }
      } catch {
        // Bad JSON or invalid token — connection stays unauthenticated
      }
    });

    ws.on('close', () => clearTimeout(killUnauthed));
    ws.on('error', (err) => console.error('WebSocket error:', err));
  });
}

// Only delivers to clients authenticated to the same restaurant
function broadcast(event, data, restaurantId) {
  if (!wss || !restaurantId) return;
  const message = JSON.stringify({ event, data, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.restaurantId === restaurantId) {
      client.send(message);
    }
  });
}

module.exports = { init, broadcast };
