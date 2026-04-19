const { pool } = require("../config/db");

async function getAssignmentHistoryMap(taskIds) {
  if (!taskIds.length) {
    return new Map();
  }

  const placeholders = taskIds.map(() => "?").join(", ");
  const [rows] = await pool.execute(
    `SELECT
      ta.id,
      ta.task_id,
      ta.assigned_by,
      ta.assigned_to,
      ta.status,
      ta.assigned_at,
      ta.updated_at,
      assigner.name AS assigned_by_name,
      assignee.name AS assigned_to_name
     FROM task_assignments ta
     LEFT JOIN users assigner ON assigner.id = ta.assigned_by
     LEFT JOIN users assignee ON assignee.id = ta.assigned_to
     WHERE ta.task_id IN (${placeholders})
     ORDER BY ta.assigned_at ASC, ta.id ASC`,
    taskIds
  );

  const historyMap = new Map();

  for (const row of rows) {
    if (!historyMap.has(row.task_id)) {
      historyMap.set(row.task_id, []);
    }

    historyMap.get(row.task_id).push({
      id: row.id,
      task_id: row.task_id,
      assigned_by: row.assigned_by,
      assigned_by_name: row.assigned_by_name,
      assigned_to: row.assigned_to,
      assigned_to_name: row.assigned_to_name,
      status: row.status,
      assigned_at: row.assigned_at,
      updated_at: row.updated_at
    });
  }

  return historyMap;
}

function attachAssignmentHistory(tasks, historyMap) {
  return tasks.map((task) => ({
    ...task,
    assignment_history: historyMap.get(task.id) || []
  }));
}

module.exports = {
  attachAssignmentHistory,
  getAssignmentHistoryMap
};
