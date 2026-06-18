let allTodos = [];

/* ================= TOAST NOTIFICATIONS ================= */

function showToast(message, type = "error") {
  const colors = {
    error: "#ef4444",
    success: "#10b981",
    info: "#2563eb",
  };

  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 13px 20px;
      border-radius: 10px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.style.background = colors[type] || colors.error;
  toast.textContent = message;

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
  }, 3000);
}

/* ================= PROFILE ================= */

async function loadProfile() {
  try {
    const result = await apiFetch("/api/auth/me");

    if (!result) {
      showToast("Unable to fetch profile", "error");
      return;
    }

    const user = result.data;

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    document.getElementById("profileBadge").textContent =
      getInitials(fullName || user.email);

    document.getElementById("profileName").textContent = fullName || "User";
    document.getElementById("profileEmail").textContent = user.email;

  } catch (err) {
    console.error(err);
    showToast("Unable to fetch profile", "error");
  }
}

function getInitials(value) {
  if (!value) return "?";
  if (value.includes("@")) return value.substring(0, 2).toUpperCase();

  const words = value.trim().split(" ");
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/* ================= API ================= */

async function apiFetch(url, options = {}) {
  try {
    const csrfToken =
      document.cookie
        .split("; ")
        .find(row => row.startsWith("csrfToken="))
        ?.split("=")[1] || "";

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
      showToast("Session expired. Redirecting...", "error");
      setTimeout(() => {
        window.location.replace("/auth.html");
      }, 1000);
      return null;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      showToast(data.message || "Something went wrong", "error");
      return null;
    }

    return data;

  } catch (err) {
    showToast("Network error", "error");
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

const FILTER_TITLES = {
  all: "Inbox",
  completed: "Completed",
  pending: "Pending",
  today: "Today",
};

function renderTodos(todos, filterType = null) {
  const list = document.getElementById("todo-list");
  if (!list) return;

  // Update stats bar
  const done = todos.filter(t => t.completed).length;
  const statsEl = document.getElementById("taskStats");
  if (statsEl) {
    statsEl.innerHTML = todos.length > 0
      ? `<span class="stat-done">✅ ${done} done</span> · ${todos.length - done} remaining`
      : "";
  }

  list.innerHTML = "";

  if (todos.length === 0) {
    list.innerHTML = `
<div class="empty-state">
  <div class="empty-icon">📭</div>
  <h3>No tasks here</h3>
  <p>Add a new task above to get started.</p>
</div>
`;
    return;
  }

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item priority-${todo.priority || "medium"}`;

    // ── Content column: title + date badge ──
    const contentCol = document.createElement("div");
    contentCol.className = "todo-content-col";

    const text = document.createElement("span");
    text.textContent = todo.text;
    if (todo.completed) text.classList.add("completed");
    contentCol.appendChild(text);

    // Date badge
    if (todo.dueDate) {
      const date = new Date(todo.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = !todo.completed && date < today;

      const dateBadge = document.createElement("span");
      dateBadge.className = `todo-date-badge${isOverdue ? " overdue" : ""}`;
      dateBadge.textContent = `📅 ${date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}${isOverdue ? " · Overdue" : ""}`;
      if (isOverdue) dateBadge.title = "This task is overdue!";
      contentCol.appendChild(dateBadge);
    }

    // ── Action buttons ──
    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.innerText = todo.completed ? "↩" : "✔";
    toggleBtn.className = "edit-btn";
    toggleBtn.title = todo.completed ? "Mark incomplete" : "Mark complete";
    toggleBtn.onclick = () => {
      toggleBtn.disabled = true;
      if (!todo.completed) {
        text.classList.add("completing");
        toggleBtn.style.transform = "scale(0.8) rotate(180deg)";
      } else {
        text.classList.remove("completed");
        text.classList.add("uncompleting");
        toggleBtn.style.transform = "scale(0.8) rotate(-180deg)";
      }
      setTimeout(async () => {
        await toggleTodo(todo._id);
      }, 400);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "🗑";
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "Delete task";
    deleteBtn.onclick = () => {
      if (deleteBtn.dataset.confirm === "true") {
        deleteTodo(todo._id);
      } else {
        deleteBtn.dataset.confirm = "true";
        deleteBtn.textContent = "Sure?";
        deleteBtn.style.background = "#dc2626";
        deleteBtn.style.color = "white";
        clearTimeout(deleteBtn._confirmTimer);
        deleteBtn._confirmTimer = setTimeout(() => {
          deleteBtn.dataset.confirm = "false";
          deleteBtn.textContent = "🗑";
          deleteBtn.style.background = "";
          deleteBtn.style.color = "";
        }, 2500);
      }
    };

    actions.append(toggleBtn, deleteBtn);
    li.append(contentCol, actions);
    list.appendChild(li);
  });
}

/* ================= CREATE ================= */

async function createTodo() {
  const input = document.getElementById("todo-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    showToast("Please enter a task name", "error");
    return;
  }

  const dueDate = document.getElementById("dueDate-input")?.value || null;
  const priority = document.getElementById("priority-input")?.value || "medium";

  const result = await apiFetch("/api/todos", {
    method: "POST",
    body: JSON.stringify({
      text,
      dueDate: dueDate || undefined,
      priority,
    }),
  });

  if (!result) return;

  // Clear inputs
  input.value = "";
  const dueDateInput = document.getElementById("dueDate-input");
  const priorityInput = document.getElementById("priority-input");
  if (dueDateInput) dueDateInput.value = "";
  if (priorityInput) priorityInput.value = "medium";

  showToast("Task added!", "success");
  loadTodos();
}

/* ================= DELETE ================= */

async function deleteTodo(id) {
  const result = await apiFetch(`/api/todos/${id}`, {
    method: "DELETE",
  });

  if (!result) return;

  showToast("Task deleted", "info");
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
  // Update page title
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.textContent = FILTER_TITLES[type] || "Inbox";

  if (type === "all") return renderTodos(allTodos);

  if (type === "completed") {
    return renderTodos(allTodos.filter(t => t.completed));
  }

  if (type === "pending") {
    return renderTodos(allTodos.filter(t => !t.completed));
  }

  if (type === "today") {
    const today = new Date().toDateString();
    return renderTodos(
      allTodos.filter(t =>
        t.dueDate && new Date(t.dueDate).toDateString() === today
      )
    );
  }
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  // ── Theme toggle ──
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const iconSpan = themeToggleBtn?.querySelector(".icon");

  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark-theme");
    if (iconSpan) iconSpan.textContent = "🌙";
  } else {
    document.body.classList.remove("dark-theme");
    if (iconSpan) iconSpan.textContent = "☀️";
  }

  themeToggleBtn?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (iconSpan) iconSpan.textContent = isDark ? "🌙" : "☀️";
  });

  // ── Load data ──
  loadTodos();
  loadProfile();

  // ── Profile badge toggle ──
  document.getElementById("profileBadge")
    ?.addEventListener("click", () => {
      document.getElementById("profileMenu").classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {

  const profileMenu =
    document.getElementById("profileMenu");

  const profileBadge =
    document.getElementById("profileBadge");

  // Ignore clicks on badge itself
  if (
    profileBadge.contains(e.target)
  ) {
    return;
  }

  // Ignore clicks inside menu
  if (
    profileMenu.contains(e.target)
  ) {
    return;
  }

  // Otherwise close menu
  profileMenu.classList.add("hidden");
});

  // ── Add task ──
  document.getElementById("add-btn")?.addEventListener("click", createTodo);
  document.getElementById("todo-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") createTodo();
  });

  // ── Sidebar filters ──
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterTodos(btn.dataset.filter);
    });
  });

  // ── Logout ──
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/auth.html");
  });
});