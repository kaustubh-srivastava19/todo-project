
// FETCH TODOS
async function fetchTodos() {
  const res = await fetch("/api/todos", {
    credentials: "include"
  });

  if (!res.ok) {
    window.location.href = "auth.html";
    return;
  }

  const todos = await res.json();
  applyFilter(todos);
}

// APPLY FILTER
function applyFilter(todos) {
  let filtered = [];

  const today = new Date().toISOString().split("T")[0];

  if (currentFilter === "today") {
    filtered = todos.filter(t => t.dueDate && t.dueDate.startsWith(today));
  } 
  else if (currentFilter === "upcoming") {
    filtered = todos.filter(t => t.dueDate && t.dueDate > today);
  } 
  else if (currentFilter === "completed") {
    filtered = todos.filter(t => t.completed);
  } 
  else {
    filtered = todos;
  }

  renderTodos(filtered);
}

window.filterTodos = function (type) {
  currentFilter = type;
  fetchTodos();
};

// ADD TODO
window.addTodo = async function () {
  const input = document.getElementById("taskInput");
  const dateInput = document.getElementById("dueDateInput");

  const text = input.value.trim();
  const dueDate = dateInput ? dateInput.value : null;

  // ✅ FRONTEND VALIDATION
  if (!text) {
    alert("Task cannot be empty");
    return;
  }

  const res = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      text,
      dueDate: dueDate || null   // ✅ send only needed fields
    })
  });

  if (!res.ok) {
    const err = await res.json();
    alert(err.message || "Failed to add todo");
    return;
  }

  input.value = "";
  if (dateInput) dateInput.value = "";

  fetchTodos();
};

// DELETE TODO
async function deleteTodo(id) {
  await fetch(`/api/todos/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  fetchTodos();
}

// TOGGLE COMPLETE
async function toggleTodo(id) {
  await fetch(`/api/todos/${id}/toggle`, {
    method: "PUT",
    credentials: "include"
  });

  fetchTodos();
}

// UPDATE TODO
async function updateTodo(id, newText) {
  if (!newText.trim()) {
    alert("Task cannot be empty");
    return;
  }

  await fetch(`/api/todos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      text: newText   // ✅ only required field
    })
  });

  fetchTodos();
}

// RENDER TODOS
function renderTodos(todos) {
  const list = document.getElementById("todoList");
  list.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");

    const textSpan = document.createElement("span");
    textSpan.innerText = todo.text;

    if (todo.completed) {
      textSpan.style.textDecoration = "line-through";
    }

    // EDIT INPUT (hidden initially)
    const editInput = document.createElement("input");
    editInput.value = todo.text;
    editInput.style.display = "none";

    // BUTTONS
    const toggleBtn = document.createElement("button");
    toggleBtn.innerText = "✔";
    toggleBtn.onclick = () => toggleTodo(todo._id);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "❌";
    deleteBtn.onclick = () => deleteTodo(todo._id);

    const editBtn = document.createElement("button");
    editBtn.innerText = "✏️";

    const saveBtn = document.createElement("button");
    saveBtn.innerText = "💾";
    saveBtn.style.display = "none";

    // EDIT MODE LOGIC
    editBtn.onclick = () => {
      textSpan.style.display = "none";
      editInput.style.display = "inline";
      saveBtn.style.display = "inline";
      editBtn.style.display = "none";
    };

    saveBtn.onclick = () => {
      updateTodo(todo._id, editInput.value);

      textSpan.style.display = "inline";
      editInput.style.display = "none";
      saveBtn.style.display = "none";
      editBtn.style.display = "inline";
    };

    // APPEND ELEMENTS
    li.appendChild(toggleBtn);
    li.appendChild(textSpan);
    li.appendChild(editInput);
    li.appendChild(editBtn);
    li.appendChild(saveBtn);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

// LOGOUT
window.logout = async function () {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include"
  });

  window.location.href = "auth.html";
};

// INITIAL LOAD
fetchTodos();