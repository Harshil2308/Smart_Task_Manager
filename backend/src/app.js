const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const managerRoutes = require("./routes/manager");
const { pool, testConnection } = require("./config/db");

const app = express();

async function ensureTaskAssignmentsTable() {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS task_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT,
      assigned_by INT,
      assigned_to INT,
      status ENUM('assigned','in-progress','completed','reassigned') DEFAULT 'assigned',
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      CONSTRAINT fk_task_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
      CONSTRAINT fk_task_assignments_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id)
    )`
  );
}

(async () => {
  try {
    const dbReady = await testConnection();
    if (!dbReady) {
      console.error("Database connection failed during startup.");
      return;
    }

    await ensureTaskAssignmentsTable();
    console.log("Database schema verified: task_assignments table exists.");
  } catch (error) {
    console.error("Database schema initialization failed:", error.message);
  }
})();

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
