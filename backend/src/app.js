const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check — useful for CI and Docker later
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Routers will be mounted here as you build each module
// app.use('/api/auth',     require('./auth/auth.router'));
// app.use('/api/menu',     require('./menu/menu.router'));
// etc.

module.exports = app;
