(function () {
  const storageKey = "task_ai_auth";
  localStorage.removeItem(storageKey);

  function setAuthSession(session) {
    sessionStorage.setItem(storageKey, JSON.stringify(session));
  }

  function getAuthSession() {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      sessionStorage.removeItem(storageKey);
      return null;
    }
  }

  function clearAuthSession() {
    sessionStorage.removeItem(storageKey);
  }

  function updateAuthUser(user, token) {
    const current = getAuthSession();
    if (!current) {
      return;
    }

    setAuthSession({
      token: token || current.token,
      user
    });
  }

  function getDashboardPath(role) {
    return role === "manager" ? "./manager-dashboard.html" : "./employee-dashboard.html";
  }

  async function fetchCurrentUser() {
    const session = getAuthSession();
    if (!session || !session.token) {
      return null;
    }

    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    });

    if (!response.ok) {
      throw new Error("Unable to fetch current user.");
    }

    const data = await response.json();
    return data.user;
  }

  window.authUtils = {
    clearAuthSession,
    fetchCurrentUser,
    getAuthSession,
    getDashboardPath,
    setAuthSession,
    updateAuthUser
  };
})();
