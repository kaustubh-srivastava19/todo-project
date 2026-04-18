let isLogin = true;

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

window.handleAuth = async function () {
  console.log("Button clicked");
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const url = isLogin ? "/api/auth/login" : "/api/auth/signup";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.errors?.[0]?.msg || data.message || "Auth failed");
      return;
    }

    if (isLogin) {
      window.location.href = "index.html";
    } else {
      alert("Account created. Please login.");
      toggleAuth();
    }

  } catch (err) {
    console.error("Auth error:", err);
  }
};