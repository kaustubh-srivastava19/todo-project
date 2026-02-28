let isLogin = true;

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authBtn = document.getElementById("authBtn");
const title = document.getElementById("title");

authBtn.addEventListener("click", handleAuth);

function toggleAuth() {
  isLogin = !isLogin;

  title.innerText = isLogin ? "Login" : "Sign Up";
  authBtn.innerText = isLogin ? "Login" : "Sign Up";
}

async function handleAuth() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Please fill all fields");
    return;
  }

  const url = isLogin ? "/api/login" : "/api/signup";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Authentication failed");
      return;
    }

    localStorage.setItem("token", data.token);
    window.location.href = "index.html";

  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
}
