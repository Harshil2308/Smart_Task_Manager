const express = require("express");
const { pool } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const {
  enhancePriorityScore,
  fetchKeywordOverrides,
  parseVoiceText,
  predictTaskPriority,
  strongestLabel,
  toTitleCase
} = require("../utils/task-intelligence");
const { attachAssignmentHistory, getAssignmentHistoryMap } = require("../utils/assignment-history");

const router = express.Router();
const EMPLOYEE_ALLOWED_STATUSES = new Set(["assigned", "in-progress", "completed"]);

function sanitizeTaskRow(row) {
  return {
    ...row,
    assignment_id: row.assignment_id || null,
    assigned_by_name: row.assigned_by_name || null,
    assigned_to_name: row.assigned_to_name || null,
    assigned_to: row.current_assigned_to || row.assigned_to || null,
    status: row.assignment_status || row.status || "assigned",
    assigned_at: row.assignment_assigned_at || row.assigned_at || null,
    updated_at: row.assignment_updated_at || row.updated_at || null
  };
}

async function buildTaskPayload(req) {
  const {
    assigned_to,
    title,
    description = "",
    deadline,
    effort = "Medium",
    impact = "Medium",
    workload = 5,
    category,
    voice_text
  } = req.body;

  if (!assigned_to) {
    throw new Error("Assigned employee is required.");
  }

  let parsedVoice = null;
  if (voice_text && !title) {
    parsedVoice = parseVoiceText(voice_text);
  }

  const resolvedTitle = (title || parsedVoice?.title || "").trim();
  if (!resolvedTitle) {
    throw new Error("Task title is required.");
  }

  const resolvedDescription = (description || parsedVoice?.description || "").trim();
  const resolvedDeadline = deadline || parsedVoice?.deadline;
  const deadlineDays = resolvedDeadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${resolvedDeadline}T00:00:00`).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : parsedVoice?.deadlineDays ?? 7;

  const normalizedEffort = toTitleCase(effort);
  const normalizedImpact = toTitleCase(impact);
  const numericWorkload = Number(workload || 0);

  let prediction = {
    priority_score: 50,
    priority_label: "Medium",
    source: "fallback"
  };

  try {
    prediction = await predictTaskPriority({
      deadlineDays,
      effort: normalizedEffort,
      impact: normalizedImpact,
      workload: numericWorkload
    });
  } catch (error) {
    console.error("ML prediction error:", error.message);
  }

  const combinedText = [resolvedTitle, resolvedDescription, voice_text].filter(Boolean).join(" ");
  const overrides = await fetchKeywordOverrides(combinedText);

  return {
    assigned_to: Number(assigned_to),
    title: resolvedTitle,
    description: resolvedDescription,
    deadline: resolvedDeadline || parsedVoice?.deadline || null,
    deadline_days: deadlineDays,
    effort: overrides.effort || normalizedEffort,
    impact: overrides.impact || normalizedImpact,
    workload: numericWorkload,
    category: category || parsedVoice?.category || "General",
    priority_score: enhancePriorityScore(prediction.priority_score, overrides),
    priority_label: strongestLabel(prediction.priority_label, overrides.priorityLabel || "Low"),
    status: "pending"
  };
}

async function validateEmployee(employeeId) {
  const [employeeRows] = await pool.execute(
    "SELECT id, role FROM users WHERE id = ? LIMIT 1",
    [employeeId]
  );

  return employeeRows.length > 0 && employeeRows[0].role === "employee";
}

router.use(authenticate);

router.post("/parse-voice", requireRole("manager"), async (req, res) => {
  const { voice_text } = req.body;

  if (!voice_text) {
    return res.status(400).json({ message: "voice_text is required." });
  }

  return res.json({ parsed: parseVoiceText(voice_text) });
});

router.post("/create", requireRole("manager"), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const task = await buildTaskPayload(req);

    if (!(await validateEmployee(task.assigned_to))) {
      return res.status(400).json({ message: "Assigned user must be a valid employee." });
    }

    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO tasks
        (assigned_by, assigned_to, title, description, deadline, deadline_days, effort, impact, workload, category, status, priority_score, priority_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        task.assigned_to,
        task.title,
        task.description,
        task.deadline,
        task.deadline_days,
        task.effort,
        task.impact,
        task.workload,
        task.category,
        task.status,
        task.priority_score,
        task.priority_label
      ]
    );

    const [assignmentResult] = await connection.execute(
      `INSERT INTO task_assignments
        (task_id, assigned_by, assigned_to, status)
       VALUES (?, ?, ?, 'assigned')`,
      [result.insertId, req.user.id, task.assigned_to]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Task created successfully.",
      task: {
        id: result.insertId,
        assignment_id: assignmentResult.insertId,
        assigned_by: req.user.id,
        assigned_to: task.assigned_to,
        assigned_to_name: null,
        ...task,
        status: "assigned",
        assignment_history: [
          {
            id: assignmentResult.insertId,
            assigned_by: req.user.id,
            assigned_to: task.assigned_to,
            status: "assigned"
          }
        ]
      }
    });
  } catch (error) {
    await connection.rollback();
    const status = error.message.includes("required") ? 400 : 500;
    return res.status(status).json({ message: error.message || "Unable to create task." });
  } finally {
    connection.release();
  }
});

router.get("/", async (req, res) => {
  try {
    if (req.user.role === "manager") {
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

      const sanitized = rows.map(sanitizeTaskRow);
      const historyMap = await getAssignmentHistoryMap(sanitized.map((row) => row.id));
      return res.json({ tasks: attachAssignmentHistory(sanitized, historyMap) });
    }

    const [rows] = await pool.execute(
      `SELECT
        t.*,
        creator.name AS assigned_by_name,
        assignee.name AS assigned_to_name,
        ta.id AS assignment_id,
        ta.status AS assignment_status,
        ta.assigned_at AS assignment_assigned_at,
        ta.updated_at AS assignment_updated_at
       FROM task_assignments ta
       INNER JOIN tasks t ON t.id = ta.task_id
       LEFT JOIN users creator ON creator.id = ta.assigned_by
       LEFT JOIN users assignee ON assignee.id = ta.assigned_to
       WHERE ta.assigned_to = ?
       ORDER BY ta.updated_at DESC, ta.id DESC`,
      [req.user.id]
    );

    return res.json({ tasks: rows.map(sanitizeTaskRow) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch tasks." });
  }
});

router.put("/:id", async (req, res) => {
  const taskId = Number(req.params.id);
  const { status, title, description, deadline, effort, impact, workload, category } = req.body;

  try {
    const [taskRows] = await pool.execute("SELECT * FROM tasks WHERE id = ? LIMIT 1", [taskId]);

    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const task = taskRows[0];

    if (req.user.role === "employee") {
      const [assignmentRows] = await pool.execute(
        `SELECT * FROM task_assignments
         WHERE task_id = ? AND assigned_to = ?
         ORDER BY assigned_at DESC, id DESC
         LIMIT 1`,
        [taskId, req.user.id]
      );

      if (assignmentRows.length === 0) {
        return res.status(403).json({ message: "You can only update your own assigned tasks." });
      }

      const assignment = assignmentRows[0];

      if (assignment.status === "reassigned") {
        return res.status(400).json({ message: "This task assignment has been reassigned and is read-only." });
      }

      const nextStatus = status || assignment.status;
      if (!EMPLOYEE_ALLOWED_STATUSES.has(nextStatus)) {
        return res.status(400).json({ message: "Status must be assigned, in-progress, or completed." });
      }

      await pool.execute(
        "UPDATE task_assignments SET status = ? WHERE id = ?",
        [nextStatus, assignment.id]
      );
      await pool.execute(
        "UPDATE tasks SET status = ? WHERE id = ?",
        [nextStatus === "assigned" ? "pending" : nextStatus, taskId]
      );

      return res.json({
        message: "Task status updated.",
        task: {
          ...task,
          assignment_id: assignment.id,
          status: nextStatus
        }
      });
    }

    if (task.assigned_by !== req.user.id) {
      return res.status(403).json({ message: "You can only update tasks you assigned." });
    }

    const updatedTask = {
      title: title || task.title,
      description: description ?? task.description,
      deadline: deadline || task.deadline,
      effort: toTitleCase(effort || task.effort),
      impact: toTitleCase(impact || task.impact),
      workload: Number(workload ?? task.workload),
      category: category || task.category
    };

    const deadlineDays = updatedTask.deadline
      ? Math.max(
          0,
          Math.ceil(
            (new Date(`${updatedTask.deadline}T00:00:00`).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : task.deadline_days;

    let prediction = {
      priority_score: task.priority_score,
      priority_label: task.priority_label
    };

    try {
      prediction = await predictTaskPriority({
        deadlineDays,
        effort: updatedTask.effort,
        impact: updatedTask.impact,
        workload: updatedTask.workload
      });
    } catch (error) {
      console.error("ML prediction error:", error.message);
    }

    const overrides = await fetchKeywordOverrides(`${updatedTask.title} ${updatedTask.description}`);
    const finalLabel = strongestLabel(prediction.priority_label, overrides.priorityLabel || "Low");
    const finalScore = enhancePriorityScore(prediction.priority_score, overrides);

    await pool.execute(
      `UPDATE tasks
       SET title = ?, description = ?, deadline = ?, deadline_days = ?, effort = ?, impact = ?, workload = ?, category = ?, priority_score = ?, priority_label = ?
       WHERE id = ?`,
      [
        updatedTask.title,
        updatedTask.description,
        updatedTask.deadline,
        deadlineDays,
        overrides.effort || updatedTask.effort,
        overrides.impact || updatedTask.impact,
        updatedTask.workload,
        updatedTask.category,
        finalScore,
        finalLabel,
        taskId
      ]
    );

    return res.json({
      message: "Task updated successfully.",
      task: {
        ...task,
        ...updatedTask,
        deadline_days: deadlineDays,
        priority_score: finalScore,
        priority_label: finalLabel
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update task." });
  }
});

router.delete("/:id", requireRole("manager"), async (req, res) => {
  const taskId = Number(req.params.id);
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute("SELECT assigned_by FROM tasks WHERE id = ? LIMIT 1", [taskId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (rows[0].assigned_by !== req.user.id) {
      return res.status(403).json({ message: "You can only delete tasks you assigned." });
    }

    await connection.beginTransaction();
    await connection.execute("DELETE FROM task_assignments WHERE task_id = ?", [taskId]);
    await connection.execute("DELETE FROM tasks WHERE id = ?", [taskId]);
    await connection.commit();

    return res.json({ message: "Task deleted successfully." });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: "Unable to delete task." });
  } finally {
    connection.release();
  }
});

module.exports = router;
