const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

const existingSession = window.authUtils.getAuthSession();
if (existingSession?.user?.role && existingSession?.token) {
  window.authUtils.fetchCurrentUser()
    .then((user) => {
      if (user) {
        window.location.href = window.authUtils.getDashboardPath(user.role);
      } else {
        window.authUtils.clearAuthSession();
      }
    })
    .catch(() => {
      window.authUtils.clearAuthSession();
    });
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Signing you in...";

  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  };

  try {
    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    window.authUtils.setAuthSession({
      token: data.token,
      user: data.user
    });

    loginStatus.textContent = "Login successful. Redirecting...";
    window.location.href = window.authUtils.getDashboardPath(data.user.role);
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});
