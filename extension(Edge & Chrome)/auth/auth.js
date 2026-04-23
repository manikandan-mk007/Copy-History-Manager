const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const authTitle = document.getElementById("authTitle");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

let mode = "login";

loginTab.addEventListener("click", () => switchMode("login"));
signupTab.addEventListener("click", () => switchMode("signup"));

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value.trim()
  };

  if (!payload.email || !payload.password) {
    showMessage("Email and password are required", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = mode === "login" ? "Logging in..." : "Signing up...";
  message.textContent = "";

  const response = await chrome.runtime.sendMessage({
    type: mode === "login" ? "LOGIN" : "SIGNUP",
    payload
  });

  if (response.success) {
    const { pushed = 0, restored = 0, syncError } = response.data || {};

    if (syncError) {
      // Auth worked but sync had an issue — still a success, just warn
      showMessage(
        `${mode === "login" ? "Login" : "Signup"} successful. Sync had an issue: ${syncError}`,
        "warn"
      );
    } else if (mode === "login") {
      // Show restore count — this is the key feedback for multi-device
      const parts = [];
      if (pushed > 0) parts.push(`${pushed} item${pushed !== 1 ? "s" : ""} backed up`);
      if (restored > 0) parts.push(`${restored} item${restored !== 1 ? "s" : ""} restored from cloud`);
      const detail = parts.length ? ` — ${parts.join(", ")}` : "";
      showMessage(`Login successful${detail}`, "success");
    } else {
      showMessage(
        `Account created. ${pushed > 0 ? `${pushed} local item${pushed !== 1 ? "s" : ""} backed up.` : ""}`,
        "success"
      );
    }

    setTimeout(() => window.close(), 2000);
  } else {
    showMessage(response.error || "Authentication failed", "error");
  }

  submitBtn.disabled = false;
  submitBtn.textContent = mode === "login" ? "Login" : "Signup";
});

function switchMode(nextMode) {
  mode = nextMode;

  if (mode === "login") {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    authTitle.textContent = "Login";
    submitBtn.textContent = "Login";
  } else {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    authTitle.textContent = "Signup";
    submitBtn.textContent = "Signup";
  }

  message.textContent = "";
  message.className = "message";
}

function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `message ${type}`;
}
