let allTodos = [];

/* ================= ERROR ================= */

function showError(message) {
  let errorDiv = document.getElementById("error-message");

  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "error-message";
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 18px;
      border-radius: 8px;
      z-index: 999;
      font-size: 14px;
    `;
    document.body.appendChild(errorDiv);
  }

  errorDiv.textContent = message;

  setTimeout(() => {
    errorDiv.textContent = "";
  }, 3000);
}

/* ================= API ================= */

async function apiFetch(url, options = {}) {
  try {
    const csrfToken =
      document.cookie
        .split("; ")
        .find(row => row.startsWith("csrfToken="))
        ?.split("=")[1] || "";

    console.log("csrf token:", csrfToken);

    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
        ...(options.headers || {}),
      },
      ...options,
    });

    if (res.status === 401) {
      showError("Session expired");
      setTimeout(() => {
        window.location.href = "/auth.html";
      }, 1000);
      return null;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      showError(data.message || "Something went wrong");
      return null;
    }

    return data;

  } catch (err) {
    showError("Network error");
    return null;
  }
}

/* ================= LOAD ================= */

async function loadTodos() {
  const result = await apiFetch("/api/todos");

  if (!result) return;

  allTodos = result.data || [];
  renderTodos(allTodos);
}

/* ================= RENDER ================= */

function renderTodos(todos) {
  const list = document.getElementById("todo-list");

  if (!list) return;

  list.innerHTML = "";

  if (todos.length === 0) {
    list.innerHTML = `<p style="color:#666;">No tasks found</p>`;
    return;
  }

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    const text = document.createElement("span");
    text.textContent = todo.text;
    if (todo.completed) text.classList.add("completed");

    const actions = document.createElement("div");

    const toggleBtn = document.createElement("button");
    toggleBtn.innerText = todo.completed ? "↩" : "✔";
    toggleBtn.className = "edit-btn";
    toggleBtn.onclick = () => toggleTodo(todo._id);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "🗑";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = () => deleteTodo(todo._id);

    actions.append(toggleBtn, deleteBtn);

    li.append(text, actions);

    list.appendChild(li);
  });
}

/* ================= CREATE ================= */

async function createTodo() {
  const input = document.getElementById("todo-input");

  if (!input) return;

  const text = input.value.trim();

  if (!text) {
    showError("Enter task");
    return;
  }

  const result = await apiFetch("/api/todos", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  if (!result) return;

  input.value = "";
  loadTodos();
}

/* ================= DELETE ================= */

async function deleteTodo(id) {
  const result = await apiFetch(`/api/todos/${id}`, {
    method: "DELETE",
  });

  if (!result) return;

  loadTodos();
}

/* ================= TOGGLE ================= */

async function toggleTodo(id) {
  const result = await apiFetch(`/api/todos/${id}/toggle`, {
    method: "PATCH",
  });

  if (!result) return;

  loadTodos();
}

/* ================= FILTER ================= */

function filterTodos(type) {
  if (type === "all") return renderTodos(allTodos);

  if (type === "completed") {
    return renderTodos(allTodos.filter((t) => t.completed));
  }

  if (type === "pending") {
    return renderTodos(allTodos.filter((t) => !t.completed));
  }

  const today = new Date().toDateString();

  if (type === "today") {
    return renderTodos(
      allTodos.filter((t) =>
        t.dueDate &&
        new Date(t.dueDate).toDateString() === today
      )
    );
  }
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  loadTodos();

  document.getElementById("add-btn")?.addEventListener("click", createTodo);

  document.getElementById("todo-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") createTodo();
  });

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filterTodos(btn.dataset.filter);
    });
  });

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await apiFetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/auth.html";
  });
});