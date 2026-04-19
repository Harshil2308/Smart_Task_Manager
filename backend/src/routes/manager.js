const express = require("express");
const { pool } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { attachAssignmentHistory, getAssignmentHistoryMap } = require("../utils/assignment-history");

const router = express.Router();

function sanitizeManagerTask(row) {
  return {
    ...row,
    assignment_id: row.assignment_id || null,
    assigned_to: row.current_assigned_to || row.assigned_to || null,
    assigned_to_name: row.assigned_to_name || null,
    status: row.assignment_status || row.status || "assigned",
    assigned_at: row.assignment_assigned_at || null,
    updated_at: row.assignment_updated_at || null
  };
}

router.use(authenticate, requireRole("manager"));

router.post("/assign-task", async (req, res) => {
  req.url = "/create";
  return res.redirect(307, "/api/tasks/create");
});

router.post("/reassign-task", async (req, res) => {
  const { task_id, new_employee_id } = req.body;
  const taskId = Number(task_id);
  const newEmployeeId = Number(new_employee_id);
  const connection = await pool.getConnection();

  try {
    if (!taskId || !newEmployeeId) {
      return res.status(400).json({ message: "task_id and new_employee_id are required." });
    }

    const [taskRows] = await connection.execute(
      "SELECT id, assigned_by, title FROM tasks WHERE id = ? LIMIT 1",
      [taskId]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (taskRows[0].assigned_by !== req.user.id) {
      return res.status(403).json({ message: "You can only reassign tasks you created." });
    }

    const [employeeRows] = await connection.execute(
      "SELECT id, role, name FROM users WHERE id = ? LIMIT 1",
      [newEmployeeId]
    );

    if (employeeRows.length === 0 || employeeRows[0].role !== "employee") {
      return res.status(400).json({ message: "New assignee must be a valid employee." });
    }

    const [activeAssignmentRows] = await connection.execute(
      `SELECT * FROM task_assignments
       WHERE task_id = ? AND status IN ('assigned', 'in-progress')
       ORDER BY assigned_at DESC, id DESC
       LIMIT 1`,
      [taskId]
    );

    if (activeAssignmentRows.length === 0) {
      return res.status(400).json({ message: "No active assignment found for this task." });
    }

    const activeAssignment = activeAssignmentRows[0];

    if (activeAssignment.assigned_to === newEmployeeId) {
      return res.status(400).json({ message: "This task is already assigned to the selected employee." });
    }

    await connection.beginTransaction();

    await connection.execute(
      "UPDATE task_assignments SET status = 'reassigned' WHERE id = ?",
      [activeAssignment.id]
    );

    const [newAssignmentResult] = await connection.execute(
      `INSERT INTO task_assignments
        (task_id, assigned_by, assigned_to, status)
       VALUES (?, ?, ?, 'assigned')`,
      [taskId, req.user.id, newEmployeeId]
    );

    await connection.execute(
      "UPDATE tasks SET status = 'pending' WHERE id = ?",
      [taskId]
    );

    await connection.commit();

    return res.json({
      message: "Task reassigned successfully",
      task_id: taskId,
      previous_assignment_id: activeAssignment.id,
      new_assignment_id: newAssignmentResult.insertId,
      new_assigned_to: newEmployeeId,
      new_assigned_to_name: employeeRows[0].name
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: "Unable to reassign task." });
  } finally {
    connection.release();
  }
});

router.get("/team-tasks", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        t.*,
        creator.name AS assigned_by_name,
        current_assignment.id AS assignment_id,
        current_assignment.assigned_to AS current_assigned_to,
        current_assignment.status AS assignment_status,
        current_assignment.assigned_at AS assignment_assigned_at,
        current_assignment.updated_at AS assignment_updated_at,
        assignee.name AS assigned_to_name
       FROM tasks t
       LEFT JOIN users creator ON creator.id = t.assigned_by
       LEFT JOIN task_assignments current_assignment
         ON current_assignment.id = (
           SELECT ta2.id
           FROM task_assignments ta2
           WHERE ta2.task_id = t.id
           ORDER BY ta2.assigned_at DESC, ta2.id DESC
           LIMIT 1
         )
       LEFT JOIN users assignee ON assignee.id = current_assignment.assigned_to
       WHERE t.assigned_by = ?
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    const sanitized = rows.map(sanitizeManagerTask);
    const historyMap = await getAssignmentHistoryMap(sanitized.map((row) => row.id));
    return res.json({ tasks: attachAssignmentHistory(sanitized, historyMap) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch team tasks." });
  }
});

router.get("/employees", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role FROM users WHERE role = 'employee' ORDER BY name ASC"
    );

    return res.json({ employees: rows });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch employees." });
  }
});

module.exports = router;
