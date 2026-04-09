const { WebSocketServer } = require('ws');

let wss;

function init(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');

    ws.on('close', () => console.log('WebSocket client disconnected'));

    ws.on('error', (err) => console.error('WebSocket error:', err));

    // Send a welcome ping so client can confirm connection
    ws.send(JSON.stringify({ event: 'CONNECTED', data: {}, timestamp: Date.now() }));
  });
}

function broadcast(event, data) {
  if (!wss) return;
  const message = JSON.stringify({ event, data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

module.exports = { init, broadcast };
