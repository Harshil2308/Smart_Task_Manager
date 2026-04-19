const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");

const savedSession = window.authUtils.getAuthSession();
if (savedSession?.user?.role) {
  window.location.href = window.authUtils.getDashboardPath(savedSession.user.role);
}

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerStatus.textContent = "Creating account...";

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    role: document.getElementById("role").value
  };

  try {
    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed.");
    }

    window.authUtils.setAuthSession({
      token: data.token,
      user: data.user
    });

    registerStatus.textContent = "Account created. Redirecting...";
    window.location.href = window.authUtils.getDashboardPath(data.user.role);
  } catch (error) {
    registerStatus.textContent = error.message;
  }
});
