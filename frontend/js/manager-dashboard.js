const dashboardStatus = document.getElementById("dashboard-status");
const nameNode = document.getElementById("user-name");
const emailNode = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const employeeSelect = document.getElementById("assigned-to");
const taskForm = document.getElementById("task-form");
const taskStatus = document.getElementById("task-status");
const managerTaskList = document.getElementById("manager-task-list");
const refreshButton = document.getElementById("refresh-manager-tasks");
const voiceButton = document.getElementById("voice-button");
const voiceTextNode = document.getElementById("voice-text");
const profileToggle = document.getElementById("profile-toggle");
const profilePanel = document.getElementById("profile-panel");
const profileForm = document.getElementById("profile-form");
const profileStatus = document.getElementById("profile-status");
const managerTotalTasksNode = document.getElementById("manager-total-tasks");
const managerCompletedTasksNode = document.getElementById("manager-completed-tasks");
const managerTaskSummaryNode = document.getElementById("manager-task-summary");
const managerWorkloadBoardNode = document.getElementById("manager-workload-board");
const managerCompletionRateNode = document.getElementById("manager-completion-rate");
const managerCompletionBarNode = document.getElementById("manager-completion-bar");
const managerPriorityVisibilityNode = document.getElementById("manager-priority-visibility");
let managerEmployees = [];

function redirectToLogin() {
  window.authUtils.clearAuthSession();
  window.location.href = "./login.html";
}

function renderManagerTasks(tasks) {
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const highPriorityCount = tasks.filter((task) => ["High", "Critical"].includes(task.priority_label)).length;
  const pendingCount = tasks.filter((task) => task.status === "assigned").length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const priorityBreakdown = ["Critical", "High", "Medium", "Low"].map((label) => ({
    label,
    count: tasks.filter((task) => (task.priority_label || "Low") === label).length
  }));
  const workloadByEmployee = Object.values(
    tasks.reduce((accumulator, task) => {
      const key = task.assigned_to_name || `Employee ${task.assigned_to}`;
      if (!accumulator[key]) {
        accumulator[key] = {
          name: key,
          total: 0,
          open: 0,
          highPriority: 0
        };
      }

      accumulator[key].total += 1;
      if (task.status !== "completed") {
        accumulator[key].open += 1;
      }
      if (["High", "Critical"].includes(task.priority_label)) {
        accumulator[key].highPriority += 1;
      }
      return accumulator;
    }, {})
  );

  managerTotalTasksNode.textContent = String(tasks.length);
  managerCompletedTasksNode.textContent = String(completedCount);
  managerCompletionRateNode.textContent = `${completionRate}%`;
  managerCompletionBarNode.style.width = `${completionRate}%`;
  managerTaskSummaryNode.innerHTML = `
    <div class="summary-chip">
      <span class="summary-label">High Focus</span>
      <strong>${highPriorityCount}</strong>
    </div>
    <div class="summary-chip">
      <span class="summary-label">Pending</span>
      <strong>${pendingCount}</strong>
    </div>
    <div class="summary-chip">
      <span class="summary-label">Completed</span>
      <strong>${completedCount}</strong>
    </div>
  `;
  managerPriorityVisibilityNode.innerHTML = priorityBreakdown.map((item) => `
    <div class="summary-chip">
      <span class="summary-label">${item.label}</span>
      <strong>${item.count}</strong>
    </div>
  `).join("");
  managerWorkloadBoardNode.innerHTML = workloadByEmployee.length
    ? workloadByEmployee.map((employee) => `
      <article class="workload-card">
        <div class="task-card-head">
          <h3>${employee.name}</h3>
          <span class="task-score">${employee.total}</span>
        </div>
        <div class="task-meta">
          <span class="tag">Open: ${employee.open}</span>
          <span class="tag">High Priority: ${employee.highPriority}</span>
          <span class="tag">Total Assigned: ${employee.total}</span>
        </div>
      </article>
    `).join("")
    : '<div class="empty-state">No workload data available yet.</div>';

  if (!tasks.length) {
    managerTaskList.innerHTML = '<div class="empty-state">No tasks assigned yet.</div>';
    return;
  }

  const employeeOptions = managerEmployees.map((employee) => `
    <option value="${employee.id}">${employee.name}</option>
  `).join("");

  managerTaskList.innerHTML = tasks.map((task) => `
    <article class="task-card">
      <div class="task-card-head">
        <h3>${task.title}</h3>
        <span class="priority-pill priority-${String(task.priority_label || "Low").toLowerCase()}">${task.priority_label}</span>
      </div>
      <p>${task.description || "No description provided."}</p>
      <div class="task-meta">
        <span class="tag">Assigned to: ${task.assigned_to_name || task.assigned_to}</span>
        <span class="tag">Priority: ${task.priority_label} (${task.priority_score})</span>
        <span class="tag">Status: ${task.status}</span>
        <span class="tag">Deadline: ${task.deadline || "Not set"}</span>
      </div>
      <div class="task-timeline">
        ${(task.assignment_history || []).map((assignment) => `
          <span class="timeline-chip">
            ${assignment.assigned_to_name || assignment.assigned_to} • ${assignment.status}
          </span>
        `).join("")}
      </div>
      <div class="task-actions">
        <select data-reassign-select="${task.id}">
          <option value="">Reassign to...</option>
          ${employeeOptions}
        </select>
        <button type="button" data-reassign-id="${task.id}" class="secondary">Reassign</button>
        <button type="button" data-delete-id="${task.id}" class="secondary">Delete</button>
      </div>
    </article>
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

  if (user.role !== "manager") {
    window.location.href = window.authUtils.getDashboardPath(user.role);
    return null;
  }

  nameNode.textContent = user.name;
  emailNode.textContent = user.email;
  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-email").value = user.email;
  document.getElementById("profile-password").value = "";
  dashboardStatus.textContent = "Signed in as manager.";
  return user;
}

async function loadEmployees() {
  const data = await window.api.getEmployees();
  const employees = data.employees || [];
  managerEmployees = employees;

  employeeSelect.innerHTML = employees.length
    ? employees.map((employee) => `<option value="${employee.id}">${employee.name} (${employee.email})</option>`).join("")
    : '<option value="">No employees found</option>';
}

async function loadManagerTasks() {
  const data = await window.api.getManagerTasks();
  renderManagerTasks(data.tasks || []);
}

async function bootstrapManagerDashboard() {
  dashboardStatus.textContent = "Loading dashboard...";

  try {
    await loadCurrentUser();
    await loadEmployees();
    await loadManagerTasks();
  } catch (error) {
    dashboardStatus.textContent = error.message;
    redirectToLogin();
  }
}

taskForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  taskStatus.textContent = "Creating task...";

  const payload = {
    assigned_to: employeeSelect.value,
    title: document.getElementById("task-title").value.trim(),
    description: document.getElementById("task-description").value.trim(),
    deadline: document.getElementById("task-deadline").value || null,
    effort: document.getElementById("task-effort").value,
    impact: document.getElementById("task-impact").value,
    workload: Number(document.getElementById("task-workload").value || 5),
    category: document.getElementById("task-category").value.trim() || "General",
    voice_text: voiceTextNode.value.trim()
  };

  try {
    const data = await window.api.createTask(payload);
    taskStatus.textContent = `${data.message} Priority: ${data.task.priority_label} (${data.task.priority_score}).`;
    taskForm.reset();
    await loadEmployees();
    await loadManagerTasks();
  } catch (error) {
    taskStatus.textContent = error.message;
  }
});

refreshButton?.addEventListener("click", () => {
  loadManagerTasks().catch((error) => {
    taskStatus.textContent = error.message;
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

managerTaskList?.addEventListener("click", async (event) => {
  const reassignButton = event.target.closest("[data-reassign-id]");
  const deleteButton = event.target.closest("[data-delete-id]");

  if (reassignButton) {
    const taskId = reassignButton.dataset.reassignId;
    const select = document.querySelector(`[data-reassign-select="${taskId}"]`);

    if (!select?.value) {
      taskStatus.textContent = "Select an employee before reassigning.";
      return;
    }

    try {
      const data = await window.api.reassignTask({
        task_id: Number(taskId),
        new_employee_id: Number(select.value)
      });
      taskStatus.textContent = `${data.message} New assignee: ${data.new_assigned_to_name}.`;
      await loadManagerTasks();
    } catch (error) {
      taskStatus.textContent = error.message;
    }
    return;
  }

  if (!deleteButton) {
    return;
  }

  try {
    await window.api.deleteTask(deleteButton.dataset.deleteId);
    await loadManagerTasks();
    taskStatus.textContent = "Task deleted successfully.";
  } catch (error) {
    taskStatus.textContent = error.message;
  }
});

voiceButton?.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    taskStatus.textContent = "Speech recognition is not supported in this browser.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  taskStatus.textContent = "Listening for voice input...";

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    voiceTextNode.value = transcript;
    taskStatus.textContent = "Voice captured. Parsing task details...";

    try {
      const data = await window.api.parseVoice(transcript);
      document.getElementById("task-title").value = data.parsed.title || "";
      document.getElementById("task-description").value = data.parsed.description || "";
      document.getElementById("task-deadline").value = data.parsed.deadline || "";
      document.getElementById("task-category").value = data.parsed.category || "";
      taskStatus.textContent = "Voice parsed. Review and submit the task.";
    } catch (error) {
      taskStatus.textContent = `Voice captured but parsing failed: ${error.message}`;
    }
  };

  recognition.onerror = (event) => {
    taskStatus.textContent = `Voice input error: ${event.error}`;
  };

  recognition.start();
});

logoutButton?.addEventListener("click", () => {
  redirectToLogin();
});

bootstrapManagerDashboard();
