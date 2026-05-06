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
    toggleText.innerHTML =
      `Don't have an account?
       <button onclick="toggleAuth()">Sign up</button>`;
  } else {
    heading.innerText = "Sign Up";
    button.innerText = "Sign Up";
    toggleText.innerHTML =
      `Already have an account?
       <button onclick="toggleAuth()">Login</button>`;
  }
};

// VALIDATION HELPERS
function isValidEmail(email) {
  // simple but effective email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  // min 12 chars (as per your backend)
  return password.length >= 12;
}// HANDLE AUTH
window.handleAuth = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  
  if (!email || !password) {
    return alert("Email and password are required");
  }

  if (!isValidEmail(email)) {
    return alert("Please enter a valid email address");
  }

  if (!isLogin && !isValidPassword(password)) {
    return alert("Password must be at least 12 characters long");
  }

  // ===============================
  // API CALL
  // ===============================
  const url = isLogin ? "/api/login" : "/api/signup";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      const message =
        data?.errors?.[0]?.msg ||
        data?.message ||
        "Authentication failed";

      return alert(message);
    }

    if (isLogin) {
      window.location.href = "index.html";
    } else {
      alert("Account created successfully. Please login.");
      toggleAuth();
    }

  } catch (err) {
    console.error("Auth error:", err);
    alert("Something went wrong. Please try again.");
  }
};