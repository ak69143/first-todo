const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const remaining = document.getElementById("remaining");
const clearBtn = document.getElementById("clear-completed");
const filterBtns = document.querySelectorAll(".filter-btn");

let todos = JSON.parse(localStorage.getItem("todos")) || [];
let currentFilter = "all";

function save() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function render() {
  const filtered = todos.filter((todo) => {
    if (currentFilter === "active") return !todo.completed;
    if (currentFilter === "completed") return todo.completed;
    return true;
  });

  list.innerHTML = filtered
    .map(
      (todo) => `
    <li class="${todo.completed ? "completed" : ""}" data-id="${todo.id}">
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? "checked" : ""} />
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="delete-btn" title="削除">✕</button>
    </li>
  `
    )
    .join("");

  const activeCount = todos.filter((t) => !t.completed).length;
  remaining.textContent = `${activeCount}件残っています`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  todos.push({ id: Date.now(), text, completed: false });
  input.value = "";
  save();
  render();
});

list.addEventListener("change", (e) => {
  if (!e.target.classList.contains("todo-checkbox")) return;
  const id = Number(e.target.closest("li").dataset.id);
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = e.target.checked;
    save();
    render();
  }
});

list.addEventListener("click", (e) => {
  if (!e.target.classList.contains("delete-btn")) return;
  const id = Number(e.target.closest("li").dataset.id);
  todos = todos.filter((t) => t.id !== id);
  save();
  render();
});

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearBtn.addEventListener("click", () => {
  todos = todos.filter((t) => !t.completed);
  save();
  render();
});

render();
