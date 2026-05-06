let allTodos = [];

// ERROR HANDLING UI
function showError(message) {
  let errorDiv = document.getElementById("error-message");

  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "error-message";
    errorDiv.style.color = "red";
    errorDiv.style.margin = "10px";
    document.body.prepend(errorDiv);
  }

  errorDiv.innerText = message;

  setTimeout(() => {
    errorDiv.innerText = "";
  }, 3000);
}

// API WRAPPER 
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    // ✅ Session expired
    if (res.status === 401) {
      showError("Session expired. Redirecting to login...");
      
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
    showError("Network error. Check your connection.");
    return null;
  }
}
// LOAD TODOS
async function loadTodos() {
  const result = await apiFetch("/api/todos");
  if (!result) return;

  allTodos = result.data;
  renderTodos(allTodos);
}
// RENDER TODOS
function renderTodos(todos) {
  const list = document.getElementById("todo-list");
  list.innerHTML = "";

  todos.forEach((todo) => {
    const li = document.createElement("li");

    // Make item focusable
    li.setAttribute("tabindex", "0");

    const textSpan = document.createElement("span");
    textSpan.textContent = todo.text;
    textSpan.style.textDecoration = todo.completed ? "line-through" : "none";

    // Toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "✔";
    toggleBtn.setAttribute("aria-label", "Mark todo as complete");
    toggleBtn.className = "toggleBtn";

    toggleBtn.onclick = () => toggleTodo(todo._id, toggleBtn);

    // Keyboard support
    toggleBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleTodo(todo._id, toggleBtn);
      }
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑";
    deleteBtn.setAttribute("aria-label", "Delete todo");
    deleteBtn.className = "deleteBtn";

    deleteBtn.onclick = () => deleteTodo(todo._id, deleteBtn);

    // Keyboard support
    deleteBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        deleteTodo(todo._id, deleteBtn);
      }
    });

    li.appendChild(textSpan);
    li.appendChild(toggleBtn);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

// CREATE TODO
async function createTodo() {
  const input = document.getElementById("todo-input");
  const submitBtn = document.getElementById("add-btn");
  const text = input.value.trim();

  if (!text) {
    showError("Todo text required");
    return;
  }
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Saving...";
   try {
  const result = await apiFetch("/api/todos", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  if (!result) return;

  input.value = "";
  loadTodos();
} finally {
    // ✅ Always reset
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}
// DELETE TODO
async function deleteTodo(id, btn) {
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Deleting...";
  try {
  const result = await apiFetch(`/api/todos/${id}`, {
    method: "DELETE",
  });

  if (!result) return;

  loadTodos();
}  finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}
// TOGGLE TODO
async function toggleTodo(id, btn) {
    btn.disabled = true;

  try {
  const result = await apiFetch(`/api/todos/${id}/toggle`, {
    method: "PATCH",
  });

  if (!result) return;

  loadTodos();
}  finally {
    btn.disabled = false;
  }
}

// UPDATE TODO
async function updateTodo(id, newText) {
  const result = await apiFetch(`/api/todos/${id}`, {
    method: "PUT",
    body: JSON.stringify({ text: newText }),
  });

  if (!result) return;

  loadTodos();
}

// FILTER TODOS (LOCAL FILTERING)
function filterTodos(type) {
  const now = new Date();

  const filtered = allTodos.filter((todo) => {
    if (type === "completed") return todo.completed;

    if (type === "pending") return !todo.completed;

    if (type === "today") {
      if (!todo.dueDate) return false;
      const due = new Date(todo.dueDate);
      return due.toDateString() === now.toDateString();
    }

    return true; // all
  });

  renderTodos(filtered);
}
// INIT
document.addEventListener("DOMContentLoaded", loadTodos);