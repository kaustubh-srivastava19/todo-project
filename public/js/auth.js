console.log("auth.js loaded");

let isLogin = true;

// ===============================
// TOGGLE LOGIN / SIGNUP UI
// ===============================
window.toggleAuth = function () {
  isLogin = !isLogin;

  const heading = document.querySelector("h2");
  const button = document.getElementById("authButton");
  const toggleText = document.getElementById("toggleText");

  if (isLogin) {
    heading.innerText = "Login";
    button.innerText = "Login";

    toggleText.innerHTML = `
      Don't have an account?
      <button type="button" class="switch-btn" id="toggleBtn">
        Sign up
      </button>
    `;
  } else {
    heading.innerText = "Sign Up";
    button.innerText = "Sign Up";

    toggleText.innerHTML = `
      Already have an account?
      <button type="button" class="switch-btn" id="toggleBtn">
        Login
      </button>
    `;
  }

  // Re-bind event after innerHTML replacement
  document
    .getElementById("toggleBtn")
    .addEventListener("click", toggleAuth);
};

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
// HANDLE AUTH
// ===============================
window.handleAuth = async function () {
  console.log("handleAuth called");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  if (!isValidEmail(email)) {
    alert("Please enter a valid email");
    return;
  }

  if (!isLogin && !isValidPassword(password)) {
    alert("Password must be at least 12 characters");
    return;
  }

  const url = isLogin
    ? "/api/auth/login"
    : "/api/auth/signup";

  try {
    const res = await fetch(url, {
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

    console.log("API response:", data);

    if (!res.ok) {
      alert(data.message || "Authentication failed");
      return;
    }

    if (isLogin) {
      window.location.href = "/";
    } else {
      alert("Signup successful. Please login.");
      toggleAuth();
    }

  } catch (err) {
    console.error("Auth error:", err);
    alert("Something went wrong");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const authButton = document.getElementById("authButton");

  authButton.addEventListener("click", handleAuth);

 document
    .getElementById("toggleBtn")
    .addEventListener("click", toggleAuth);
});