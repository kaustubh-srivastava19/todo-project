console.log("auth.js loaded");

// ===============================
// VALIDATION HELPERS
// ===============================
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 12;
}

// ===============================
// SIGNUP
// ===============================
async function handleSignup() {
  try {
    const firstName =
      document.getElementById("signup-firstname").value.trim();

    const lastName =
      document.getElementById("signup-lastname").value.trim();

    const email =
      document.getElementById("signup-email").value.trim();

    const password =
      document.getElementById("signup-password").value.trim();

    if (!firstName || !lastName || !email || !password) {
      alert("All fields are required");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email");
      return;
    }

    if (!isValidPassword(password)) {
      alert("Password must be at least 12 characters");
      return;
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
      alert(data.message || "Signup failed");
      return;
    }

    alert("Signup successful. Please login.");

    document.getElementById("signup-form").style.display = "none";
    document.getElementById("login-form").style.display = "block";

  } catch (err) {
    console.error("Signup error:", err);
    alert("Something went wrong");
  }
}

// ===============================
// LOGIN
// ===============================
async function handleLogin() {
  try {
    const email =
      document.getElementById("login-email").value.trim();

    const password =
      document.getElementById("login-password").value.trim();

    if (!email || !password) {
      alert("Email and password are required");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email");
      return;
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
      alert(data.message || "Login failed");
      return;
    }

    window.location.replace("/");

  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong");
  }
}

// ===============================
// CHECK SESSION
// ===============================
async function checkSession() {
  try {
    const res = await fetch("/api/auth/check", {
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

  document
    .getElementById("signup-btn")
    ?.addEventListener("click", handleSignup);

  document
    .getElementById("login-btn")
    ?.addEventListener("click", handleLogin);

  document
    .getElementById("show-login")
    ?.addEventListener("click", (e) => {
      e.preventDefault();

      document.getElementById("signup-form").style.display = "none";
      document.getElementById("login-form").style.display = "block";
    });

  document
    .getElementById("show-signup")
    ?.addEventListener("click", (e) => {
      e.preventDefault();

      document.getElementById("login-form").style.display = "none";
      document.getElementById("signup-form").style.display = "block";
    });

});