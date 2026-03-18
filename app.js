const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const dueDateInput = document.getElementById("due-date-input");
const list = document.getElementById("todo-list");
const remaining = document.getElementById("remaining");
const clearBtn = document.getElementById("clear-completed");
const filterBtns = document.querySelectorAll(".filter-btn");
const ganttToggleBtn = document.getElementById("gantt-toggle-btn");
const ganttSection = document.getElementById("gantt-section");
const ganttViewBtns = document.querySelectorAll(".gantt-view-btn");

let todos = JSON.parse(localStorage.getItem("todos")) || [];
let currentFilter = "all";
let ganttVisible = false;
let ganttViewMode = "week"; // "week" | "month"

function today() {
  return new Date().toISOString().split("T")[0];
}

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
      <div class="todo-body">
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        ${todo.dueDate ? `<span class="due-date ${isOverdue(todo) ? "overdue" : ""}">期日: ${todo.dueDate}</span>` : ""}
      </div>
      <button class="delete-btn" title="削除">✕</button>
    </li>
  `
    )
    .join("");

  const activeCount = todos.filter((t) => !t.completed).length;
  remaining.textContent = `${activeCount}件残っています`;

  if (ganttVisible) renderGantt();
}

function isOverdue(todo) {
  if (!todo.dueDate || todo.completed) return false;
  return todo.dueDate < today();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function renderGantt() {
  const tasks = todos
    .filter((t) => t.dueDate)
    .map((t) => ({
      name: t.text,
      start: t.startDate || today(),
      end: t.dueDate > (t.startDate || today()) ? t.dueDate : addDays(t.startDate || today(), 1),
      completed: t.completed,
      overdue: isOverdue(t),
    }));

  const container = document.getElementById("gantt-container");
  container.innerHTML = "";

  if (tasks.length === 0) {
    container.innerHTML = '<p class="gantt-empty">期日が設定されたタスクがありません</p>';
    return;
  }

  // 表示範囲を決定
  const allStarts = tasks.map((t) => parseDate(t.start));
  const allEnds = tasks.map((t) => parseDate(t.end));
  let rangeStart = new Date(Math.min(...allStarts));
  let rangeEnd = new Date(Math.max(...allEnds));

  // 少し余白を追加
  rangeStart.setDate(rangeStart.getDate() - 2);
  rangeEnd.setDate(rangeEnd.getDate() + 2);

  const totalDays = Math.round((rangeEnd - rangeStart) / 86400000);
  const cellW = ganttViewMode === "week" ? 36 : 14;

  // ヘッダー（日付ラベル）生成
  let headerCells = "";
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const day = d.getDate();
    const isFirst = day === 1 || i === 0;
    const label = ganttViewMode === "week"
      ? (day % 7 === 1 || i === 0 ? `${d.getMonth() + 1}/${day}` : "")
      : (isFirst ? `${d.getMonth() + 1}月` : "");
    headerCells += `<div class="g-cell g-header-cell" style="width:${cellW}px;min-width:${cellW}px">${label}</div>`;
  }

  // 行生成
  let rows = "";
  tasks.forEach((task) => {
    const taskStart = parseDate(task.start);
    const taskEnd = parseDate(task.end);
    const offsetDays = Math.round((taskStart - rangeStart) / 86400000);
    const spanDays = Math.round((taskEnd - taskStart) / 86400000);

    let dayCells = "";
    for (let i = 0; i <= totalDays; i++) {
      dayCells += `<div class="g-cell" style="width:${cellW}px;min-width:${cellW}px"></div>`;
    }

    const barLeft = offsetDays * cellW;
    const barWidth = Math.max(spanDays * cellW, cellW);
    const barClass = task.completed ? "g-bar completed" : task.overdue ? "g-bar overdue" : "g-bar";

    rows += `
      <div class="g-row">
        <div class="g-label">${escapeHtml(task.name)}</div>
        <div class="g-timeline">
          ${dayCells}
          <div class="${barClass}" style="left:${barLeft}px;width:${barWidth}px"></div>
        </div>
      </div>`;
  });

  container.innerHTML = `
    <div class="g-chart">
      <div class="g-header-row">
        <div class="g-label"></div>
        <div class="g-timeline">${headerCells}</div>
      </div>
      <div class="g-body">
        ${rows}
      </div>
    </div>`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  todos.push({
    id: Date.now(),
    text,
    completed: false,
    startDate: today(),
    dueDate: dueDateInput.value || null,
  });
  input.value = "";
  dueDateInput.value = "";
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

ganttToggleBtn.addEventListener("click", (e) => {
  if (e.target.closest(".gantt-view-btn")) return;
  ganttVisible = !ganttVisible;
  ganttSection.classList.toggle("collapsed", !ganttVisible);
  if (ganttVisible) renderGantt();
});

ganttViewBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    ganttViewBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ganttViewMode = btn.dataset.mode;
    renderGantt();
  });
});

render();
