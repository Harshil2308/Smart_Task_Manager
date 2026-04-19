const dashboardStatus = document.getElementById("dashboard-status");
const nameNode = document.getElementById("user-name");
const emailNode = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const employeeTaskList = document.getElementById("employee-task-list");
const refreshButton = document.getElementById("refresh-employee-tasks");
const profileToggle = document.getElementById("profile-toggle");
const profilePanel = document.getElementById("profile-panel");
const profileForm = document.getElementById("profile-form");
const profileStatus = document.getElementById("profile-status");
const employeeOpenCountNode = document.getElementById("employee-open-count");
const employeeCompletedCountNode = document.getElementById("employee-completed-count");
const employeePrioritySummaryNode = document.getElementById("employee-priority-summary");
const employeeTodayFocusNode = document.getElementById("employee-today-focus");
const employeeAlertsNode = document.getElementById("employee-alerts");

const PRIORITY_ORDER = ["Critical", "High", "Medium", "Low"];

function daysUntilDeadline(deadline) {
  if (!deadline) {
    return null;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${deadline}T00:00:00`);
  return Math.ceil((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function priorityRank(label) {
  return PRIORITY_ORDER.indexOf(label || "Low");
}

function renderTodayFocus(tasks) {
  const focusedTasks = [...tasks]
    .filter((task) => !["completed", "reassigned"].includes(task.status))
    .sort((left, right) => {
      const priorityDiff = priorityRank(left.priority_label) - priorityRank(right.priority_label);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftDays = daysUntilDeadline(left.deadline);
      const rightDays = daysUntilDeadline(right.deadline);
      return (leftDays ?? 9999) - (rightDays ?? 9999);
    })
    .slice(0, 4);

  if (!focusedTasks.length) {
    employeeTodayFocusNode.innerHTML = '<div class="empty-state">No active work for today.</div>';
    return;
  }

  employeeTodayFocusNode.innerHTML = focusedTasks.map((task, index) => `
    <article class="focus-card">
      <div class="focus-rank">${index + 1}</div>
      <div class="focus-body">
        <div class="task-card-head">
          <h3>${task.title}</h3>
          <span class="priority-pill priority-${String(task.priority_label || "Low").toLowerCase()}">${task.priority_label}</span>
        </div>
        <p>${task.description || "No description provided."}</p>
        <div class="task-meta">
          <span class="tag">Deadline: ${task.deadline || "Not set"}</span>
          <span class="tag">Status: ${task.status}</span>
          <span class="tag">Score: ${task.priority_score}</span>
        </div>
      </div>
    </article>
  `).join("");
}

function renderAlerts(tasks) {
  const alerts = tasks
    .filter((task) => !["completed", "reassigned"].includes(task.status))
    .map((task) => ({
      task,
      daysLeft: daysUntilDeadline(task.deadline)
    }))
    .filter((item) => item.daysLeft !== null && item.daysLeft <= 2)
    .sort((left, right) => left.daysLeft - right.daysLeft);

  if (!alerts.length) {
    employeeAlertsNode.innerHTML = '<div class="empty-state">No overdue or near-deadline alerts right now.</div>';
    return;
  }

  employeeAlertsNode.innerHTML = alerts.map(({ task, daysLeft }) => {
    const alertClass = daysLeft < 0 ? "alert-danger" : daysLeft === 0 ? "alert-warning" : "alert-soft";
    const alertText = daysLeft < 0
      ? `Overdue by ${Math.abs(daysLeft)} day(s)`
      : daysLeft === 0
        ? "Due today"
        : `Due in ${daysLeft} day(s)`;

    return `
      <article class="alert-card ${alertClass}">
        <div class="task-card-head">
          <h3>${task.title}</h3>
          <span class="priority-pill priority-${String(task.priority_label || "Low").toLowerCase()}">${task.priority_label}</span>
        </div>
        <p>${alertText}</p>
        <div class="task-meta">
          <span class="tag">Deadline: ${task.deadline}</span>
          <span class="tag">Assigned by: ${task.assigned_by_name || task.assigned_by}</span>
        </div>
      </article>
    `;
  }).join("");
}

function redirectToLogin() {
  window.authUtils.clearAuthSession();
  window.location.href = "./login.html";
}

function taskOptions(task) {
  return ["assigned", "in-progress", "completed"]
    .map((option) => `<option value="${option}" ${task.status === option ? "selected" : ""}>${option}</option>`)
    .join("");
}

function renderEmployeeTasks(tasks) {
  const openCount = tasks.filter((task) => !["completed", "reassigned"].includes(task.status)).length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const groupedTasks = PRIORITY_ORDER.map((label) => ({
    label,
    tasks: tasks.filter((task) => (task.priority_label || "Low") === label)
  })).filter((group) => group.tasks.length > 0);

  employeeOpenCountNode.textContent = String(openCount);
  employeeCompletedCountNode.textContent = String(completedCount);
  employeePrioritySummaryNode.innerHTML = PRIORITY_ORDER.map((label) => {
    const count = tasks.filter((task) => (task.priority_label || "Low") === label).length;
    return `
      <div class="summary-chip">
        <span class="summary-label">${label}</span>
        <strong>${count}</strong>
      </div>
    `;
  }).join("");
  renderTodayFocus(tasks);
  renderAlerts(tasks);

  if (!tasks.length) {
    employeeTaskList.innerHTML = '<div class="empty-state">No tasks assigned to you yet.</div>';
    return;
  }

  employeeTaskList.innerHTML = groupedTasks.map((group) => `
    <section class="priority-group priority-group-${group.label.toLowerCase()}">
      <div class="priority-group-head">
        <h3>${group.label} Priority</h3>
        <span class="priority-pill priority-${group.label.toLowerCase()}">${group.tasks.length} task(s)</span>
      </div>
      <div class="priority-group-list">
        ${group.tasks.map((task) => `
          <article class="task-card">
            <div class="task-card-head">
              <h3>${task.title}</h3>
              <span class="task-score">${task.priority_score}</span>
            </div>
            <p>${task.description || "No description provided."}</p>
            <div class="task-meta">
              <span class="tag">Effort: ${task.effort}</span>
              <span class="tag">Impact: ${task.impact}</span>
              <span class="tag">Deadline: ${task.deadline || "Not set"}</span>
              <span class="tag">Assigned by: ${task.assigned_by_name || task.assigned_by}</span>
              <span class="tag">Status: ${task.status}</span>
            </div>
            <div class="task-actions">
              <select data-task-status="${task.id}" ${task.status === "reassigned" ? "disabled" : ""}>
                ${taskOptions(task)}
              </select>
              <button type="button" data-save-id="${task.id}" ${task.status === "reassigned" ? "disabled" : ""}>Save Status</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");
}

async function loadCurrentUser() {
  const session = window.authUtils.getAuthSession();
  if (!session?.token) {
    redirectToLogin();
    return null;
  }

  const data = await window.api.getCurrentUser();
  const user = data.user;

  if (user.role !== "employee") {
    window.location.href = window.authUtils.getDashboardPath(user.role);
    return null;
  }

  nameNode.textContent = user.name;
  emailNode.textContent = user.email;
  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-email").value = user.email;
  document.getElementById("profile-password").value = "";
  dashboardStatus.textContent = "Signed in as employee.";
  return user;
}

async function loadEmployeeTasks() {
  const data = await window.api.getEmployeeTasks();
  renderEmployeeTasks(data.tasks || []);
}

async function bootstrapEmployeeDashboard() {
  dashboardStatus.textContent = "Loading dashboard...";

  try {
    await loadCurrentUser();
    await loadEmployeeTasks();
  } catch (error) {
    dashboardStatus.textContent = error.message;
    redirectToLogin();
  }
}

employeeTaskList?.addEventListener("click", async (event) => {
  const saveButton = event.target.closest("[data-save-id]");
  if (!saveButton) {
    return;
  }

  const taskId = saveButton.dataset.saveId;
  const select = document.querySelector(`[data-task-status="${taskId}"]`);

  try {
    await window.api.updateTask(taskId, { status: select.value });
    dashboardStatus.textContent = "Task status updated.";
    await loadEmployeeTasks();
  } catch (error) {
    dashboardStatus.textContent = error.message;
  }
});

refreshButton?.addEventListener("click", () => {
  loadEmployeeTasks().catch((error) => {
    dashboardStatus.textContent = error.message;
  });
});

profileToggle?.addEventListener("click", () => {
  profilePanel.classList.toggle("hidden");
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  profileStatus.textContent = "Saving profile...";

  try {
    const data = await window.api.updateProfile({
      name: document.getElementById("profile-name").value.trim(),
      email: document.getElementById("profile-email").value.trim(),
      password: document.getElementById("profile-password").value
    });

    window.authUtils.updateAuthUser(data.user, data.token);
    nameNode.textContent = data.user.name;
    emailNode.textContent = data.user.email;
    document.getElementById("profile-password").value = "";
    profileStatus.textContent = data.message;
  } catch (error) {
    profileStatus.textContent = error.message;
  }
});

logoutButton?.addEventListener("click", () => {
  redirectToLogin();
});

bootstrapEmployeeDashboard();
