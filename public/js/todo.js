window.fetchTodos = async function () {
  const res = await fetch("/api/todos", {
    credentials: "include"
  });

  if (!res.ok) {
    window.location.href = "auth.html";
    return;
  }

  const todos = await res.json();
  renderTodos(todos);
}

window.renderTodos = function (todos) {
  const list = document.getElementById("todoList");
  list.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");

   li.innerHTML = `
      <span id="text-${todo._id}" 
        style="${todo.completed ? 'text-decoration: line-through;' : ''}">
        ${todo.text}
      </span>

      <input 
        id="input-${todo._id}" 
        value="${todo.text}" 
        style="display:none;" 
      />

      <div>
        <button onclick="toggleComplete('${todo._id}')">✔</button>
        <button onclick="showEdit('${todo._id}')">✏️</button>
        <button onclick="saveEdit('${todo._id}')" style="display:none;">💾</button>
        <button onclick="deleteTodo('${todo._id}')">❌</button>
      </div>
    `;

    list.appendChild(li);
  });
};
window.addTodo = async function () {
  const text = document.getElementById("taskInput").value.trim();
  const dueDate = document.getElementById("dueDate").value;

  if (!text) return;

  await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text, dueDate })
  });

  document.getElementById("taskInput").value = "";
  document.getElementById("dueDate").value = "";

  fetchTodos();
};

window.deleteTodo = async function (id) {
  await fetch(`/api/todos/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  fetchTodos();
}

async function editTodo(id) {
  const newText = prompt("Enter new task:");
  if (!newText) return;

  await fetch(`/api/todos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: newText }),
    credentials: "include"
  });

  fetchTodos();
}

window.logout = async function () {
  const confirmLogout = confirm("Are you sure you want to logout?");
  if (!confirmLogout) return;

  await fetch("/api/logout", {
    method: "POST",
    credentials: "include"
  });

  window.location.href = "/auth.html";
};

window.filterTodos = async function (type) {
  try {
    const res = await fetch("/api/todos", {
      credentials: "include"
    });

    const todos = await res.json();

    let filtered = [];
    const today = new Date().toDateString();

    if (type === "today") {
      filtered = todos.filter(t =>
        t.dueDate && new Date(t.dueDate).toDateString() === today
      );
    } 
    
else if (type === "upcoming") {
      filtered = todos.filter(t =>
        t.dueDate && new Date(t.dueDate) > new Date()
      );
    } 
    else if (type === "completed") {
      filtered = todos.filter(t => t.completed);
    } 
    else {
      filtered = todos; // inbox
    }

    renderTodos(filtered);

  } catch (err) {
    console.error("Filter error:", err);
  }
};
window.toggleComplete = async function (id) {
  try {
    await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ toggle: true })
    });

    fetchTodos();

  } catch (err) {
    console.error(err);
  }
};

window.showEdit = function (id) {
  document.getElementById(`text-${id}`).style.display = "none";
  document.getElementById(`input-${id}`).style.display = "inline";
  document.getElementById(`edit-${id}`).style.display = "none";
  document.getElementById(`save-${id}`).style.display = "inline";
};

window.saveEdit = async function (id) {
  const input = document.getElementById(`input-${id}`);
  const newText = input.value;

  if (!newText.trim()) return;

  try {
    await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ text: newText })
    });

    // Switch UI back
    document.getElementById(`text-${id}`).style.display = "inline";
    document.getElementById(`input-${id}`).style.display = "none";

    document.getElementById(`edit-${id}`).style.display = "inline";
    document.getElementById(`save-${id}`).style.display = "none";

    fetchTodos();

  } catch (err) {
    console.error("Update error:", err);
  }
};