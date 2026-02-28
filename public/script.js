const todoList = document.getElementById("todoList");
const taskInput = document.getElementById("taskInput");

async function loadTodos() {
  const res = await fetch("/api/todos");
  const todos = await res.json();

  todoList.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");
    li.className = "todo-item";

    // Task text
    const span = document.createElement("span");
    span.innerText = todo.text;

    // ✏️ Edit button
    const editBtn = document.createElement("button");
    editBtn.innerText = "Edit";
    editBtn.className = "edit-btn";
    editBtn.onclick = () => {
      const newText = prompt("Update task:", todo.text);
      if (newText) updateTodo(todo.id, newText);
    };

    // 🗑 Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "🗑";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = () => deleteTodo(todo.id);

    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    todoList.appendChild(li);
  });
}

async function addTodo() {
  if (!taskInput.value.trim()) return;

  await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: taskInput.value })
  });

  taskInput.value = "";
  loadTodos();
}

async function deleteTodo(id) {
  await fetch(`/api/todos/${id}`, { method: "DELETE" });
  loadTodos();
}

async function updateTodo(id, newText) {
  await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: newText })
  });
  loadTodos();
}

loadTodos();
