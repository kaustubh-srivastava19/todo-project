async function fetchTodos() {
  try {
    const res = await fetch("/api/todos", {
      credentials: "include"
    });

    if (!res.ok) {
      window.location.href = "auth.html";
      return;
    }

    const todos = await res.json();
    renderTodos(todos);

  } catch (err) {
    console.error("Error fetching todos:", err);
  }
}

function renderTodos(todos) {
  const list = document.getElementById("todoList");
  list.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");
    li.className = "todo-item";

    li.innerHTML = `
      <span>${todo.text}</span>
      <div>
        <button onclick="editTodo('${todo._id}')">✏️</button>
        <button onclick="deleteTodo('${todo._id}')">❌</button>
      </div>
    `;

    list.appendChild(li);
  });
}

async function addTodo() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();

  if (!text) return;

  try {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      credentials: "include"
    });

    input.value = "";
    fetchTodos();

  } catch (err) {
    console.error("Error adding todo:", err);
  }
}

async function editTodo(id) {
  const newText = prompt("Enter updated task:");

  if (!newText || newText.trim() === "") return;

  try {
    await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
      credentials: "include"
    });

    fetchTodos();

  } catch (err) {
    console.error("Error updating todo:", err);
  }
}
async function deleteTodo(id) {
  try {
    await fetch(`/api/todos/${id}`, {
      method: "DELETE",
      credentials: "include"
    });

    fetchTodos();

  } catch (err) {
    console.error("Error deleting todo:", err);
  }
}

async function logout() {
  const confirmLogout = confirm("Are you sure you want to logout?");

  if (!confirmLogout) return; // If user clicks Cancel, stop here

  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });

    window.location.href = "auth.html";

  } catch (err) {
    console.error("Logout failed:", err);
  }
}

fetchTodos();