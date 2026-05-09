const http = require("http");
const app = require("./app");
const ws = require("./shared/websocket");

const PORT = process.env.PORT || 3000;

// Behind a reverse proxy (Nginx, ELB, Cloudflare etc.), trust the first hop so
// req.ip reflects the real client. Configure via TRUST_PROXY env var.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", process.env.TRUST_PROXY);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be set and at least 32 characters");
  process.exit(1);
}

const server = http.createServer(app);
ws.init(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
