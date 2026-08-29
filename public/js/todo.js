let allTodos = [];
let allProjects = [];
let currentFilter = "all";
let currentProjectId = null;
let todoIdToDelete = null;
let todoTextToDelete = "";
let projectIdToDelete = null;
let projectNameToDelete = "";
let sectionIdToDelete = null;
let sectionNameToDelete = "";
let sectionProjectIdForDelete = null;
let collapsedSections = JSON.parse(localStorage.getItem("collapsedSections") || "[]");
let selectedProjectColor = "#ff7066";
let selectedSearchIndex = -1;
let searchItems = [];
let recentlyViewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
let activeDrawerTodo = null;
let drawerSubtasks = [];
let lastDeletedTodo = null;
let undoDeleteTimeout = null;

// Pagination & search state
let currentPage = 1;
let pageLimit = 10;
let currentSearch = "";

/* ================= TOAST NOTIFICATIONS ================= */

function showToast(message, type = "error", action = null, duration = 3000) {
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
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 360px;
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }

  toast.style.background = colors[type] || colors.error;
  toast.innerHTML = "";

  const messageEl = document.createElement("span");
  messageEl.textContent = message;
  toast.appendChild(messageEl);

  if (action && action.label && typeof action.callback === "function") {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = action.label;
    actionBtn.style.cssText = `
      border: none;
      background: rgba(255,255,255,0.18);
      color: white;
      padding: 8px 12px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    `;
    actionBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      action.callback();
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
    });
    toast.appendChild(actionBtn);
  }

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
  }, duration);
}

function showConfetti() {
  const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"];
  const confettiContainer = document.createElement("div");
  confettiContainer.className = "confetti-container";
  document.body.appendChild(confettiContainer);

  for (let i = 0; i < 24; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${6 + Math.random() * 6}px`;
    piece.style.height = `${6 + Math.random() * 6}px`;
    piece.style.opacity = `${0.9 + Math.random() * 0.1}`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiContainer.appendChild(piece);
  }

  setTimeout(() => {
    confettiContainer.remove();
  }, 3600);
}

/* ================= PROFILE ================= */

async function loadProfile() {
  try {
    const result = await apiFetch("/api/auth/profile");

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

async function loadTodos(filter = currentFilter, page = currentPage) {
  currentPage = Math.max(1, parseInt(page) || 1);
  currentFilter = filter || currentFilter;

  let url = `/api/todos?page=${currentPage}&limit=${pageLimit}`;

  if (currentSearch) {
    url += `&search=${encodeURIComponent(currentSearch)}`;
  }

  if (currentFilter && currentFilter !== "all") {
    url += `&filter=${currentFilter}`;
  }

  const result = await apiFetch(url);

  if (!result) return;

  if (result.pagination && result.pagination.totalPages > 0 && currentPage > result.pagination.totalPages) {
    currentPage = result.pagination.totalPages;
    return loadTodos(currentFilter, currentPage);
  }

  if (Array.isArray(result.data)) {
    allTodos = result.data;
  } else {
    console.warn("Expected todo list array from GET /api/todos, preserving existing todos.", result.data);
  }

  renderProjects();

  if (currentProjectId) return;

  const addTaskSection = document.getElementById("addTaskSection");

  if (addTaskSection) {
    addTaskSection.style.display = "";
  }

  renderTodos(allTodos);

  renderPagination(result.pagination);
}

function renderPagination(pagination) {
  const container = document.getElementById("pagination-controls");
  if (!container) return;

  container.innerHTML = "";

  if (!pagination || pagination.totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "◀ Previous";
  prev.className = "pagination-btn";
  prev.disabled = !pagination.hasPrevPage;

  prev.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      loadTodos(currentFilter, currentPage);
    }
  };

  container.appendChild(prev);

  const pageInfo = document.createElement("span");
  pageInfo.className = "pagination-info";
  pageInfo.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;

  container.appendChild(pageInfo);

  const next = document.createElement("button");
  next.textContent = "Next ▶";
  next.className = "pagination-btn";
  next.disabled = !pagination.hasNextPage;

  next.onclick = () => {
    if (pagination.hasNextPage) {
      currentPage++;
      loadTodos(currentFilter, currentPage);
    }
  };

  container.appendChild(next);
}
/* ================= RENDER ================= */

const FILTER_TITLES = {
  all: "Inbox",
  completed: "Completed",
  pending: "Pending",
  today: "Today",
  upcoming: "Upcoming",
};

function renderTodos(todos, filterType = null) {
  const list = document.getElementById("todo-list");
  if (!list) return;

  // Ensure board view is hidden when rendering the list
  const boardViewEl = document.getElementById("boardViewContainer");
  if (boardViewEl) boardViewEl.classList.add("hidden");

  // Update stats bar
  const done = todos.filter(t => t.completed).length;
  const statsEl = document.getElementById("taskStats");
  if (statsEl) {
    if (todos.length === 0) {
      statsEl.innerHTML = "";
    } else if (done > 0) {
      statsEl.innerHTML = `<span class="stat-done">✅ ${done} done</span>`;
    } else {
      statsEl.innerHTML = "";
    }
  }

  // Update notifications badge
  updateNotifBadge();

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

  // Use centralized sorter so display sort option is respected
  const sortedTodos = getSortedTodos([...todos]);

  sortedTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item priority-${todo.priority || "medium"}`;

    const mainRow = document.createElement("div");
    mainRow.className = "todo-item-main-row";

    // ── 1. Circular Checkbox on the Far Left ──
    const checkBtn = document.createElement("button");
    checkBtn.className = `todo-checkbox-btn priority-${todo.priority || "medium"}${todo.completed ? " checked" : ""}`;
    checkBtn.title = todo.completed ? "Mark incomplete" : "Mark complete";
    checkBtn.setAttribute("aria-label", todo.completed ? "Mark incomplete" : "Mark complete");

    const checkCircle = document.createElement("span");
    checkCircle.className = "todo-checkbox-circle";
    checkCircle.innerHTML = `
      <svg class="todo-check-icon" viewBox="0 0 16 16" width="10" height="10">
        <path fill="currentColor" d="M13.485 3.515a1 1 0 0 1 0 1.414l-6.364 6.364a1 1 0 0 1-1.414 0L2.515 8.1a1 1 0 0 1 1.414-1.414l2.478 2.478 5.664-5.649a1 1 0 0 1 1.414 0z"/>
      </svg>
    `;
    checkBtn.appendChild(checkCircle);

    // ── 2. Content column: title + date badge ──
    const contentCol = document.createElement("div");
    contentCol.className = "todo-content-col";
    contentCol.style.cursor = "pointer";
    contentCol.onclick = () => openTaskDetailsDrawer(todo);

    const text = document.createElement("span");
    text.className = "todo-title-text" + (todo.completed ? " completed" : "");
    text.textContent = todo.text;
    contentCol.appendChild(text);

    // Checkbox click logic
    checkBtn.onclick = (e) => {
      e.stopPropagation();
      const shouldShowConfetti = !todo.completed;
      checkBtn.disabled = true;
      if (!todo.completed) {
        checkBtn.classList.add("checked");
        text.classList.add("completing");
      } else {
        checkBtn.classList.remove("checked");
        text.classList.remove("completed");
        text.classList.add("uncompleting");
      }
      setTimeout(async () => {
        const success = await toggleTodo(todo._id);
        if (success && shouldShowConfetti && typeof showConfetti === "function") {
          showConfetti();
        }
      }, 350);
    };

    // Meta badges container (includes date, project tag, and subtasks progress)
    const metaBadges = document.createElement("div");
    metaBadges.className = "todo-meta-badges";

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
      metaBadges.appendChild(dateBadge);
    }

    if (todo.recurrence && todo.recurrence !== "none") {
      const recurrenceBadge = document.createElement("span");
      recurrenceBadge.className = "todo-recurrence-badge";
      recurrenceBadge.textContent = `🔁 ${todo.recurrence}`;
      metaBadges.appendChild(recurrenceBadge);
    }

    if (todo.reminderDate) {
      const reminderDate = new Date(todo.reminderDate);
      const reminderBadge = document.createElement("span");
      reminderBadge.className = "todo-reminder-badge";
      reminderBadge.textContent = `⏰ ${reminderDate.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      metaBadges.appendChild(reminderBadge);
    }

    // Project tag badge
    if (todo.project) {
      const projectBadge = document.createElement("span");
      projectBadge.className = "todo-project-tag";

      const projectDot = document.createElement("span");
      projectDot.className = "todo-project-dot";
      projectDot.style.backgroundColor = todo.project.color || "#808080";

      const projectName = document.createElement("span");
      projectName.textContent = todo.project.name;
      projectName.style.fontSize = "inherit";

      projectBadge.append(projectDot, projectName);
      metaBadges.appendChild(projectBadge);
    }

    // Setup nested subtasks checklist & progress badge
    setupNestedSubtasks(todo, li, metaBadges);

    if (metaBadges.children.length > 0) {
      contentCol.appendChild(metaBadges);
    }

    // ── 3. Action buttons (Revealed on hover) ──
    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const editBtn = document.createElement("button");
    editBtn.innerText = "✏️";
    editBtn.className = "todo-action-btn edit-action-btn";
    editBtn.title = "Quick edit task";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openInlineTodoEditor(todo, li);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "🗑";
    deleteBtn.className = "todo-action-btn delete-action-btn";
    deleteBtn.title = "Delete task";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      openDeleteModal(todo._id, todo.text);
    };

    actions.append(editBtn, deleteBtn);
    mainRow.append(checkBtn, contentCol, actions);
    li.prepend(mainRow);
    // tag each li so Sortable can read the todo id on drop
    li.dataset.todoId = todo._id;
    list.appendChild(li);
  });

  // Enable drag-and-drop reordering on the global list
  list.dataset.sortable = "global";
  initSortableList(list, null, null);
}

/* ================= NATURAL LANGUAGE PARSER (NLP) ================= */

/**
 * Helper to format a Date into YYYY-MM-DD local format
 */
function formatLocalDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses raw text input for dates, priority, recurrence, and project tags.
 * Returns an object with clean task text and detected properties.
 */
function parseTaskNaturalLanguage(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return {
      cleanText: "",
      dueDate: null,
      dueDateLabel: null,
      priority: null,
      recurrence: null,
      project: null,
      projectName: null,
      hasParsedData: false,
    };
  }

  let text = rawText.trim();
  let detectedDueDate = null;
  let detectedDueDateLabel = null;
  let detectedPriority = null;
  let detectedRecurrence = null;
  let detectedProject = null;
  let detectedProjectName = null;

  // 1. Detect Priority: p1, p2, p3, !high, !med, !medium, !low, priority: high, priority 1
  const priorityPatterns = [
    { regex: /\b(?:p1|!high|priority[:\s]+high|priority[:\s]+1)\b/i, value: "high" },
    { regex: /\b(?:p2|!(?:med|medium)|priority[:\s]+(?:med|medium)|priority[:\s]+2)\b/i, value: "medium" },
    { regex: /\b(?:p3|!low|priority[:\s]+low|priority[:\s]+3)\b/i, value: "low" },
  ];

  for (const { regex, value } of priorityPatterns) {
    if (regex.test(text)) {
      detectedPriority = value;
      text = text.replace(regex, " ").trim();
      break;
    }
  }

  // 2. Detect Recurrence: every day, daily, every week, weekly, every month, monthly, every monday..sunday
  const dailyRegex = /\b(?:every\s+day|daily)\b/i;
  const weeklyRegex = /\b(?:every\s+week|weekly|every\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;
  const monthlyRegex = /\b(?:every\s+month|monthly)\b/i;

  if (dailyRegex.test(text)) {
    detectedRecurrence = "daily";
    text = text.replace(dailyRegex, " ").trim();
  } else if (weeklyRegex.test(text)) {
    detectedRecurrence = "weekly";
    text = text.replace(weeklyRegex, " ").trim();
  } else if (monthlyRegex.test(text)) {
    detectedRecurrence = "monthly";
    text = text.replace(monthlyRegex, " ").trim();
  }

  // 3. Detect Project Tag: #projectname
  const projectTagRegex = /#([a-zA-Z0-9_\-]+)/i;
  const projectMatch = text.match(projectTagRegex);
  if (projectMatch && Array.isArray(allProjects)) {
    const rawTagName = projectMatch[1].toLowerCase();
    const matchedProj = allProjects.find(
      (p) => p.name && p.name.toLowerCase().replace(/\s+/g, "") === rawTagName
    ) || allProjects.find(
      (p) => p.name && p.name.toLowerCase().includes(rawTagName)
    );

    if (matchedProj) {
      detectedProject = matchedProj._id;
      detectedProjectName = matchedProj.name;
      text = text.replace(projectMatch[0], " ").trim();
    }
  }

  // 4. Detect Due Date:
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 4a. Today / Tomorrow / Yesterday
  const todayRegex = /\b(?:today|tod)\b/i;
  const tomorrowRegex = /\b(?:tomorrow|tom|tmrw)\b/i;
  const yesterdayRegex = /\b(?:yesterday|yest)\b/i;

  if (tomorrowRegex.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    detectedDueDate = formatLocalDateISO(d);
    detectedDueDateLabel = `Tomorrow (${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
    text = text.replace(tomorrowRegex, " ").trim();
  } else if (todayRegex.test(text)) {
    detectedDueDate = formatLocalDateISO(now);
    detectedDueDateLabel = "Today";
    text = text.replace(todayRegex, " ").trim();
  } else if (yesterdayRegex.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    detectedDueDate = formatLocalDateISO(d);
    detectedDueDateLabel = "Yesterday";
    text = text.replace(yesterdayRegex, " ").trim();
  }

  // 4b. Relative offsets: "in 3 days", "in 2 weeks", "in 1 month"
  if (!detectedDueDate) {
    const relativeRegex = /\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/i;
    const relMatch = text.match(relativeRegex);
    if (relMatch) {
      const count = parseInt(relMatch[1], 10);
      const unit = relMatch[2].toLowerCase();
      const d = new Date(now);

      if (unit.startsWith("day")) {
        d.setDate(d.getDate() + count);
      } else if (unit.startsWith("week")) {
        d.setDate(d.getDate() + count * 7);
      } else if (unit.startsWith("month")) {
        d.setMonth(d.getMonth() + count);
      }

      detectedDueDate = formatLocalDateISO(d);
      detectedDueDateLabel = `In ${count} ${unit} (${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
      text = text.replace(relMatch[0], " ").trim();
    }
  }

  // 4c. Weekend keywords: "this weekend", "next weekend"
  if (!detectedDueDate) {
    const weekendRegex = /\b(?:this|next)\s+weekend\b/i;
    const weekendMatch = text.match(weekendRegex);
    if (weekendMatch) {
      const isNext = /next/i.test(weekendMatch[0]);
      const d = new Date(now);
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      let diff = 6 - day;
      if (diff <= 0 || isNext) diff += 7;
      d.setDate(d.getDate() + diff);

      detectedDueDate = formatLocalDateISO(d);
      detectedDueDateLabel = `${isNext ? "Next" : "This"} Weekend (${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
      text = text.replace(weekendMatch[0], " ").trim();
    }
  }

  // 4d. Days of the week: "next monday", "this friday", "on wednesday", "friday"
  if (!detectedDueDate) {
    const dayOfWeekRegex = /\b(?:(next|this|on)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i;
    const dayMatch = text.match(dayOfWeekRegex);
    if (dayMatch) {
      const dayNames = {
        sun: 0, sunday: 0,
        mon: 1, monday: 1,
        tue: 2, tues: 2, tuesday: 2,
        wed: 3, wednesday: 3,
        thu: 4, thur: 4, thurs: 4, thursday: 4,
        fri: 5, friday: 5,
        sat: 6, saturday: 6,
      };
      const prefix = (dayMatch[1] || "").toLowerCase();
      const targetDay = dayNames[dayMatch[2].toLowerCase()];

      if (targetDay !== undefined) {
        const d = new Date(now);
        const currentDay = d.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0 || prefix === "next") {
          diff += 7;
        }
        d.setDate(d.getDate() + diff);

        detectedDueDate = formatLocalDateISO(d);
        detectedDueDateLabel = `${dayMatch[2].charAt(0).toUpperCase() + dayMatch[2].slice(1)} (${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
        text = text.replace(dayMatch[0], " ").trim();
      }
    }
  }

  // 4e. Specific date formats: "aug 25", "25 aug", "august 25th", "25th august"
  if (!detectedDueDate) {
    const months = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };
    const monthNamesPattern = Object.keys(months).join("|");

    const specificDateRegex = new RegExp(
      `\\b(?:(?:(${monthNamesPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?)|(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamesPattern})))\\b`,
      "i"
    );
    const specificMatch = text.match(specificDateRegex);
    if (specificMatch) {
      const monthStr = (specificMatch[1] || specificMatch[4]).toLowerCase();
      const dayNum = parseInt(specificMatch[2] || specificMatch[3], 10);
      const monthIdx = months[monthStr];

      if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
        const d = new Date(now.getFullYear(), monthIdx, dayNum);
        if (d < now) {
          d.setFullYear(d.getFullYear() + 1);
        }
        detectedDueDate = formatLocalDateISO(d);
        detectedDueDateLabel = `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
        text = text.replace(specificMatch[0], " ").trim();
      }
    }
  }

  const cleanText = text.replace(/\s+/g, " ").trim();
  const hasParsedData = Boolean(
    detectedDueDate || detectedPriority || detectedRecurrence || detectedProject
  );

  return {
    cleanText: cleanText || rawText.trim(),
    dueDate: detectedDueDate,
    dueDateLabel: detectedDueDateLabel,
    priority: detectedPriority,
    recurrence: detectedRecurrence,
    project: detectedProject,
    projectName: detectedProjectName,
    hasParsedData,
  };
}

/**
 * Updates the real-time live preview bar as user types in #todo-input
 */
function updateNlpLivePreview() {
  const input = document.getElementById("todo-input");
  const previewBar = document.getElementById("nlpPreviewBar");
  const container = document.getElementById("nlpChipsContainer");

  if (!input || !previewBar || !container) return;

  const raw = input.value;
  if (!raw.trim()) {
    previewBar.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  const parsed = parseTaskNaturalLanguage(raw);

  if (!parsed.hasParsedData) {
    previewBar.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  previewBar.classList.remove("hidden");
  container.innerHTML = "";

  // 1. Date chip
  if (parsed.dueDate) {
    const chip = document.createElement("span");
    chip.className = "nlp-chip nlp-chip-date";
    chip.innerHTML = `📅 ${parsed.dueDateLabel || parsed.dueDate}`;
    container.appendChild(chip);

    const dueDateInput = document.getElementById("dueDate-input");
    if (dueDateInput) dueDateInput.value = parsed.dueDate;
  }

  // 2. Priority chip
  if (parsed.priority) {
    const chip = document.createElement("span");
    chip.className = `nlp-chip nlp-chip-priority-${parsed.priority}`;
    const iconMap = { high: "🔴 High", medium: "🟡 Medium", low: "🔵 Low" };
    chip.innerHTML = `🚩 ${iconMap[parsed.priority] || parsed.priority}`;
    container.appendChild(chip);

    const priorityInput = document.getElementById("priority-input");
    if (priorityInput) priorityInput.value = parsed.priority;
  }

  // 3. Recurrence chip
  if (parsed.recurrence) {
    const chip = document.createElement("span");
    chip.className = "nlp-chip nlp-chip-recurrence";
    chip.innerHTML = `🔁 ${parsed.recurrence.charAt(0).toUpperCase() + parsed.recurrence.slice(1)}`;
    container.appendChild(chip);

    const recurrenceInput = document.getElementById("recurrence-input");
    if (recurrenceInput) recurrenceInput.value = parsed.recurrence;
  }

  // 4. Project chip
  if (parsed.projectName) {
    const chip = document.createElement("span");
    chip.className = "nlp-chip nlp-chip-project";
    chip.innerHTML = `# ${parsed.projectName}`;
    container.appendChild(chip);
  }
}

/* ================= CREATE ================= */

let isSubmittingTodo = false;

async function createTodo() {
  if (isSubmittingTodo) return;

  const input = document.getElementById("todo-input");
  if (!input) return;

  const rawText = input.value.trim();
  if (!rawText) {
    showToast("Please enter a task name", "error");
    return;
  }

  // Parse natural language keywords
  const parsed = parseTaskNaturalLanguage(rawText);
  const text = parsed.cleanText || rawText;

  isSubmittingTodo = true;
  const addBtn = document.getElementById("add-btn");
  if (addBtn) addBtn.disabled = true;

  try {
    const dueDate = parsed.dueDate || document.getElementById("dueDate-input")?.value || null;
    const priority = parsed.priority || document.getElementById("priority-input")?.value || "medium";
    const recurrence = parsed.recurrence || document.getElementById("recurrence-input")?.value || "none";
    const reminderRaw = document.getElementById("reminderDate-input")?.value || "";
    const reminderDate = reminderRaw ? new Date(reminderRaw).toISOString() : undefined;
    const targetProject = parsed.project || currentProjectId || undefined;

    const result = await apiFetch("/api/todos", {
      method: "POST",
      body: JSON.stringify({
        text,
        dueDate: dueDate || undefined,
        priority,
        recurrence,
        reminderDate,
        project: targetProject,
      }),
    });

    if (!result || !result.data) {
      showToast("Unable to add task. Please try again.", "error");
      return;
    }

    // Immediately render the newly created task locally
    allTodos = [result.data, ...allTodos];
    renderProjects();
    renderTodos(allTodos);

    // Clear inputs and hide preview
    input.value = "";
    const previewBar = document.getElementById("nlpPreviewBar");
    if (previewBar) previewBar.classList.add("hidden");
    const chipsContainer = document.getElementById("nlpChipsContainer");
    if (chipsContainer) chipsContainer.innerHTML = "";

    const dueDateInput = document.getElementById("dueDate-input");
    const priorityInput = document.getElementById("priority-input");
    const recurrenceInput = document.getElementById("recurrence-input");
    const reminderInput = document.getElementById("reminderDate-input");
    if (dueDateInput) dueDateInput.value = "";
    if (priorityInput) priorityInput.value = "medium";
    if (recurrenceInput) recurrenceInput.value = "none";
    if (reminderInput) reminderInput.value = "";

    if (parsed.hasParsedData) {
      showToast("Task added with smart tags! ⚡", "success");
    } else {
      showToast("Task added!", "success");
    }

    currentProjectId = null;
    currentSearch = "";
    currentFilter = "all";
    currentPage = 1; // Always return to page 1 so the new task is visible

    document.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("active"));
    document.querySelector('[data-filter="all"]')?.classList.add("active");

    const addTaskSection = document.getElementById("addTaskSection");
    if (addTaskSection) addTaskSection.style.display = "";

    await loadTodos(currentFilter, currentPage);
  } finally {
    isSubmittingTodo = false;
    if (addBtn) addBtn.disabled = false;
  }
}

/* ================= DELETE & MODAL FUNCTIONS ================= */

function openDeleteModal(id, text) {
  todoIdToDelete = id;
  todoTextToDelete = text;

  const modal = document.getElementById("deleteConfirmModal");
  const taskNameSpan = document.getElementById("deleteTaskName");

  if (modal && taskNameSpan) {
    taskNameSpan.textContent = text;
    modal.classList.remove("hidden");
  }
}

function closeDeleteModal() {
  todoIdToDelete = null;
  todoTextToDelete = "";

  const modal = document.getElementById("deleteConfirmModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

async function deleteTodo(id, text, todoObj = null) {
  if (!todoObj) {
    todoObj = allTodos.find((t) => t._id === id) || null;
  }

  const result = await apiFetch(`/api/todos/${id}`, {
    method: "DELETE",
  });

  if (!result) return false;

  if (todoObj) {
    lastDeletedTodo = { ...todoObj };
    if (undoDeleteTimeout) {
      clearTimeout(undoDeleteTimeout);
    }
    undoDeleteTimeout = setTimeout(() => {
      lastDeletedTodo = null;
      undoDeleteTimeout = null;
    }, 6000);
  }

  showToast(`Task "${text}" deleted.`, "info", {
    label: "Undo",
    callback: async () => {
      if (undoDeleteTimeout) {
        clearTimeout(undoDeleteTimeout);
        undoDeleteTimeout = null;
      }
      await undoDeletedTodo();
    },
  }, 6000);

  if (currentProjectId) {
    const project = allProjects.find((p) => p._id === currentProjectId);
    const res = await apiFetch("/api/todos");
    if (res) { allTodos = res.data.todos || res.data || []; renderProjects(); }
    if (project) renderProjectView(project);
    return true;
  }

  // Preserve current page after deletion
  loadTodos(currentFilter, currentPage);
  return true;
}

async function undoDeletedTodo() {
  if (!lastDeletedTodo) {
    showToast("Nothing to undo.", "error");
    return;
  }

  const todo = lastDeletedTodo;
  lastDeletedTodo = null;

  const result = await apiFetch("/api/todos", {
    method: "POST",
    body: JSON.stringify({
      text: todo.text,
      dueDate: todo.dueDate || undefined,
      priority: todo.priority || "medium",
      recurrence: todo.recurrence || "none",
      reminderDate: todo.reminderDate || undefined,
      project: todo.project?._id || todo.project || undefined,
    }),
  });

  if (!result) {
    showToast("Unable to restore task.", "error");
    return;
  }

  showToast(`Task "${todo.text}" restored.`, "success");
  // Preserve current page after restoration
  loadTodos(currentFilter, currentPage);
}

/* ================= TOGGLE ================= */

async function toggleTodo(id) {
  // The server route is: PATCH /api/todos/:todoId
  // So the correct URL is just /api/todos/${id} — no '/toggle' suffix.
  // Previously this called /api/todos/${id}/toggle which matched no route → 404 error.
  const result = await apiFetch(`/api/todos/${id}`, {
    method: "PATCH",
  });

  if (!result) return false;

  if (currentProjectId) {
    const project = allProjects.find((p) => p._id === currentProjectId);
    const res = await apiFetch("/api/todos");
    if (res) { allTodos = res.data.todos || res.data || []; renderProjects(); }
    if (project) renderProjectView(project);
    return true;
  }

  // Preserve current page after toggle
  loadTodos(currentFilter, currentPage);
  return true;
}

/* ================= FILTER ================= */

function filterTodos(type) {
  // Special case: Filters & Labels view
  if (type === "filters") {
    currentProjectId = null;
    currentFilter = "filters";
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = "Filters & Labels";

    // Hide normal views, show filters panel
    const todoList = document.getElementById("todo-list");
    const boardView = document.getElementById("boardViewContainer");
    const addTaskSection = document.getElementById("addTaskSection");
    const pagination = document.getElementById("pagination-controls");
    if (todoList) todoList.classList.add("hidden");
    if (boardView) boardView.classList.add("hidden");
    if (addTaskSection) addTaskSection.style.display = "none";
    if (pagination) pagination.style.display = "none";

    renderFiltersView();
    return;
  }

  // Restore normal views when leaving filters page
  const todoList = document.getElementById("todo-list");
  const filtersView = document.getElementById("filtersView");
  const pagination = document.getElementById("pagination-controls");
  if (todoList) todoList.classList.remove("hidden");
  if (filtersView) filtersView.classList.add("hidden");
  if (pagination) pagination.style.display = "";

  // Update page title
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.textContent = FILTER_TITLES[type] || "Inbox";

  currentFilter = type;
  currentPage = 1;
  return loadTodos(type, currentPage);
}

// Renders the Filters & Labels view with quick-filter cards
function renderFiltersView() {
  const filtersView = document.getElementById("filtersView");
  if (!filtersView) return;

  filtersView.classList.remove("hidden");
  filtersView.innerHTML = "";

  // --- Filter Cards Grid (Date-based quick filters) ---
  const grid = document.createElement("div");
  grid.className = "filter-cards-grid";

  const filterCards = [
    { icon: "📋", label: "All Tasks", description: "View every task across all your projects.", filter: "all" },
    { icon: "📆", label: "Today", description: "Tasks that are due today.", filter: "today" },
    { icon: "⏳", label: "Upcoming", description: "Tasks due in the next 7 days.", filter: "upcoming" },
    { icon: "✅", label: "Completed", description: "All tasks you've marked as done.", filter: "completed" },
    { icon: "⏰", label: "Pending", description: "Tasks that are still outstanding.", filter: "pending" },
  ];

  filterCards.forEach(({ icon, label, description, filter }) => {
    const card = document.createElement("button");
    card.className = "filter-card";
    card.innerHTML = `
      <span class="filter-card-icon">${icon}</span>
      <span class="filter-card-label">${label}</span>
      <span class="filter-card-description">${description}</span>
    `;
    // Clicking a filter card navigates to that filter
    card.onclick = () => {
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
      const btn = document.querySelector(`[data-filter="${filter}"]`);
      if (btn) btn.classList.add("active");
      filterTodos(filter);
    };
    grid.appendChild(card);
  });

  filtersView.appendChild(grid);


  const prioritySection = document.createElement("div");
  prioritySection.className = "priority-filters-section";
  prioritySection.innerHTML = "<h3>Filter by Priority</h3>";

  const tagList = document.createElement("div");
  tagList.className = "priority-tag-list";

  [
    { label: "🔴 High Priority", priority: "high", cls: "high" },
    { label: "🟡 Medium Priority", priority: "medium", cls: "medium" },
    { label: "🔵 Low Priority", priority: "low", cls: "low" },
  ].forEach(({ label, priority, cls }) => {
    const tag = document.createElement("button");
    tag.className = `priority-tag ${cls}`;
    tag.textContent = label;
    // Clicking a priority tag switches to All Tasks filtered by that priority in-memory
    tag.onclick = () => {
      currentFilter = "all";
      currentProjectId = null;

      // Hide filters view and restore list
      filtersView.classList.add("hidden");
      const addTaskSection = document.getElementById("addTaskSection");
      const pagination = document.getElementById("pagination-controls");
      const todoList = document.getElementById("todo-list");
      if (addTaskSection) addTaskSection.style.display = "";
      if (pagination) pagination.style.display = "";
      if (todoList) todoList.classList.remove("hidden");

      const titleEl = document.getElementById("pageTitle");
      if (titleEl) titleEl.textContent = `${label} Tasks`;

      document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));

      // Re-render filtered list
      const filtered = allTodos.filter(t => t.priority === priority);
      renderTodos(filtered);
    };
    tagList.appendChild(tag);
  });

  prioritySection.appendChild(tagList);
  filtersView.appendChild(prioritySection);
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
  loadProjects().finally(() => {
    loadTodos();
  });
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
      profileBadge && profileBadge.contains(e.target)
    ) {
      return;
    }

    // Ignore clicks inside menu
    if (
      profileMenu && profileMenu.contains(e.target)
    ) {
      return;
    }

    // Otherwise close menu
    profileMenu?.classList.add("hidden");
  });

  // ── Add task ──
  document.getElementById("add-btn")?.addEventListener("click", createTodo);
  const todoInputEl = document.getElementById("todo-input");
  todoInputEl?.addEventListener("input", updateNlpLivePreview);
  todoInputEl?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") createTodo();
  });

  // Live search is handled by the command palette (#searchInput) below

  document.querySelectorAll(".date-picker-wrapper").forEach(wrapper => {
    const input = wrapper.querySelector("input");
    if (input) {
      wrapper.addEventListener("click", () => {
        input.focus();
        if (typeof input.showPicker === "function") {
          input.showPicker();
        } else {
          input.click();
        }
      });
    }
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

  // ── Delete modal events ──
  document.getElementById("cancelDeleteBtn")?.addEventListener("click", closeDeleteModal);

  document.getElementById("confirmDeleteBtn")?.addEventListener("click", async () => {
    if (todoIdToDelete) {
      const id = todoIdToDelete;
      const text = todoTextToDelete;
      const deletedTodoObj = allTodos.find((t) => t._id === id) || null;
      closeDeleteModal();
      await deleteTodo(id, text, deletedTodoObj);
    }
  });

  // Close modal when clicking on overlay background
  document.getElementById("deleteConfirmModal")?.addEventListener("click", (e) => {
    if (e.target.id === "deleteConfirmModal") {
      closeDeleteModal();
    }
  });

  // ── Project Modal Events ──
  document.getElementById("addProjectSidebarBtn")?.addEventListener("click", openAddProjectModal);
  document.getElementById("cancelProjectBtn")?.addEventListener("click", closeAddProjectModal);
  document.getElementById("saveProjectBtn")?.addEventListener("click", submitAddProject);
  document.getElementById("cancelDeleteProjectBtn")?.addEventListener("click", closeDeleteProjectModal);
  document.getElementById("confirmDeleteProjectBtn")?.addEventListener("click", submitDeleteProject);

  // ── Delete Section Modal Events ──
  document.getElementById("cancelDeleteSectionBtn")?.addEventListener("click", closeDeleteSectionModal);
  document.getElementById("confirmDeleteSectionBtn")?.addEventListener("click", submitDeleteSection);
  document.getElementById("deleteSectionModal")?.addEventListener("click", (e) => {
    if (e.target.id === "deleteSectionModal") closeDeleteSectionModal();
  });

  // Close project modals on overlay click
  document.getElementById("addProjectModal")?.addEventListener("click", (e) => {
    if (e.target.id === "addProjectModal") closeAddProjectModal();
  });
  document.getElementById("deleteProjectModal")?.addEventListener("click", (e) => {
    if (e.target.id === "deleteProjectModal") closeDeleteProjectModal();
  });

  // Color circle selector inside modal
  document.querySelectorAll("#colorSelector .color-circle").forEach(circle => {
    circle.addEventListener("click", () => {
      document.querySelectorAll("#colorSelector .color-circle").forEach(c => c.classList.remove("selected"));
      circle.classList.add("selected");
      selectedProjectColor = circle.dataset.color;
    });
  });

  // ── Drawer Events ──
  document.getElementById("closeDrawerBtn")?.addEventListener("click", closeTaskDetailsDrawer);
  document.getElementById("addSubtaskBtn")?.addEventListener("click", addDrawerSubtask);
  document.getElementById("newSubtaskInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDrawerSubtask();
    }
  });
  document.getElementById("saveDrawerBtn")?.addEventListener("click", saveDrawerTaskChanges);
  document.getElementById("deleteDrawerTaskBtn")?.addEventListener("click", async () => {
    if (activeDrawerTodo) {
      closeTaskDetailsDrawer();
      openDeleteModal(activeDrawerTodo._id, activeDrawerTodo.text);
    }
  });
  document.getElementById("drawerTaskProject")?.addEventListener("change", (e) => {
    renderDrawerSectionOptions(e.target.value);
  });

  // ── Command Palette Events ──
  document.getElementById("searchSidebarBtn")?.addEventListener("click", openSearchModal);
  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    // Live-filter the task list as the user types in the command palette
    currentSearch = e.target.value.trim();
    currentPage = 1;
    if (!currentProjectId) {
      loadTodos(currentFilter);
    }
    renderSearchResults();
  });
  document.getElementById("searchInput")?.addEventListener("keydown", handleSearchKeydown);
  document.getElementById("searchModal")?.addEventListener("click", (e) => {
    if (e.target.id === "searchModal") closeSearchModal();
  });

  // ── Custom Tooltips System ──
  initCustomTooltips();

  // ── Sidebar Toggle ──
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  const sidebarToggleIcon = document.getElementById("sidebarToggleIcon");

  function updateSidebarToggleBtn(isCollapsed) {
    if (sidebarToggleIcon) {
      // Show arrow when collapsed (indicating click to expand), hamburger when expanded
      sidebarToggleIcon.innerHTML = isCollapsed ? "&#10140;" : "&#9776;";
    }
    if (sidebarToggleBtn) {
      const label = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
      sidebarToggleBtn.setAttribute("data-tooltip", label);
      sidebarToggleBtn.setAttribute("aria-label", label);
      sidebarToggleBtn.removeAttribute("title");
    }
  }

  // Restore saved state
  const initialCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (initialCollapsed) {
    sidebar?.classList.add("collapsed");
  }
  updateSidebarToggleBtn(initialCollapsed);

  sidebarToggleBtn?.addEventListener("click", () => {
    const isCollapsed = sidebar?.classList.toggle("collapsed");
    localStorage.setItem("sidebarCollapsed", isCollapsed ? "true" : "false");
    updateSidebarToggleBtn(!!isCollapsed);
  });

  // ── Notifications Bell ──
  document.getElementById("notifBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotifPanel();
  });

  // Close notifications on outside click
  document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".notif-btn-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      const panel = document.getElementById("notifPanel");
      if (panel) panel.remove();
    }
  });

  // Global keydown listeners for shortcuts
  document.addEventListener("keydown", handleGlobalShortcut);
});

/* ================= NOTIFICATIONS ================= */

let readNotifIds = new Set(JSON.parse(localStorage.getItem("readNotifIds") || "[]"));

function saveReadNotifIds() {
  localStorage.setItem("readNotifIds", JSON.stringify([...readNotifIds]));
}

function getNotifTodos() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const overdue = [], dueToday = [], upcoming = [];

  allTodos.forEach(t => {
    if (t.completed || !t.dueDate) return;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) overdue.push({ ...t, _notifType: "overdue" });
    else if (due.getTime() === today.getTime()) dueToday.push({ ...t, _notifType: "today" });
    else if (due <= endOfWeek) upcoming.push({ ...t, _notifType: "upcoming" });
  });

  return [...overdue, ...dueToday, ...upcoming];
}

function updateNotifBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;

  const unreadCount = getNotifTodos()
    .filter(t => !t.completed && !readNotifIds.has(t._id))
    .length;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
    badge.textContent = "0";
  }
}

function toggleNotifPanel() {
  const existing = document.getElementById("notifPanel");
  if (existing) { existing.remove(); return; }
  renderNotifPanel("all");
}

function renderNotifPanel(activeTab = "all") {
  // Remove existing panel
  document.getElementById("notifPanel")?.remove();

  const wrapper = document.querySelector(".notif-btn-wrapper");
  if (!wrapper) return;

  const allItems = getNotifTodos();
  const unreadItems = allItems.filter(t => !readNotifIds.has(t._id));
  const displayItems = activeTab === "unread" ? unreadItems : allItems;

  const panel = document.createElement("div");
  panel.className = "notif-panel";
  panel.id = "notifPanel";
  panel.addEventListener("click", e => e.stopPropagation());

  // ── Header ──
  const header = document.createElement("div");
  header.className = "notif-panel-header";

  const title = document.createElement("h4");
  title.textContent = "🔔 Notifications";

  const markAllBtn = document.createElement("button");
  markAllBtn.className = "notif-mark-all-btn";
  markAllBtn.textContent = "Mark all as read";
  markAllBtn.addEventListener("click", () => {
    allItems.forEach(t => readNotifIds.add(t._id));
    saveReadNotifIds();
    updateNotifBadge();
    renderNotifPanel(activeTab);
  });

  header.append(title, markAllBtn);
  panel.appendChild(header);

  // ── Tabs ──
  const tabs = document.createElement("div");
  tabs.className = "notif-tabs";

  ["all", "unread"].forEach(tab => {
    const btn = document.createElement("button");
    btn.className = `notif-tab-btn${activeTab === tab ? " active" : ""}`;
    btn.textContent = tab === "all"
      ? `All${allItems.length > 0 ? ` (${allItems.length})` : ""}`
      : `Unread${unreadItems.length > 0 ? ` (${unreadItems.length})` : ""}`;
    btn.addEventListener("click", () => renderNotifPanel(tab));
    tabs.appendChild(btn);
  });

  panel.appendChild(tabs);

  // ── List ──
  const list = document.createElement("div");
  list.className = "notif-list";

  if (displayItems.length === 0) {
    list.innerHTML = `
      <div class="notif-empty">
        <div class="notif-empty-icon">${activeTab === "unread" ? "✅" : "🎉"}</div>
        <div>${activeTab === "unread" ? "No unread notifications." : "All caught up! No pending tasks."}</div>
      </div>`;
  } else {
    const iconMap = { overdue: "🔴", today: "🟡", upcoming: "🟢" };
    const labelMap = { overdue: "Overdue", today: "Due today", upcoming: "Upcoming" };

    displayItems.forEach(t => {
      const isRead = readNotifIds.has(t._id);
      const due = new Date(t.dueDate);
      const dateStr = due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

      const item = document.createElement("div");
      item.className = `notif-item ${t._notifType}${isRead ? " notif-read" : ""}`;
      item.innerHTML = `
        <div class="notif-item-icon">${iconMap[t._notifType]}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${t.text}</div>
          <div class="notif-item-sub">${labelMap[t._notifType]} · ${dateStr}</div>
        </div>
        ${!isRead ? '<span class="notif-unread-dot"></span>' : ""}`;

      item.addEventListener("click", () => {
        readNotifIds.add(t._id);
        saveReadNotifIds();
        updateNotifBadge();
        panel.remove();

        const filterKey = t._notifType === "upcoming" ? "upcoming" : "today";
        filterTodos(filterKey);
        document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
        document.querySelector(`[data-filter='${filterKey}']`)?.classList.add("active");
      });

      list.appendChild(item);
    });
  }

  panel.appendChild(list);
  wrapper.appendChild(panel);
}


async function loadProjects() {
  const result = await apiFetch("/api/projects");
  if (!result) return;
  allProjects = result.data || [];
  renderProjects();
}

function renderProjects() {
  const list = document.getElementById("projectsList");
  const favSection = document.getElementById("favoritesSidebarSection");
  const favList = document.getElementById("favoritesList");
  if (!list) return;

  list.innerHTML = "";
  if (favList) favList.innerHTML = "";

  const activeProjects = allProjects.filter(p => !p.isArchived);
  const favoriteProjects = activeProjects.filter(p => p.isFavorite);
  const regularProjects = activeProjects.filter(p => !p.isFavorite);

  // Render Favorites section
  if (favoriteProjects.length > 0 && favSection && favList) {
    favSection.classList.remove("hidden");
    favoriteProjects.forEach(p => {
      favList.appendChild(buildProjectSidebarElement(p));
    });
  } else if (favSection) {
    favSection.classList.add("hidden");
  }

  if (regularProjects.length === 0 && favoriteProjects.length === 0) {
    list.innerHTML = `
      <div style="font-size: 13px; opacity: 0.5; padding: 10px 8px; text-align: center; color: rgba(255,255,255,0.4)">
        No projects yet
      </div>
    `;
  } else {
    regularProjects.forEach((p) => {
      list.appendChild(buildProjectSidebarElement(p));
    });
  }

  // Render Archived section
  renderArchivedSection();
}

// Renders the collapsible Archived projects sidebar section
function renderArchivedSection() {
  const section = document.getElementById("archivedSidebarSection");
  const archivedList = document.getElementById("archivedList");
  if (!section || !archivedList) return;

  const archivedProjects = allProjects.filter(p => p.isArchived);

  if (archivedProjects.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  archivedList.innerHTML = "";

  archivedProjects.forEach(p => {
    const li = document.createElement("li");
    // archived-item class applies strikethrough styling
    li.className = "project-sidebar-item archived-item";

    const hash = document.createElement("span");
    hash.className = "project-hash";
    hash.textContent = "#";
    hash.style.color = p.color || "#808080";

    const nameSpan = document.createElement("span");
    nameSpan.className = "project-name-label";
    nameSpan.textContent = p.name;

    // Unarchive button instead of 3-dots menu
    const unarchiveBtn = document.createElement("button");
    unarchiveBtn.className = "unarchive-btn";
    unarchiveBtn.textContent = "Unarchive";
    unarchiveBtn.title = "Restore this project";
    unarchiveBtn.onclick = async (e) => {
      e.stopPropagation();
      // Send PUT request to unarchive by setting isArchived back to false
      const res = await apiFetch(`/api/projects/${p._id}`, {
        method: "PUT",
        body: JSON.stringify({ isArchived: false }),
      });
      if (res && res.success) {
        p.isArchived = false; // Update local project object
        renderProjects();
        showToast(`"${p.name}" restored!`, "success");
      }
    };

    const actionsGroup = document.createElement("div");
    actionsGroup.className = "project-actions-group";
    actionsGroup.appendChild(unarchiveBtn);

    // Clicking the item name navigates into the archived project
    const btn = document.createElement("button");
    btn.className = "project-sidebar-btn";
    btn.onclick = () => selectProject(p._id);
    btn.append(hash, nameSpan, actionsGroup);

    li.appendChild(btn);
    archivedList.appendChild(li);
  });

  // Wire up collapsible toggle (only once, via a flag)
  const header = document.getElementById("archivedToggleHeader");
  if (header && !header._wiredToggle) {
    header._wiredToggle = true;
    header.addEventListener("click", () => {
      const chevron = document.getElementById("archivedChevron");
      const isExpanded = !archivedList.classList.contains("hidden");
      if (isExpanded) {
        archivedList.classList.add("hidden");
        chevron?.classList.remove("expanded");
      } else {
        archivedList.classList.remove("hidden");
        chevron?.classList.add("expanded");
      }
    });
  }
}

function buildProjectSidebarElement(p) {
  const pendingCount = allTodos.filter(
    t => !t.completed && t.project && (t.project._id === p._id || t.project === p._id)
  ).length;

  const li = document.createElement("li");
  li.className = "project-sidebar-item";

  const btn = document.createElement("button");
  btn.className = `project-sidebar-btn${currentProjectId === p._id ? " active" : ""}`;
  btn.onclick = () => selectProject(p._id);

  const hash = document.createElement("span");
  hash.className = "project-hash";
  hash.textContent = p.isFavorite ? "⭐" : "#";
  hash.style.color = p.isFavorite ? "#f59e0b" : (p.color || "#808080");

  const nameSpan = document.createElement("span");
  nameSpan.className = "project-name-label";
  nameSpan.textContent = p.name;

  const countBadge = document.createElement("span");
  countBadge.className = "project-task-count";
  countBadge.textContent = pendingCount;

  // 3-dots Context Menu Trigger Button
  const menuBtn = document.createElement("button");
  menuBtn.className = "project-menu-trigger";
  menuBtn.innerHTML = "⋮";
  menuBtn.title = "Project options";
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    openProjectContextMenu(p._id, e.clientX, e.clientY);
  };

  const actionsGroup = document.createElement("div");
  actionsGroup.className = "project-actions-group";
  actionsGroup.append(countBadge, menuBtn);

  btn.append(hash, nameSpan, actionsGroup);
  li.appendChild(btn);
  return li;
}

async function selectProject(projectId) {
  currentProjectId = projectId;
  currentFilter = null;

  // Find project details
  const project = allProjects.find(p => p._id === projectId);
  if (!project) return;

  // Save to recently viewed
  addToRecentlyViewed(project._id, "project", project.name, project.color);

  // Update sidebar active selection
  document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
  renderProjects();

  // Update page title path
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) {
    titleEl.innerHTML = `<span style="font-size: 14px; display: block; opacity: 0.6; font-weight: 500; margin-bottom: 4px;">My Projects /</span> ${project.name}`;
  }

  // Load todos then render project-specific sectioned view
  const result = await apiFetch("/api/todos");
  if (!result) return;
  allTodos = result.data || [];
  renderProjects();
  renderProjectView(project);
}

// Override filterTodos to clear currentProjectId
const originalFilterTodos = filterTodos;
filterTodos = function (type) {
  currentProjectId = null;
  document.querySelectorAll(".project-sidebar-btn").forEach(b => b.classList.remove("active"));

  // Restore global add-task bar when leaving project view (but not for filters view - filterTodos handles that)
  if (type !== "filters") {
    const addTaskSection = document.getElementById("addTaskSection");
    if (addTaskSection) addTaskSection.style.display = "";
  }

  if (type === "all") {
    addToRecentlyViewed("inbox", "filter", "Inbox");
  } else if (type === "today") {
    addToRecentlyViewed("today", "filter", "Today");
  } else if (type === "completed") {
    addToRecentlyViewed("completed", "filter", "Completed");
  } else if (type === "pending") {
    addToRecentlyViewed("pending", "filter", "Pending");
  } else if (type === "upcoming") {
    addToRecentlyViewed("upcoming", "filter", "Upcoming");
  }

  return originalFilterTodos(type);
};

/* ================= PROJECT VIEW (SECTIONED) ================= */

function renderProjectView(project) {
  const list = document.getElementById("todo-list");
  const addTaskSection = document.getElementById("addTaskSection");
  if (!list) return;

  // Hide board view when showing project (sectioned) list
  const boardViewEl = document.getElementById("boardViewContainer");
  if (boardViewEl) boardViewEl.classList.add("hidden");

  // Hide the global add-task bar when inside a project (sections have their own)
  if (addTaskSection) addTaskSection.style.display = "none";

  const projectTodos = allTodos.filter(
    t => t.project && (t.project._id === project._id || t.project === project._id)
  );

  list.innerHTML = "";

  // Stats — same logic as renderTodos: don't show "0 done" when no tasks are completed.
  const done = projectTodos.filter(t => t.completed).length;
  const pending = projectTodos.length - done;
  const statsEl = document.getElementById("taskStats");
  if (statsEl) {
    if (projectTodos.length === 0) {
      statsEl.innerHTML = "";
    } else if (done === 0) {
      statsEl.innerHTML = `<span class="stat-remaining">${pending} task${pending !== 1 ? 's' : ''} remaining</span>`;
    } else if (done === projectTodos.length) {
      statsEl.innerHTML = `<span class="stat-done">✅ ${done} done</span>`;
    } else {
      statsEl.innerHTML = `<span class="stat-done">✅ ${done} done</span> · ${pending} remaining`;
    }
  }

  // --- Unsectioned tasks ---
  const unsectionedTodos = projectTodos.filter(t => !t.sectionId);
  if (unsectionedTodos.length > 0) {
    const block = document.createElement("div");
    block.className = "project-section-block";
    const header = document.createElement("div");
    header.className = "unsectioned-header";
    header.textContent = "No Section";
    block.appendChild(header);
    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.dataset.sectionId = "";
    ul.dataset.projectId = project._id;
    sortTodosForRender(unsectionedTodos).forEach(todo => {
      const li = buildTodoItem(todo);
      li.dataset.todoId = todo._id;
      ul.appendChild(li);
    });
    block.appendChild(ul);
    list.appendChild(block);
    // Enable drag-and-drop on unsectioned list
    initSortableList(ul, null, project._id);
  }

  // --- Sectioned blocks ---
  const sections = [...(project.sections || [])].sort((a, b) => a.order - b.order);
  sections.forEach(section => {
    const sectionTodos = projectTodos.filter(
      t => t.sectionId && t.sectionId.toString() === section._id.toString()
    );
    list.appendChild(buildSectionBlock(project._id, section, sectionTodos));
  });

  // --- Add Section bar ---
  const addSectionBar = document.createElement("button");
  addSectionBar.className = "add-section-bar";
  addSectionBar.innerHTML = `<span>+</span> Add Section`;

  const addSectionForm = document.createElement("div");
  addSectionForm.className = "add-section-inline-form hidden";
  addSectionForm.innerHTML = `
    <input type="text" placeholder="Section name..." id="newSectionNameInput" maxlength="100" />
    <button class="add-section-save-btn" id="addSectionSaveBtn">Add</button>
    <button class="add-section-cancel-btn" id="addSectionCancelBtn">Cancel</button>
  `;

  addSectionBar.onclick = () => {
    addSectionBar.style.display = "none";
    addSectionForm.classList.remove("hidden");
    addSectionForm.querySelector("#newSectionNameInput").focus();
  };

  addSectionForm.querySelector("#addSectionCancelBtn").onclick = () => {
    addSectionBar.style.display = "";
    addSectionForm.classList.add("hidden");
  };

  addSectionForm.querySelector("#addSectionSaveBtn").onclick = async () => {
    const nameInput = addSectionForm.querySelector("#newSectionNameInput");
    const name = nameInput.value.trim();
    if (!name) { showToast("Section name is required", "error"); return; }
    const result = await apiFetch(`/api/projects/${project._id}/sections`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!result) return;
    showToast(`Section "${name}" created!`, "success");
    await loadProjects();
    selectProject(project._id);
  };

  addSectionForm.querySelector("#newSectionNameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addSectionForm.querySelector("#addSectionSaveBtn").click();
    if (e.key === "Escape") addSectionForm.querySelector("#addSectionCancelBtn").click();
  });

  list.appendChild(addSectionBar);
  list.appendChild(addSectionForm);
}

function buildSectionBlock(projectId, section, todos) {
  const isCollapsed = collapsedSections.includes(section._id.toString());

  const block = document.createElement("div");
  block.className = "project-section-block";

  // ── Header ──
  const header = document.createElement("div");
  header.className = "section-header";

  const collapseBtn = document.createElement("button");
  collapseBtn.className = `section-collapse-btn${isCollapsed ? " collapsed" : ""}`;
  collapseBtn.title = isCollapsed ? "Expand section" : "Collapse section";
  collapseBtn.innerHTML = "▼";

  const titleSpan = document.createElement("span");
  titleSpan.className = "section-title";
  titleSpan.textContent = section.name;

  const countBadge = document.createElement("span");
  countBadge.className = "section-task-count";
  countBadge.textContent = todos.filter(t => !t.completed).length;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "section-actions";

  const renameBtn = document.createElement("button");
  renameBtn.className = "section-rename-btn";
  renameBtn.title = "Rename section";
  renameBtn.innerHTML = "✏️";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "section-delete-btn";
  deleteBtn.title = "Delete section";
  deleteBtn.innerHTML = "🗑";

  actionsDiv.append(renameBtn, deleteBtn);
  header.append(collapseBtn, titleSpan, countBadge, actionsDiv);

  // ── Task list wrapper (collapsible) ──
  const tasksWrapper = document.createElement("div");
  tasksWrapper.className = `section-tasks-wrapper${isCollapsed ? " collapsed" : ""}`;

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.dataset.sectionId = section._id.toString();
  ul.dataset.projectId = projectId;

  sortTodosForRender(todos).forEach(todo => {
    const li = buildTodoItem(todo);
    li.dataset.todoId = todo._id;
    ul.appendChild(li);
  });

  // ── Inline add-task form ──
  const addTaskBtn = document.createElement("button");
  addTaskBtn.className = "section-add-task-btn";
  addTaskBtn.innerHTML = `<span style="font-size:16px">+</span> Add task`;

  const inlineForm = document.createElement("div");
  inlineForm.className = "section-inline-form hidden";
  inlineForm.innerHTML = `
    <input type="text" placeholder="Task name..." class="section-task-input" maxlength="200" />
    <div class="section-inline-form-meta">
      <input type="date" class="section-task-date" title="Due date" />
      <select class="section-task-priority" title="Priority">
        <option value="medium">🟡 Medium</option>
        <option value="high">🔴 High</option>
        <option value="low">🔵 Low</option>
      </select>
    </div>
    <div class="section-inline-form-actions">
      <button class="section-inline-cancel-btn">Cancel</button>
      <button class="section-inline-save-btn">Add Task</button>
    </div>
  `;

  addTaskBtn.onclick = () => {
    addTaskBtn.style.display = "none";
    inlineForm.classList.remove("hidden");
    inlineForm.querySelector(".section-task-input").focus();
  };

  inlineForm.querySelector(".section-inline-cancel-btn").onclick = () => {
    addTaskBtn.style.display = "";
    inlineForm.classList.add("hidden");
    inlineForm.querySelector(".section-task-input").value = "";
  };

  inlineForm.querySelector(".section-inline-save-btn").onclick = async () => {
    const rawText = inlineForm.querySelector(".section-task-input").value.trim();
    if (!rawText) { showToast("Please enter a task name", "error"); return; }
    const parsed = parseTaskNaturalLanguage(rawText);
    const text = parsed.cleanText || rawText;
    const dueDate = parsed.dueDate || inlineForm.querySelector(".section-task-date").value || undefined;
    const priority = parsed.priority || inlineForm.querySelector(".section-task-priority").value || "medium";
    const result = await apiFetch("/api/todos", {
      method: "POST",
      body: JSON.stringify({ text, dueDate, priority, project: projectId, sectionId: section._id }),
    });
    if (!result) return;
    showToast("Task added!", "success");
    const project = allProjects.find(p => p._id === projectId);
    const res = await apiFetch("/api/todos");
    if (res) { allTodos = res.data || []; renderProjects(); }
    if (project) renderProjectView(project);
  };

  inlineForm.querySelector(".section-task-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") inlineForm.querySelector(".section-inline-save-btn").click();
    if (e.key === "Escape") inlineForm.querySelector(".section-inline-cancel-btn").click();
  });

  tasksWrapper.append(ul, addTaskBtn, inlineForm);

  // Enable drag-and-drop on this section's task list
  initSortableList(ul, section._id.toString(), projectId);

  // ── Collapse toggle ──
  collapseBtn.onclick = () => {
    const id = section._id.toString();
    if (collapsedSections.includes(id)) {
      collapsedSections = collapsedSections.filter(s => s !== id);
      tasksWrapper.classList.remove("collapsed");
      collapseBtn.classList.remove("collapsed");
    } else {
      collapsedSections.push(id);
      tasksWrapper.classList.add("collapsed");
      collapseBtn.classList.add("collapsed");
    }
    localStorage.setItem("collapsedSections", JSON.stringify(collapsedSections));
  };

  // ── Rename ──
  renameBtn.onclick = (e) => {
    e.stopPropagation();
    const input = document.createElement("input");
    input.className = "section-rename-input";
    input.value = section.name;
    input.maxLength = 100;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (!newName) { input.replaceWith(titleSpan); return; }
      const result = await apiFetch(`/api/projects/${projectId}/sections/${section._id}`, {
        method: "PUT",
        body: JSON.stringify({ name: newName }),
      });
      if (!result) { input.replaceWith(titleSpan); return; }
      showToast("Section renamed!", "success");
      await loadProjects();
      selectProject(projectId);
    };

    input.onblur = save;
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); input.onblur = null; save(); }
      if (ev.key === "Escape") { input.onblur = null; input.replaceWith(titleSpan); }
    });
  };

  // ── Delete ──
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    openDeleteSectionModal(projectId, section._id, section.name);
  };

  block.append(header, tasksWrapper);
  return block;
}

function sortTodosForRender(todos) {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // Respect manual order first (drag-and-drop)
    const orderA = typeof a.order === "number" ? a.order : Infinity;
    const orderB = typeof b.order === "number" ? b.order : Infinity;
    if (orderA !== orderB) return orderA - orderB;
    const hasDateA = !!a.dueDate, hasDateB = !!b.dueDate;
    if (hasDateA !== hasDateB) return hasDateA ? -1 : 1;
    if (hasDateA && hasDateB) {
      const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (diff !== 0) return diff;
    }
    const pw = { high: 3, medium: 2, low: 1 };
    const wDiff = (pw[b.priority] || 2) - (pw[a.priority] || 2);
    if (wDiff !== 0) return wDiff;
    return (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
      (b.createdAt ? new Date(b.createdAt).getTime() : 0);
  });
}

/* ================= DRAG-AND-DROP REORDERING ================= */

/**
 * Persists the new order of tasks to the server after a drag-and-drop.
 * @param {HTMLUListElement} ul - the sorted list
 * @param {string|null} sectionId - section id, or null for global / unsectioned
 * @param {string|null} projectId - project id, or null for global inbox view
 */
async function persistReorder(ul, sectionId, projectId) {
  const items = [];
  ul.querySelectorAll(":scope > li.todo-item").forEach((li, idx) => {
    const todoId = li.dataset.todoId;
    if (!todoId) return;
    const item = { id: todoId, order: idx };
    // Only include sectionId mutation when we're inside a project view
    if (projectId !== null) {
      item.sectionId = sectionId || null;
    }
    items.push(item);
  });

  if (items.length === 0) return;

  // Optimistically update allTodos in memory so re-renders are stable
  items.forEach(({ id, order, sectionId: sid }) => {
    const t = allTodos.find(t => t._id === id);
    if (t) {
      t.order = order;
      if (sid !== undefined) t.sectionId = sid;
    }
  });

  try {
    await apiFetch("/api/todos/reorder", {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  } catch (err) {
    console.error("Reorder failed", err);
  }
}

/**
 * Attaches SortableJS to a <ul> task list.
 * Handles cross-section drops inside project views.
 * @param {HTMLElement} ul - the list element
 * @param {string|null} sectionId - section._id string, or null for unsectioned / global
 * @param {string|null} projectId - project._id string, or null for global inbox view
 */
function initSortableList(ul, sectionId, projectId) {
  if (typeof Sortable === "undefined") return; // SortableJS not loaded yet

  // Destroy any previously attached instance to avoid double-binding
  if (ul._sortableInstance) {
    ul._sortableInstance.destroy();
  }

  ul._sortableInstance = Sortable.create(ul, {
    group: projectId ? `project-${projectId}` : "global-list",
    animation: 150,
    ghostClass: "todo-drag-ghost",
    chosenClass: "todo-drag-chosen",
    dragClass: "todo-drag-active",
    handle: ".todo-item-main-row",  // drag handle is the main row
    delay: 100,
    delayOnTouchOnly: true,
    forceFallback: false,
    onStart() {
      document.body.classList.add("dragging");
    },
    onEnd(evt) {
      document.body.classList.remove("dragging");
      // When item moved to another list, evt.to is the target <ul>
      const fromList = evt.from;
      const toList = evt.to;

      if (fromList === toList) {
        // Same-list reorder
        persistReorder(fromList, sectionId, projectId);
      } else {
        // Cross-section drop — determine the target section id from the list's data attribute
        const targetSectionId = toList.dataset.sectionId || null;
        persistReorder(fromList, sectionId, projectId);
        persistReorder(toList, targetSectionId, projectId);
      }
    },
  });
}

function buildTodoItem(todo) {
  const li = document.createElement("li");
  li.className = `todo-item priority-${todo.priority || "medium"}`;

  const mainRow = document.createElement("div");
  mainRow.className = "todo-item-main-row";

  // ── 1. Circular Checkbox on the Far Left ──
  const checkBtn = document.createElement("button");
  checkBtn.className = `todo-checkbox-btn priority-${todo.priority || "medium"}${todo.completed ? " checked" : ""}`;
  checkBtn.title = todo.completed ? "Mark incomplete" : "Mark complete";
  checkBtn.setAttribute("aria-label", todo.completed ? "Mark incomplete" : "Mark complete");

  const checkCircle = document.createElement("span");
  checkCircle.className = "todo-checkbox-circle";
  checkCircle.innerHTML = `
    <svg class="todo-check-icon" viewBox="0 0 16 16" width="10" height="10">
      <path fill="currentColor" d="M13.485 3.515a1 1 0 0 1 0 1.414l-6.364 6.364a1 1 0 0 1-1.414 0L2.515 8.1a1 1 0 0 1 1.414-1.414l2.478 2.478 5.664-5.649a1 1 0 0 1 1.414 0z"/>
    </svg>
  `;
  checkBtn.appendChild(checkCircle);

  // ── 2. Content Column ──
  const contentCol = document.createElement("div");
  contentCol.className = "todo-content-col";
  contentCol.style.cursor = "pointer";
  contentCol.onclick = () => openTaskDetailsDrawer(todo);

  const text = document.createElement("span");
  text.className = "todo-title-text" + (todo.completed ? " completed" : "");
  text.textContent = todo.text;
  contentCol.appendChild(text);

  checkBtn.onclick = (e) => {
    e.stopPropagation();
    const shouldShowConfetti = !todo.completed;
    checkBtn.disabled = true;
    if (!todo.completed) {
      checkBtn.classList.add("checked");
      text.classList.add("completing");
    } else {
      checkBtn.classList.remove("checked");
      text.classList.remove("completed");
      text.classList.add("uncompleting");
    }
    setTimeout(async () => {
      const success = await toggleTodo(todo._id);
      if (success && shouldShowConfetti && typeof showConfetti === "function") {
        showConfetti();
      }
    }, 350);
  };

  const metaBadges = document.createElement("div");
  metaBadges.className = "todo-meta-badges";

  if (todo.dueDate) {
    const date = new Date(todo.dueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isOverdue = !todo.completed && date < today;
    const dateBadge = document.createElement("span");
    dateBadge.className = `todo-date-badge${isOverdue ? " overdue" : ""}`;
    dateBadge.textContent = `📅 ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}${isOverdue ? " · Overdue" : ""}`;
    if (isOverdue) dateBadge.title = "This task is overdue!";
    metaBadges.appendChild(dateBadge);
  }

  if (todo.project && !currentProjectId) {
    const projectBadge = document.createElement("span");
    projectBadge.className = "todo-project-tag";
    const dot = document.createElement("span");
    dot.className = "todo-project-dot";
    dot.style.backgroundColor = todo.project.color || "#808080";
    const pName = document.createElement("span");
    pName.textContent = todo.project.name;
    projectBadge.append(dot, pName);
    metaBadges.appendChild(projectBadge);
  }

  setupNestedSubtasks(todo, li, metaBadges);

  if (metaBadges.children.length > 0) contentCol.appendChild(metaBadges);

  // ── 3. Actions ──
  const actions = document.createElement("div");
  actions.className = "todo-actions";

  const editBtn = document.createElement("button");
  editBtn.innerText = "✏️";
  editBtn.className = "todo-action-btn edit-action-btn";
  editBtn.title = "Quick edit task";
  editBtn.onclick = (e) => {
    e.stopPropagation();
    openInlineTodoEditor(todo, li);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.innerText = "🗑";
  deleteBtn.className = "todo-action-btn delete-action-btn";
  deleteBtn.title = "Delete task";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    openDeleteModal(todo._id, todo.text);
  };

  actions.append(editBtn, deleteBtn);
  mainRow.append(checkBtn, contentCol, actions);
  li.prepend(mainRow);
  return li;
}

function openTaskDetailsDrawer(todo) {
  activeDrawerTodo = todo;
  drawerSubtasks = Array.isArray(todo.subtasks) ? todo.subtasks.map(s => ({ ...s })) : [];

  const drawer = document.getElementById("taskDetailsDrawer");
  if (!drawer) return;

  document.getElementById("drawerTaskText").value = todo.text || "";
  document.getElementById("drawerTaskDueDate").value = todo.dueDate ? todo.dueDate.slice(0, 10) : "";
  document.getElementById("drawerTaskPriority").value = todo.priority || "medium";
  document.getElementById("drawerTaskRecurrence").value = todo.recurrence || "none";
  document.getElementById("drawerTaskDescription").value = todo.description || "";
  const reminderInput = document.getElementById("drawerTaskReminderDate");
  if (reminderInput) {
    reminderInput.value = todo.reminderDate ? new Date(todo.reminderDate).toISOString().slice(0, 16) : "";
  }

  renderDrawerProjectOptions(todo.project ? todo.project._id : "");
  renderDrawerSectionOptions(todo.project ? todo.project._id : "");

  renderDrawerSubtasks();
  drawer.classList.remove("hidden");
}

function closeTaskDetailsDrawer() {
  activeDrawerTodo = null;
  drawerSubtasks = [];
  document.getElementById("taskDetailsDrawer")?.classList.add("hidden");
}

function renderDrawerProjectOptions(selectedProjectId) {
  const projectSelect = document.getElementById("drawerTaskProject");
  if (!projectSelect) return;

  projectSelect.innerHTML = "<option value=''>Inbox (No Project)</option>";
  allProjects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project._id;
    option.textContent = project.name;
    if (selectedProjectId && project._id === selectedProjectId.toString()) {
      option.selected = true;
    }
    projectSelect.appendChild(option);
  });
}

function renderDrawerSectionOptions(projectId) {
  const sectionSelect = document.getElementById("drawerTaskSection");
  if (!sectionSelect) return;

  sectionSelect.innerHTML = "<option value=''>No Section</option>";
  const project = allProjects.find((p) => p._id === projectId);
  if (!project || !Array.isArray(project.sections)) return;

  project.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((section) => {
      const option = document.createElement("option");
      option.value = section._id;
      option.textContent = section.name;
      if (
        activeDrawerTodo &&
        activeDrawerTodo.sectionId &&
        activeDrawerTodo.sectionId.toString() === section._id.toString()
      ) {
        option.selected = true;
      }
      sectionSelect.appendChild(option);
    });
}

/* ================= SUBTASK UTILITIES & NESTED UI ================= */

/**
 * Persists subtasks update directly to backend
 */
async function updateTodoSubtasks(todoId, subtasks) {
  const result = await apiFetch(`/api/todos/${todoId}`, {
    method: "PUT",
    body: JSON.stringify({ subtasks }),
  });
  if (result && result.data) {
    const idx = allTodos.findIndex((t) => t._id === todoId);
    if (idx !== -1) {
      allTodos[idx].subtasks = result.data.subtasks || subtasks;
    }
  }
  return result;
}

/**
 * Renders nested subtasks checklist and progress badge for a task item
 */
function setupNestedSubtasks(todo, li, metaBadges) {
  if (!Array.isArray(todo.subtasks)) {
    todo.subtasks = [];
  }

  const subtasksWrapper = document.createElement("div");
  subtasksWrapper.className = "todo-nested-subtasks-wrapper hidden";

  const subtaskBadge = document.createElement("span");
  subtaskBadge.className = "todo-subtask-badge";
  subtaskBadge.title = "Click to toggle subtasks checklist";

  function refreshBadge() {
    const total = todo.subtasks.length;
    const completed = todo.subtasks.filter((s) => s.completed).length;

    if (total === 0) {
      subtaskBadge.style.display = "none";
      return;
    }

    subtaskBadge.style.display = "inline-flex";
    const isAll = completed === total;
    if (isAll) {
      subtaskBadge.classList.add("all-completed");
    } else {
      subtaskBadge.classList.remove("all-completed");
    }
    const isExpanded = !subtasksWrapper.classList.contains("hidden");
    subtaskBadge.innerHTML = `<span>☑️ ${completed}/${total}</span><span class="todo-subtask-toggle-btn ${isExpanded ? "expanded" : ""}">▾</span>`;
  }

  function renderSubtaskItems() {
    subtasksWrapper.innerHTML = "";

    todo.subtasks.forEach((subtask, sIdx) => {
      const itemEl = document.createElement("div");
      itemEl.className = "todo-nested-subtask-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "todo-nested-subtask-checkbox";
      cb.checked = !!subtask.completed;

      const span = document.createElement("span");
      span.className = `todo-nested-subtask-text${subtask.completed ? " completed" : ""}`;
      span.textContent = subtask.text;

      cb.onchange = async (e) => {
        e.stopPropagation();
        todo.subtasks[sIdx].completed = cb.checked;
        if (cb.checked) {
          span.classList.add("completed");
        } else {
          span.classList.remove("completed");
        }
        refreshBadge();
        await updateTodoSubtasks(todo._id, todo.subtasks);
      };

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "todo-nested-subtask-delete";
      delBtn.textContent = "✕";
      delBtn.title = "Delete subtask";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        todo.subtasks.splice(sIdx, 1);
        renderSubtaskItems();
        refreshBadge();
        await updateTodoSubtasks(todo._id, todo.subtasks);
      };

      itemEl.append(cb, span, delBtn);
      subtasksWrapper.appendChild(itemEl);
    });

    // Inline add subtask input row
    const addRow = document.createElement("div");
    addRow.className = "todo-nested-add-row";

    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = "Add a subtask... (press Enter)";
    addInput.className = "todo-nested-add-input";
    addInput.maxLength = 150;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "todo-nested-add-btn";
    addBtn.textContent = "Add";

    const handleAdd = async (e) => {
      e.stopPropagation();
      const val = addInput.value.trim();
      if (!val) return;
      todo.subtasks.push({ text: val, completed: false });
      addInput.value = "";
      renderSubtaskItems();
      refreshBadge();
      await updateTodoSubtasks(todo._id, todo.subtasks);
    };

    addBtn.onclick = handleAdd;
    addInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd(e);
      }
    };

    addRow.append(addInput, addBtn);
    subtasksWrapper.appendChild(addRow);
  }

  subtaskBadge.onclick = (e) => {
    e.stopPropagation();
    const isHidden = subtasksWrapper.classList.toggle("hidden");
    const chevron = subtaskBadge.querySelector(".todo-subtask-toggle-btn");
    if (chevron) {
      chevron.classList.toggle("expanded", !isHidden);
    }
    if (!isHidden) {
      renderSubtaskItems();
      const input = subtasksWrapper.querySelector(".todo-nested-add-input");
      if (input) input.focus();
    }
  };

  refreshBadge();
  metaBadges.appendChild(subtaskBadge);
  li.appendChild(subtasksWrapper);
}

function renderDrawerSubtasks() {
  const list = document.getElementById("drawerSubtaskList");
  if (!list) return;

  list.innerHTML = "";

  const total = drawerSubtasks.length;
  const completed = drawerSubtasks.filter(s => s.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const countEl = document.getElementById("drawerSubtaskProgressText");
  if (countEl) countEl.textContent = `${completed} of ${total} (${percent}%)`;

  const barEl = document.getElementById("drawerProgressBar");
  if (barEl) barEl.style.width = `${percent}%`;

  if (drawerSubtasks.length === 0) {
    list.innerHTML = `<li class="drawer-subtask-empty">No subtasks yet</li>`;
    return;
  }

  drawerSubtasks.forEach((subtask, index) => {
    const li = document.createElement("li");
    li.className = "drawer-subtask-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!subtask.completed;
    checkbox.onchange = () => {
      drawerSubtasks[index].completed = checkbox.checked;
      renderDrawerSubtasks();
    };

    const label = document.createElement("span");
    label.textContent = subtask.text;
    if (subtask.completed) {
      label.classList.add("completed");
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "drawer-subtask-remove";
    removeBtn.title = "Delete subtask";
    removeBtn.textContent = "✕";
    removeBtn.onclick = () => {
      drawerSubtasks.splice(index, 1);
      renderDrawerSubtasks();
    };

    li.append(checkbox, label, removeBtn);
    list.appendChild(li);
  });
}

function addDrawerSubtask() {
  const input = document.getElementById("newSubtaskInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    showToast("Enter a subtask name", "error");
    return;
  }

  drawerSubtasks.push({ text, completed: false });
  input.value = "";
  renderDrawerSubtasks();
  input.focus();
}

async function saveDrawerTaskChanges() {
  if (!activeDrawerTodo) return;

  const text = document.getElementById("drawerTaskText")?.value.trim();
  if (!text) {
    showToast("Task name is required", "error");
    return;
  }

  const dueDateValue = document.getElementById("drawerTaskDueDate")?.value || null;
  const projectValue = document.getElementById("drawerTaskProject")?.value || "";
  const sectionValue = document.getElementById("drawerTaskSection")?.value || "";

  const reminderValue = document.getElementById("drawerTaskReminderDate")?.value || "";
  const updateBody = {
    text,
    dueDate: dueDateValue || undefined,
    priority: document.getElementById("drawerTaskPriority")?.value || "medium",
    recurrence: document.getElementById("drawerTaskRecurrence")?.value || "none",
    reminderDate: reminderValue ? new Date(reminderValue).toISOString() : undefined,
    project: projectValue || undefined,
    sectionId: sectionValue || undefined,
    description: document.getElementById("drawerTaskDescription")?.value || "",
    subtasks: drawerSubtasks,
  };

  const result = await apiFetch(`/api/todos/${activeDrawerTodo._id}`, {
    method: "PUT",
    body: JSON.stringify(updateBody),
  });

  if (!result) return;

  showToast("Task updated successfully", "success");
  closeTaskDetailsDrawer();

  if (currentProjectId) {
    const project = allProjects.find((p) => p._id === currentProjectId);
    const res = await apiFetch("/api/todos");
    if (res) {
      allTodos = res.data.todos || res.data || [];
      renderProjects();
    }
    if (project) renderProjectView(project);
    return;
  }
  loadTodos(currentFilter);
}

function openInlineTodoEditor(todo, li) {
  const editor = document.createElement("div");
  editor.className = "todo-inline-editor";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "todo-inline-input";
  titleInput.value = todo.text;

  const dueDateInput = document.createElement("input");
  dueDateInput.type = "date";
  dueDateInput.className = "todo-inline-input";
  dueDateInput.value = todo.dueDate ? todo.dueDate.slice(0, 10) : "";

  const prioritySelect = document.createElement("select");
  prioritySelect.className = "todo-inline-select";
  [
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "low", label: "Low" },
  ].forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    if (todo.priority === option.value) opt.selected = true;
    prioritySelect.appendChild(opt);
  });

  const recurrenceSelect = document.createElement("select");
  recurrenceSelect.className = "todo-inline-select";
  [
    { value: "none", label: "No repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ].forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    if (todo.recurrence === option.value) opt.selected = true;
    recurrenceSelect.appendChild(opt);
  });

  const reminderInput = document.createElement("input");
  reminderInput.type = "datetime-local";
  reminderInput.className = "todo-inline-input";
  reminderInput.value = todo.reminderDate ? new Date(todo.reminderDate).toISOString().slice(0, 16) : "";

  const saveBtn = document.createElement("button");
  saveBtn.className = "todo-inline-save-btn";
  saveBtn.textContent = "Save";
  saveBtn.onclick = async () => {
    const result = await apiFetch(`/api/todos/${todo._id}`, {
      method: "PUT",
      body: JSON.stringify({
        text: titleInput.value.trim(),
        dueDate: dueDateInput.value || undefined,
        priority: prioritySelect.value,
        recurrence: recurrenceSelect.value,
        reminderDate: reminderInput.value ? new Date(reminderInput.value).toISOString() : undefined,
      }),
    });
    if (!result) return;
    showToast("Task updated", "success");
    if (currentProjectId) {
      const project = allProjects.find((p) => p._id === currentProjectId);
      const res = await apiFetch("/api/todos");
      if (res) {
        allTodos = res.data || [];
        renderProjects();
      }
      if (project) renderProjectView(project);
      return;
    }
    loadTodos(currentFilter);
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "todo-inline-cancel-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => {
    if (currentProjectId) {
      const project = allProjects.find((p) => p._id === currentProjectId);
      if (project) renderProjectView(project);
      return;
    }
    loadTodos(currentFilter);
  };

  editor.append(titleInput, dueDateInput, prioritySelect, recurrenceSelect, reminderInput, saveBtn, cancelBtn);
  li.innerHTML = "";
  li.appendChild(editor);
}

/* ================= DELETE SECTION MODAL ================= */

function openDeleteSectionModal(projectId, sectionId, name) {
  sectionProjectIdForDelete = projectId;
  sectionIdToDelete = sectionId;
  sectionNameToDelete = name;
  const modal = document.getElementById("deleteSectionModal");
  const nameSpan = document.getElementById("deleteSectionName");
  if (modal && nameSpan) {
    nameSpan.textContent = name;
    modal.classList.remove("hidden");
  }
}

function closeDeleteSectionModal() {
  sectionProjectIdForDelete = null;
  sectionIdToDelete = null;
  sectionNameToDelete = "";
  document.getElementById("deleteSectionModal")?.classList.add("hidden");
}
sidebarcollapsedkey = false;

async function submitDeleteSection() {
  if (!sectionIdToDelete || !sectionProjectIdForDelete) return;
  const projectId = sectionProjectIdForDelete;
  const sectionId = sectionIdToDelete;
  const name = sectionNameToDelete;
  closeDeleteSectionModal();
  const result = await apiFetch(`/api/projects/${projectId}/sections/${sectionId}`, { method: "DELETE" });
  if (!result) return;
  showToast(`Section "${name}" and its tasks deleted.`, "success");
  await loadProjects();
  selectProject(projectId);
}

/* ================= ADD PROJECT MODAL ================= */

function openAddProjectModal() {
  const modal = document.getElementById("addProjectModal");
  const input = document.getElementById("projectNameInput");
  if (modal && input) {
    input.value = "";
    selectedProjectColor = "#ff7066"; // reset to first color

    // reset selection ring
    document.querySelectorAll("#colorSelector .color-circle").forEach(circle => {
      if (circle.dataset.color === selectedProjectColor) {
        circle.classList.add("selected");
      } else {
        circle.classList.remove("selected");
      }
    });

    modal.classList.remove("hidden");
    input.focus();
  }
}

function closeAddProjectModal() {
  document.getElementById("addProjectModal")?.classList.add("hidden");
}

async function submitAddProject() {
  const input = document.getElementById("projectNameInput");
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    showToast("Please enter a project name", "error");
    return;
  }

  const result = await apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      color: selectedProjectColor,
    }),
  });

  if (!result) return;

  showToast(`Project "${name}" created!`, "success");
  closeAddProjectModal();

  // Reload projects & todos
  await loadProjects();
  // Automatically select the new project
  if (result.data && result.data._id) {
    selectProject(result.data._id);
  }
}

/* ================= DELETE PROJECT MODAL ================= */

function openDeleteProjectModal(id, name) {
  projectIdToDelete = id;
  projectNameToDelete = name;

  const modal = document.getElementById("deleteProjectModal");
  const nameSpan = document.getElementById("deleteProjectName");

  if (modal && nameSpan) {
    nameSpan.textContent = name;
    modal.classList.remove("hidden");
  }
}

function closeDeleteProjectModal() {
  projectIdToDelete = null;
  projectNameToDelete = "";
  document.getElementById("deleteProjectModal")?.classList.add("hidden");
}

async function submitDeleteProject() {
  if (!projectIdToDelete) return;

  const id = projectIdToDelete;
  const name = projectNameToDelete;
  closeDeleteProjectModal();

  const result = await apiFetch(`/api/projects/${id}`, {
    method: "DELETE",
  });

  if (!result) return;

  showToast(`Project "${name}" and all associated tasks deleted.`, "success");

  // Remove from recently viewed if present
  recentlyViewed = recentlyViewed.filter(item => item.id !== id);
  localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed));

  // Reset filter to All Tasks
  currentProjectId = null;
  const allBtn = document.querySelector('[data-filter="all"]');
  if (allBtn) {
    document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
  }

  await loadProjects();
  await filterTodos("all");
}

/* ================= MODERN CUSTOM TOOLTIPS ================= */

function initCustomTooltips() {
  const tooltip = document.getElementById("customTooltip");
  if (!tooltip) return;

  let activeTarget = null;

  function showTooltip(target) {
    const text = target.getAttribute("data-tooltip") || target.getAttribute("title");
    if (!text || !text.trim()) return;

    if (target.hasAttribute("title")) {
      target.setAttribute("data-tooltip", target.getAttribute("title"));
      target.removeAttribute("title");
    }

    tooltip.textContent = target.getAttribute("data-tooltip");
    tooltip.classList.remove("hidden");
    activeTarget = target;

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

    // Boundary checks
    if (top + tooltipRect.height > window.innerHeight - 8) {
      top = rect.top - tooltipRect.height - 8;
    }
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function hideTooltip() {
    tooltip.classList.add("hidden");
    activeTarget = null;
  }

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip], [title]");
    if (target && target !== tooltip) {
      showTooltip(target);
    }
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-tooltip], [title]");
    if (target && target === activeTarget) {
      hideTooltip();
    }
  });

  document.addEventListener("click", () => {
    hideTooltip();
  });

  window.addEventListener("scroll", () => {
    if (activeTarget) hideTooltip();
  }, { passive: true });
}

/* ================= COMMAND PALETTE SEARCH LOGIC ================= */

function updateSearchNavArrows() {
  const container = document.getElementById("searchResults");
  const upBtn = document.getElementById("searchNavUp");
  const downBtn = document.getElementById("searchNavDown");
  if (!container || !upBtn || !downBtn) return;

  if (searchItems.length === 0) {
    upBtn.classList.add("disabled");
    downBtn.classList.add("disabled");
    return;
  }

  const isScrollable = container.scrollHeight > (container.clientHeight + 4);
  let isAtTop = false;
  let isAtBottom = false;

  if (isScrollable) {
    const isScrolledToTop = container.scrollTop <= 4;
    const isScrolledToBottom = (container.scrollTop + container.clientHeight) >= (container.scrollHeight - 4);

    isAtTop = isScrolledToTop;
    isAtBottom = isScrolledToBottom;
  } else {
    isAtTop = selectedSearchIndex <= 0;
    isAtBottom = selectedSearchIndex >= searchItems.length - 1;
  }

  if (isAtTop) {
    upBtn.classList.add("disabled");
  } else {
    upBtn.classList.remove("disabled");
  }

  if (isAtBottom) {
    downBtn.classList.add("disabled");
  } else {
    downBtn.classList.remove("disabled");
  }
}

let searchEventsInitialized = false;

function openSearchModal() {
  const modal = document.getElementById("searchModal");
  const input = document.getElementById("searchInput");
  if (modal && input) {
    input.value = "";
    selectedSearchIndex = -1;
    modal.classList.remove("hidden");
    input.focus();
    renderSearchResults();

    if (!searchEventsInitialized) {
      searchEventsInitialized = true;
      const resultsContainer = document.getElementById("searchResults");
      resultsContainer?.addEventListener("scroll", updateSearchNavArrows, { passive: true });

      document.getElementById("searchNavUp")?.addEventListener("click", () => {
        const container = document.getElementById("searchResults");
        if (selectedSearchIndex > 0) {
          selectedSearchIndex--;
          highlightSearchItem(selectedSearchIndex);
        } else if (container) {
          container.scrollBy({ top: -60, behavior: "smooth" });
        }
        updateSearchNavArrows();
      });

      document.getElementById("searchNavDown")?.addEventListener("click", () => {
        const container = document.getElementById("searchResults");
        if (selectedSearchIndex < searchItems.length - 1) {
          selectedSearchIndex++;
          highlightSearchItem(selectedSearchIndex);
        } else if (container) {
          container.scrollBy({ top: 60, behavior: "smooth" });
        }
        updateSearchNavArrows();
      });
    }

    setTimeout(updateSearchNavArrows, 50);
  }
}

function closeSearchModal() {
  document.getElementById("searchModal")?.classList.add("hidden");
  // Clear the live search filter so the task list resets when modal is closed
  if (currentSearch) {
    currentSearch = "";
    currentPage = 1;
    if (!currentProjectId) {
      loadTodos(currentFilter);
    }
  }
}

function addToRecentlyViewed(id, type, label, color = null) {
  // Check if already in list
  recentlyViewed = recentlyViewed.filter(item => item.id !== id);
  // Add to top
  recentlyViewed.unshift({ id, type, label, color });
  // Limit to 3 items
  if (recentlyViewed.length > 3) {
    recentlyViewed.pop();
  }
  localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed));
}

function renderSearchResults() {
  const resultsContainer = document.getElementById("searchResults");
  const query = document.getElementById("searchInput")?.value.trim().toLowerCase() || "";

  if (!resultsContainer) return;
  resultsContainer.innerHTML = "";

  searchItems = [];

  // 1. Navigation items (static commands)
  const navCommands = [
    { id: "all", type: "filter", label: "Go to Inbox / All Tasks", shortcut: "G then I", icon: "📋" },
    { id: "today", type: "filter", label: "Go to Today", shortcut: "G then T", icon: "📆" },
    { id: "completed", type: "filter", label: "Go to Completed", shortcut: "G then C", icon: "✅" },
    { id: "pending", type: "filter", label: "Go to Pending", shortcut: "G then P", icon: "⏳" },
    { id: "upcoming", type: "filter", label: "Go to Upcoming", shortcut: "G then U", icon: "⏳" }
  ];

  if (!query) {
    if (recentlyViewed.length > 0) {
      const rvHeader = document.createElement("div");
      rvHeader.className = "search-results-header";
      rvHeader.textContent = "Recently viewed";
      resultsContainer.appendChild(rvHeader);

      recentlyViewed.forEach(item => {
        const itemObj = {
          id: item.id,
          type: item.type,
          label: item.type === "project" ? `# ${item.label}` : item.label,
          category: "Recently viewed",
          icon: item.type === "project" ? "#" : "📋",
          color: item.color
        };
        searchItems.push(itemObj);
        resultsContainer.appendChild(createSearchItemElement(itemObj, searchItems.length - 1));
      });
    }

    // Show Navigation section
    const navHeader = document.createElement("div");
    navHeader.className = "search-results-header";
    navHeader.textContent = "Navigation";
    resultsContainer.appendChild(navHeader);

    navCommands.forEach(cmd => {
      const itemObj = {
        id: cmd.id,
        type: "filter",
        label: cmd.label,
        category: "Navigation",
        shortcut: cmd.shortcut,
        icon: cmd.icon
      };
      searchItems.push(itemObj);
      resultsContainer.appendChild(createSearchItemElement(itemObj, searchItems.length - 1));
    });
  } else {
    // Filtering phase: filter matching projects and navigation options
    const matchedProjects = allProjects.filter(p => p.name.toLowerCase().includes(query));
    const matchedCommands = navCommands.filter(cmd => cmd.label.toLowerCase().includes(query));

    if (matchedProjects.length > 0) {
      const projHeader = document.createElement("div");
      projHeader.className = "search-results-header";
      projHeader.textContent = "My Projects";
      resultsContainer.appendChild(projHeader);

      matchedProjects.forEach(p => {
        const itemObj = {
          id: p._id,
          type: "project",
          label: p.name,
          category: "My Projects",
          icon: "#",
          color: p.color
        };
        searchItems.push(itemObj);
        resultsContainer.appendChild(createSearchItemElement(itemObj, searchItems.length - 1));
      });
    }

    const matchedTasks = allTodos.filter(t => t.text.toLowerCase().includes(query)).slice(0, 6);
    if (matchedTasks.length > 0) {
      const taskHeader = document.createElement("div");
      taskHeader.className = "search-results-header";
      taskHeader.textContent = "Tasks";
      resultsContainer.appendChild(taskHeader);

      matchedTasks.forEach(todo => {
        const itemObj = {
          id: todo._id,
          type: "todo",
          label: todo.text,
          category: "Tasks",
          icon: todo.completed ? "✅" : "📝",
          subLabel: todo.project ? todo.project.name : "Inbox"
        };
        searchItems.push(itemObj);
        resultsContainer.appendChild(createSearchItemElement(itemObj, searchItems.length - 1));
      });
    }

    if (matchedCommands.length > 0) {
      const cmdHeader = document.createElement("div");
      cmdHeader.className = "search-results-header";
      cmdHeader.textContent = "Navigation";
      resultsContainer.appendChild(cmdHeader);

      matchedCommands.forEach(cmd => {
        const itemObj = {
          id: cmd.id,
          type: "filter",
          label: cmd.label,
          category: "Navigation",
          shortcut: cmd.shortcut,
          icon: cmd.icon
        };
        searchItems.push(itemObj);
        resultsContainer.appendChild(createSearchItemElement(itemObj, searchItems.length - 1));
      });
    }

    if (searchItems.length === 0) {
      resultsContainer.innerHTML = `
        <div style="font-size: 14px; opacity: 0.6; padding: 20px; text-align: center; color: var(--color-text);">
          No matching results found
        </div>
      `;
    }
  }

  // Adjust highlight selection
  if (searchItems.length > 0) {
    selectedSearchIndex = 0;
    highlightSearchItem(0);
  } else {
    selectedSearchIndex = -1;
  }
  updateSearchNavArrows();
}

function createSearchItemElement(item, index) {
  const div = document.createElement("div");
  div.className = "search-item";
  div.dataset.index = index;

  // Icon column
  const iconSpan = document.createElement("span");
  iconSpan.className = "search-item-icon";
  if (item.icon === "#") {
    iconSpan.textContent = "#";
    iconSpan.style.color = item.color || "#808080";
    iconSpan.style.fontWeight = "bold";
  } else {
    iconSpan.textContent = item.icon;
  }

  // Label
  const labelSpan = document.createElement("span");
  labelSpan.className = "search-item-label";
  labelSpan.textContent = item.label;

  div.append(iconSpan, labelSpan);

  // Category badge (e.g. "My Projects") or shortcut keycap
  if (item.shortcut) {
    const shortcutSpan = document.createElement("span");
    shortcutSpan.className = "search-item-shortcut";
    shortcutSpan.textContent = item.shortcut;
    div.appendChild(shortcutSpan);
  } else if (item.category) {
    const categorySpan = document.createElement("span");
    categorySpan.className = "search-item-category";
    categorySpan.textContent = item.category;
    div.appendChild(categorySpan);
  }

  // Event handlers
  div.onmouseover = () => {
    selectedSearchIndex = index;
    highlightSearchItem(index);
  };

  div.onclick = () => {
    executeSearchItem(item);
  };

  return div;
}

function highlightSearchItem(index) {
  const container = document.getElementById("searchResults");
  if (!container) return;

  const items = container.querySelectorAll(".search-item");
  items.forEach(el => el.classList.remove("highlighted"));

  const target = container.querySelector(`.search-item[data-index="${index}"]`);
  if (target) {
    target.classList.add("highlighted");
    target.scrollIntoView({ block: "nearest" });
  }
  updateSearchNavArrows();
}

function executeSearchItem(item) {
  closeSearchModal();

  if (item.type === "project") {
    selectProject(item.id);
  } else if (item.type === "filter") {
    const btn = document.querySelector(`[data-filter="${item.id}"]`);
    if (btn) {
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterTodos(item.id);
    }
  } else if (item.type === "todo") {
    const todo = allTodos.find(t => t._id === item.id);
    if (todo) {
      openTaskDetailsDrawer(todo);
    }
  }
}

function handleSearchKeydown(e) {
  if (searchItems.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (selectedSearchIndex < searchItems.length - 1) {
      selectedSearchIndex++;
      highlightSearchItem(selectedSearchIndex);
    }
    updateSearchNavArrows();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (selectedSearchIndex > 0) {
      selectedSearchIndex--;
      highlightSearchItem(selectedSearchIndex);
    }
    updateSearchNavArrows();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (selectedSearchIndex >= 0 && selectedSearchIndex < searchItems.length) {
      executeSearchItem(searchItems[selectedSearchIndex]);
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeSearchModal();
  }
}

// Global keyboard shortcut G sequence tracker
let lastKeyPressed = "";
let lastKeyTime = 0;

function handleGlobalShortcut(e) {
  // If user typing in inputs, ignore shortcuts
  const activeEl = document.activeElement;
  const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT" || activeEl.tagName === "TEXTAREA");

  // Ctrl+K or Cmd+K to open Search palette
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openSearchModal();
    return;
  }

  // Handle escape when modal is open (handled separately inside search modal if focused, but as fallback here)
  if (e.key === "Escape") {
    closeSearchModal();
    closeAddProjectModal();
    closeDeleteProjectModal();
    closeDeleteSectionModal();
    return;
  }

  if (isInput) return;

  const key = e.key.toLowerCase();
  const now = Date.now();

  // Sequence detection: "G" then <key>
  if (lastKeyPressed === "g" && (now - lastKeyTime < 1000)) {
    let handled = false;

    if (key === "i" || key === "h") { // G then I or G then H -> Inbox
      handled = true;
      executeSearchItem({ type: "filter", id: "all" });
    } else if (key === "t") { // G then T -> Today
      handled = true;
      executeSearchItem({ type: "filter", id: "today" });
    } else if (key === "c") { // G then C -> Completed
      handled = true;
      executeSearchItem({ type: "filter", id: "completed" });
    } else if (key === "p") { // G then P -> Pending
      handled = true;
      executeSearchItem({ type: "filter", id: "pending" });
    } else if (key === "u") { // G then U -> Upcoming
      handled = true;
      executeSearchItem({ type: "filter", id: "upcoming" });
    }

    if (handled) {
      lastKeyPressed = ""; // reset
      e.preventDefault();
      return;
    }
  }

  if (key === "g") {
    lastKeyPressed = "g";
    lastKeyTime = now;
  } else {
    lastKeyPressed = ""; // clear if any other key pressed
  }
}

/* ==========================================================================
   NEW TODOIST-INSPIRED FEATURES MODULE (Context Menu, Board View, CSV, Favorites)
========================================================================== */

let activeContextMenuProjectId = null;
let currentViewMode = "list"; // "list" or "board"
let currentSortOption = "default"; // "default", "dueDate", "priority", "title"

// Initialize new feature handlers when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setupProjectContextMenuEvents();
  setupDisplayMenuEvents();
  setupCsvImportListener();
});

/* --- PROJECT CONTEXT MENU LOGIC --- */
function openProjectContextMenu(projectId, x, y) {
  activeContextMenuProjectId = projectId;
  const menu = document.getElementById("projectContextMenu");
  if (!menu) return;

  const project = allProjects.find(p => p._id === projectId);
  const favBtn = document.getElementById("ctxFavoriteBtn");
  if (favBtn && project) {
    favBtn.textContent = project.isFavorite ? "⭐ Remove from Favorites" : "⭐ Add to Favorites";
  }

  // Adjust bounds to stay inside viewport
  const menuWidth = 200;
  const posX = Math.min(x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(y, window.innerHeight - 260);

  menu.style.top = `${posY}px`;
  menu.style.left = `${posX}px`;
  menu.classList.remove("hidden");
}

function closeProjectContextMenu() {
  const menu = document.getElementById("projectContextMenu");
  if (menu) menu.classList.add("hidden");
}

function setupProjectContextMenuEvents() {
  // Hide menu on outside window click
  window.addEventListener("click", (e) => {
    if (!e.target.closest("#projectContextMenu") && !e.target.classList.contains("project-menu-trigger")) {
      closeProjectContextMenu();
    }
  });

  // Favorite toggle
  document.getElementById("ctxFavoriteBtn")?.addEventListener("click", async () => {
    if (!activeContextMenuProjectId) return;
    const project = allProjects.find(p => p._id === activeContextMenuProjectId);
    if (!project) return;
    
    closeProjectContextMenu();
    const updatedStatus = !project.isFavorite;

    const res = await apiFetch(`/api/projects/${project._id}`, {
      method: "PUT",
      body: JSON.stringify({ isFavorite: updatedStatus }),
    });

    if (res && res.success) {
      project.isFavorite = updatedStatus;
      renderProjects();
      showToast(updatedStatus ? "Added to Favorites" : "Removed from Favorites", "success");
    }
  });

  // Edit Project Name
  document.getElementById("ctxEditBtn")?.addEventListener("click", () => {
    if (!activeContextMenuProjectId) return;
    const project = allProjects.find(p => p._id === activeContextMenuProjectId);
    closeProjectContextMenu();
    if (!project) return;
    
    const newName = prompt("Enter new project name:", project.name);
    if (newName && newName.trim() && newName.trim() !== project.name) {
      apiFetch(`/api/projects/${project._id}`, {
        method: "PUT",
        body: JSON.stringify({ name: newName.trim() }),
      }).then(res => {
        if (res && res.success) {
          project.name = newName.trim();
          renderProjects();
          showToast("Project renamed!", "success");
        }
      });
    }
  });

  // Duplicate Project
  document.getElementById("ctxDuplicateBtn")?.addEventListener("click", async () => {
    if (!activeContextMenuProjectId) return;
    const projectId = activeContextMenuProjectId;
    closeProjectContextMenu();

    const res = await apiFetch(`/api/projects/${projectId}/duplicate`, {
      method: "POST",
    });

    if (res && res.data) {
      allProjects.push(res.data);
      await loadTodos();
      renderProjects();
      showToast("Project duplicated!", "success");
    }
  });

  // Export to CSV
  document.getElementById("ctxExportCsvBtn")?.addEventListener("click", async () => {
    if (!activeContextMenuProjectId) return;
    const project = allProjects.find(p => p._id === activeContextMenuProjectId);
    closeProjectContextMenu();

    const projectTodos = allTodos.filter(
      t => t.project && (t.project._id === activeContextMenuProjectId || t.project === activeContextMenuProjectId)
    );

    if (projectTodos.length === 0) {
      showToast("No tasks in this project to export.", "info");
      return;
    }

    let csv = "Title,Priority,Due Date,Status,Recurrence\n";
    projectTodos.forEach(t => {
      const title = `"${(t.text || t.title || '').replace(/"/g, '""')}"`;
      const priority = t.priority || "medium";
      const dueDate = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : "";
      const status = t.completed ? "Completed" : "Pending";
      const recurrence = t.recurrence || "none";
      csv += `${title},${priority},${dueDate},${status},${recurrence}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(project?.name || "project").replace(/[^a-z0-9]/gi, '_')}_tasks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV Export downloaded!", "success");
  });

  // Import from CSV
  document.getElementById("ctxImportCsvBtn")?.addEventListener("click", () => {
    closeProjectContextMenu();
    document.getElementById("csvFileInput")?.click();
  });

  // Archive Project
  document.getElementById("ctxArchiveBtn")?.addEventListener("click", async () => {
    if (!activeContextMenuProjectId) return;
    const project = allProjects.find(p => p._id === activeContextMenuProjectId);
    closeProjectContextMenu();
    if (!project) return;

    // Send PUT request to set isArchived to true
    const res = await apiFetch(`/api/projects/${project._id}`, {
      method: "PUT",
      body: JSON.stringify({ isArchived: true }),
    });

    if (res && res.success) {
      // Update the local project object's isArchived flag without re-fetching
      project.isArchived = true;
      // If we were viewing this project, go back to All Tasks
      if (currentProjectId === project._id) {
        currentProjectId = null;
        currentFilter = "all";
        document.getElementById("pageTitle").textContent = "Inbox";
        const addTaskSection = document.getElementById("addTaskSection");
        if (addTaskSection) addTaskSection.style.display = "";
        loadTodos("all", 1);
      }
      renderProjects();
      showToast(`"${project.name}" archived.`, "success");
    }
  });

  // Delete Project
  document.getElementById("ctxDeleteBtn")?.addEventListener("click", () => {
    if (!activeContextMenuProjectId) return;
    const project = allProjects.find(p => p._id === activeContextMenuProjectId);
    closeProjectContextMenu();
    if (project) openDeleteProjectModal(project._id, project.name);
  });
}

/* --- CSV IMPORT LISTENER --- */
function setupCsvImportListener() {
  const fileInput = document.getElementById("csvFileInput");
  if (!fileInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const targetProjectId = activeContextMenuProjectId || currentProjectId;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        showToast("CSV file is empty or missing data.", "error");
        return;
      }

      let createdCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, '').trim());
        if (cols[0]) {
          await apiFetch("/api/todos", {
            method: "POST",
            body: JSON.stringify({
              text: cols[0],
              priority: (cols[1] || "medium").toLowerCase(),
              dueDate: cols[2] || undefined,
              project: targetProjectId || undefined,
            }),
          });
          createdCount++;
        }
      }

      showToast(`Imported ${createdCount} tasks from CSV!`, "success");
      await loadTodos();
      fileInput.value = "";
    };

    reader.readAsText(file);
  });
}

/* --- DISPLAY MENU & SORTING LOGIC --- */
function setupDisplayMenuEvents() {
  const displayBtn = document.getElementById("displayMenuBtn");
  const displayDropdown = document.getElementById("displayDropdown");
  const viewListBtn = document.getElementById("viewListBtn");
  const viewBoardBtn = document.getElementById("viewBoardBtn");
  const sortBySelect = document.getElementById("sortBySelect");

  displayBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    displayDropdown?.classList.toggle("hidden");
  });

  window.addEventListener("click", (e) => {
    if (!e.target.closest(".display-menu-wrapper")) {
      displayDropdown?.classList.add("hidden");
    }
  });

  viewListBtn?.addEventListener("click", () => {
    currentViewMode = "list";
    viewListBtn.classList.add("active");
    viewBoardBtn?.classList.remove("active");
    applyViewMode();
  });

  viewBoardBtn?.addEventListener("click", () => {
    currentViewMode = "board";
    viewBoardBtn.classList.add("active");
    viewListBtn?.classList.remove("active");
    applyViewMode();
  });

  sortBySelect?.addEventListener("change", (e) => {
    currentSortOption = e.target.value;
    applyViewMode();
  });
}

// Function to apply view mode (List vs Board) & sorting
function applyViewMode() {
  const todoList = document.getElementById("todo-list");
  const boardView = document.getElementById("boardViewContainer");
  if (!todoList || !boardView) return;

  const sortedTodos = getSortedTodos([...allTodos]);

  if (currentViewMode === "board") {
    todoList.classList.add("hidden");
    boardView.classList.remove("hidden");
    renderBoardView(sortedTodos);
  } else {
    boardView.classList.add("hidden");
    todoList.classList.remove("hidden");
    renderTodos(sortedTodos);
  }
}

// Sort todos helper
function getSortedTodos(todos) {
  // Default ordering (when `default` is selected) matches previous renderTodos logic:
  // 1. incomplete first, 2. tasks with due dates before those without, 3. earlier due dates first,
  // 4. priority (high > medium > low), 5. creation time (newest first)
  if (currentSortOption === "dueDate") {
    return todos.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (currentSortOption === "priority") {
    const priorityWeight = { high: 1, medium: 2, low: 3 };
    return todos.sort((a, b) => (priorityWeight[a.priority] || 2) - (priorityWeight[b.priority] || 2));
  } else if (currentSortOption === "title") {
    return todos.sort((a, b) => (a.text || "").localeCompare(b.text || ""));
  }

  return todos.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    const hasDateA = !!a.dueDate;
    const hasDateB = !!b.dueDate;
    if (hasDateA !== hasDateB) {
      return hasDateA ? -1 : 1;
    }

    if (hasDateA && hasDateB) {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
    }

    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const weightA = priorityWeight[a.priority] || 2;
    const weightB = priorityWeight[b.priority] || 2;
    if (weightA !== weightB) {
      return weightB - weightA;
    }

    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
}

// Render Board (Kanban) View
function renderBoardView(todos) {
  const container = document.getElementById("boardViewContainer");
  if (!container) return;

  container.innerHTML = "";

  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  // Column 1: Pending / To Do
  const pendingCol = document.createElement("div");
  pendingCol.className = "kanban-column";
  pendingCol.innerHTML = `
    <div class="kanban-column-header">
      <span>⏳ Pending Tasks (${pendingTodos.length})</span>
    </div>
    <div class="kanban-card-list" id="kanbanPendingList"></div>
  `;

  // Column 2: Completed
  const completedCol = document.createElement("div");
  completedCol.className = "kanban-column";
  completedCol.innerHTML = `
    <div class="kanban-column-header">
      <span>✅ Completed (${completedTodos.length})</span>
    </div>
    <div class="kanban-card-list" id="kanbanCompletedList"></div>
  `;

  container.append(pendingCol, completedCol);

  const pendingListEl = pendingCol.querySelector("#kanbanPendingList");
  const completedListEl = completedCol.querySelector("#kanbanCompletedList");

  pendingTodos.forEach(t => pendingListEl.appendChild(buildKanbanCard(t)));
  completedTodos.forEach(t => completedListEl.appendChild(buildKanbanCard(t)));
}

function buildKanbanCard(t) {
  const card = document.createElement("div");
  card.className = "kanban-card";
  card.innerHTML = `
    <div class="kanban-card-title">${t.text}</div>
    <div class="kanban-card-meta">
      <span>🚩 ${t.priority || 'medium'}</span>
      <span>${t.dueDate ? '📅 ' + new Date(t.dueDate).toLocaleDateString() : ''}</span>
    </div>
  `;
  card.onclick = () => openTaskDetailsDrawer(t);
  return card;
}