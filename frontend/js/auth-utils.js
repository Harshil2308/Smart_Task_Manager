(function () {
  const storageKey = "task_ai_auth";

  function storage() {
    try {
      return window.localStorage;
    } catch (error) {
      return window.sessionStorage;
    }
  }

  function setAuthSession(session) {
    storage().setItem(storageKey, JSON.stringify(session));
  }

  function getAuthSession() {
    const raw = storage().getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      storage().removeItem(storageKey);
      return null;
    }
  }

  function clearAuthSession() {
    storage().removeItem(storageKey);
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

    try {
      const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      clearAuthSession();
      return null;
    }
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
