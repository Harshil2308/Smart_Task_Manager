const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const managerRoutes = require("./routes/manager");
const { testConnection } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  const dbStatus = await testConnection();

  res.json({
    service: "backend",
    status: "ok",
    phase: 4,
    database: dbStatus ? "connected" : "disconnected"
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Task AI backend is running",
    docs: {
      health: "/health",
      register: "/api/auth/register",
      login: "/api/auth/login",
      me: "/api/auth/me",
      tasks: "/api/tasks",
      manager: "/api/manager/team-tasks"
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/manager", managerRoutes);

module.exports = app;
