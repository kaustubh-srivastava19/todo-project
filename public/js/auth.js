console.log("auth.js loaded");

// ===============================
// VALIDATION HELPERS
// ===============================
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function setFieldError(fieldId, errorId, message) {
  const inputEl = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  if (inputEl) {
    inputEl.classList.add("input-error");
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }
}

function clearFieldError(fieldId, errorId) {
  const inputEl = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  if (inputEl) {
    inputEl.classList.remove("input-error");
  }
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
}

function clearAllSignupErrors() {
  clearFieldError("signup-firstname", "signup-firstname-error");
  clearFieldError("signup-lastname", "signup-lastname-error");
  clearFieldError("signup-email", "signup-email-error");
  clearFieldError("signup-password", "signup-password-error");
  const genError = document.getElementById("signup-general-error");
  if (genError) {
    genError.textContent = "";
    genError.style.display = "none";
  }
}

function clearAllLoginErrors() {
  clearFieldError("login-email", "login-email-error");
  clearFieldError("login-password", "login-password-error");
  const genError = document.getElementById("login-general-error");
  if (genError) {
    genError.textContent = "";
    genError.style.display = "none";
  }
}

// ===============================
// SIGNUP
// ===============================
async function handleSignup() {
  try {
    clearAllSignupErrors();

    const firstNameInput = document.getElementById("signup-firstname");
    const lastNameInput = document.getElementById("signup-lastname");
    const emailInput = document.getElementById("signup-email");
    const passwordInput = document.getElementById("signup-password");

    const firstName = firstNameInput ? firstNameInput.value.trim() : "";
    const lastName = lastNameInput ? lastNameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    let hasError = false;
    let firstErrorField = null;

    if (!firstName) {
      setFieldError("signup-firstname", "signup-firstname-error", "First name is required");
      hasError = true;
      if (!firstErrorField) firstErrorField = firstNameInput;
    }

    if (!lastName) {
      setFieldError("signup-lastname", "signup-lastname-error", "Last name is required");
      hasError = true;
      if (!firstErrorField) firstErrorField = lastNameInput;
    }

    if (!email) {
      setFieldError("signup-email", "signup-email-error", "Email is required");
      hasError = true;
      if (!firstErrorField) firstErrorField = emailInput;
    } else if (!isValidEmail(email)) {
      setFieldError("signup-email", "signup-email-error", "Please enter a valid email address");
      hasError = true;
      if (!firstErrorField) firstErrorField = emailInput;
    }

    if (!password) {
      setFieldError("signup-password", "signup-password-error", "Password is required");
      hasError = true;
      if (!firstErrorField) firstErrorField = passwordInput;
    } else if (password.length < 12) {
      setFieldError("signup-password", "signup-password-error", "Password must be at least 12 characters");
      hasError = true;
      if (!firstErrorField) firstErrorField = passwordInput;
    } else if (!/[A-Z]/.test(password)) {
      setFieldError("signup-password", "signup-password-error", "Password must include at least one uppercase letter");
      hasError = true;
      if (!firstErrorField) firstErrorField = passwordInput;
    } else if (!/[0-9]/.test(password)) {
      setFieldError("signup-password", "signup-password-error", "Password must include at least one number");
      hasError = true;
      if (!firstErrorField) firstErrorField = passwordInput;
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      setFieldError("signup-password", "signup-password-error", "Password must include at least one special character");
      hasError = true;
      if (!firstErrorField) firstErrorField = passwordInput;
    }

    if (hasError) {
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    const signupBtn = document.getElementById("signup-btn");
    if (signupBtn) {
      signupBtn.disabled = true;
      signupBtn.textContent = "Creating account...";
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (signupBtn) {
        signupBtn.disabled = false;
        signupBtn.textContent = "Sign Up";
      }

      if (data.message && data.message.toLowerCase().includes("user already exists")) {
        setFieldError("signup-email", "signup-email-error", "An account with this email already exists");
        if (emailInput) emailInput.focus();
      } else if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err) => {
          const field = err.path || err.param;
          if (field === "firstName") setFieldError("signup-firstname", "signup-firstname-error", err.msg);
          else if (field === "lastName") setFieldError("signup-lastname", "signup-lastname-error", err.msg);
          else if (field === "email") setFieldError("signup-email", "signup-email-error", err.msg);
          else if (field === "password") setFieldError("signup-password", "signup-password-error", err.msg);
        });
      } else {
        const genError = document.getElementById("signup-general-error");
        if (genError) {
          genError.textContent = data.message || "Signup failed. Please try again.";
          genError.style.display = "block";
        }
      }
      return;
    }

    // Redirect directly to home page without modal popup
    window.location.replace("/");

  } catch (err) {
    console.error("Signup error:", err);
    const signupBtn = document.getElementById("signup-btn");
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = "Sign Up";
    }
    const genError = document.getElementById("signup-general-error");
    if (genError) {
      genError.textContent = "An error occurred during signup. Please try again.";
      genError.style.display = "block";
    }
  }
}

// ===============================
// LOGIN
// ===============================
async function handleLogin() {
  try {
    clearAllLoginErrors();

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    let hasError = false;
    let firstErrorField = null;

    if (!email) {
      setFieldError("login-email", "login-email-error", "Email is required");
      hasError = true;
      if (!firstErrorField) firstErrorField = emailInput;
    } else if (!isValidEmail(email)) {
      setFieldError("login-email", "login-email-error", "Please enter a valid email address");
      hasError = true;
      if (!firstErrorField) firstErrorField = emailInput;
    }

    if (!password) {
      setFieldError("login-password", "login-password-error", "Password is required");
      hasError = true;
      if (!firstErrorField) firstErrorField = passwordInput;
    }

    if (hasError) {
      if (firstErrorField) firstErrorField.focus();
      return;
    }

    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }

      const genError = document.getElementById("login-general-error");
      if (genError) {
        genError.textContent = data.message || "Invalid credentials";
        genError.style.display = "block";
      }
      return;
    }

    window.location.replace("/");

  } catch (err) {
    console.error("Login error:", err);
    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
    const genError = document.getElementById("login-general-error");
    if (genError) {
      genError.textContent = "An error occurred during login. Please try again.";
      genError.style.display = "block";
    }
  }
}

// ===============================
// CHECK SESSION
// ===============================
async function checkSession() {
  try {
    const res = await fetch("/api/auth/status", {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();

      if (
        data.success &&
        data.data &&
        data.data.authenticated
      ) {
        window.location.replace("/");
      }
    }

  } catch (err) {
    console.error("Check session error:", err);
  }
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme or system preference
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }

  checkSession();

  // Attach input clearing on user type
  const attachInputClearing = (fieldId, errorId) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.addEventListener("input", () => {
        clearFieldError(fieldId, errorId);
        const genError = document.getElementById("signup-general-error");
        if (genError) {
          genError.textContent = "";
          genError.style.display = "none";
        }
        const loginGenError = document.getElementById("login-general-error");
        if (loginGenError) {
          loginGenError.textContent = "";
          loginGenError.style.display = "none";
        }
      });
    }
  };

  attachInputClearing("signup-firstname", "signup-firstname-error");
  attachInputClearing("signup-lastname", "signup-lastname-error");
  attachInputClearing("signup-email", "signup-email-error");
  attachInputClearing("signup-password", "signup-password-error");
  attachInputClearing("login-email", "login-email-error");
  attachInputClearing("login-password", "login-password-error");

  // Signup button click
  document
    .getElementById("signup-btn")
    ?.addEventListener("click", handleSignup);

  // Login button click
  document
    .getElementById("login-btn")
    ?.addEventListener("click", handleLogin);

  // Allow enter key submission
  const signupInputs = [
    "signup-firstname",
    "signup-lastname",
    "signup-email",
    "signup-password",
  ];
  signupInputs.forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSignup();
      }
    });
  });

  const loginInputs = ["login-email", "login-password"];
  loginInputs.forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLogin();
      }
    });
  });

  // Switch between Login and Signup
  document
    .getElementById("show-login")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      clearAllSignupErrors();
      clearAllLoginErrors();
      document.getElementById("signup-form").style.display = "none";
      document.getElementById("login-form").style.display = "block";
    });

  document
    .getElementById("show-signup")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      clearAllSignupErrors();
      clearAllLoginErrors();
      document.getElementById("login-form").style.display = "none";
      document.getElementById("signup-form").style.display = "block";
    });
});