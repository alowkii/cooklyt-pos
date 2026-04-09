const http = require("http");
const app = require("./app");
const ws = require("./shared/websocket");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
ws.init(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
