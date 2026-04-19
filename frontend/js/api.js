(function () {
  async function apiFetch(path, options = {}) {
    const session = window.authUtils.getAuthSession();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && window.authUtils) {
        window.authUtils.clearAuthSession();
      }
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  window.api = {
    createTask(payload) {
      return apiFetch("/tasks/create", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    reassignTask(payload) {
      return apiFetch("/manager/reassign-task", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    deleteTask(id) {
      return apiFetch(`/tasks/${id}`, { method: "DELETE" });
    },
    getCurrentUser() {
      return apiFetch("/auth/me");
    },
    updateProfile(payload) {
      return apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    getEmployeeTasks() {
      return apiFetch("/tasks");
    },
    getEmployees() {
      return apiFetch("/manager/employees");
    },
    getManagerTasks() {
      return apiFetch("/manager/team-tasks");
    },
    parseVoice(voiceText) {
      return apiFetch("/tasks/parse-voice", {
        method: "POST",
        body: JSON.stringify({ voice_text: voiceText })
      });
    },
    updateTask(id, payload) {
      return apiFetch(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    }
  };
})();
