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
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const url = isLogin ? "/api/login" : "/api/signup";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include"   // IMPORTANT
  });

  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }

  if (isLogin) {
    window.location.href = "index.html";
  } else {
    alert("Account created. Please login.");
    toggleAuth();
  }
};