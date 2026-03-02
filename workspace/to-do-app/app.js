/* =============================================================
   app.js — Taskly To-Do App  (complete, all features)
   Sections:
     1.  Constants & State
     2.  Storage
     3.  Task CRUD
     4.  Category CRUD
     5.  Date / Priority Helpers
     6.  Render Helpers
     7.  Render: Form Extras
     8.  Render: Sidebar
     9.  Render: Sort Toolbar
     10. Render: Task List
     11. Master Render
     12. Modal: Add Category
     13. Event Handlers
     14. Init
     15. Public API
   ============================================================= */
'use strict';

/* ─────────────────────────────────────────────────────────────
   1. CONSTANTS & STATE
───────────────────────────────────────────────────────────── */

const STORAGE_KEY      = 'taskly_tasks';
const STORAGE_KEY_CATS = 'taskly_categories';

const CATEGORY_COLORS = [
  '#6C63FF', '#EF4444', '#F59E0B', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

const PRIORITY_META = {
  high:   { label: 'High',   color: 'var(--color-priority-high)',   bg: '#FEE2E2' },
  medium: { label: 'Medium', color: 'var(--color-priority-medium)', bg: '#FEF9C3' },
  low:    { label: 'Low',    color: 'var(--color-priority-low)',    bg: '#DCFCE7' },
};

let state = {
  tasks:          [],
  categories:     [],
  filter:         'all',        // 'all' | 'active' | 'completed'
  activeCategory: null,         // null | category id
  sortBy:         'created',    // 'created' | 'dueDate' | 'priority'
  searchQuery:    '',
};

// Ephemeral form state (reset after each submission)
let pendingTagIds  = [];
let pendingPriority = null;
let pendingDueDate  = '';


/* ─────────────────────────────────────────────────────────────
   2. STORAGE
───────────────────────────────────────────────────────────── */

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); }
  catch { console.warn('Taskly: could not save tasks.'); }
}
function loadCategories() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CATS)) || []; }
  catch { return []; }
}
function saveCategories() {
  try { localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(state.categories)); }
  catch { console.warn('Taskly: could not save categories.'); }
}


/* ─────────────────────────────────────────────────────────────
   3. TASK CRUD
───────────────────────────────────────────────────────────── */

function createTask(title, options = {}) {
  return {
    id:        crypto.randomUUID(),
    title:     title.trim(),
    completed: false,
    createdAt: Date.now(),
    dueDate:   options.dueDate   || null,
    priority:  options.priority  || null,
    tags:      options.tags      ? [...options.tags] : [],
  };
}

function addTask(title, options = {}) {
  if (!title.trim()) return null;
  const task = createTask(title, options);
  state.tasks.unshift(task);
  saveTasks();
  return task;
}

function toggleTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (t) { t.completed = !t.completed; saveTasks(); }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
}

function updateTask(id, changes) {
  const t = state.tasks.find(t => t.id === id);
  if (t) { Object.assign(t, changes); saveTasks(); }
}


/* ─────────────────────────────────────────────────────────────
   4. CATEGORY CRUD
───────────────────────────────────────────────────────────── */

function addCategory(name, color) {
  if (!name.trim()) return null;
  const cat = { id: crypto.randomUUID(), name: name.trim(), color };
  state.categories.push(cat);
  saveCategories();
  return cat;
}

function deleteCategory(id) {
  state.categories = state.categories.filter(c => c.id !== id);
  state.tasks.forEach(t => { t.tags = t.tags.filter(tid => tid !== id); });
  if (state.activeCategory === id) state.activeCategory = null;
  pendingTagIds = pendingTagIds.filter(tid => tid !== id);
  saveCategories();
  saveTasks();
}

function getCategoryById(id) {
  return state.categories.find(c => c.id === id) || null;
}


/* ─────────────────────────────────────────────────────────────
   5. DATE / PRIORITY HELPERS
───────────────────────────────────────────────────────────── */

const TODAY_STR = new Date().toISOString().slice(0, 10);

function isOverdue(task) {
  return !task.completed && task.dueDate && task.dueDate < TODAY_STR;
}

function isDueToday(task) {
  return !task.completed && task.dueDate === TODAY_STR;
}

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, null: 3 };

function prioritySortVal(task) {
  return PRIORITY_ORDER[task.priority] ?? 3;
}


/* ─────────────────────────────────────────────────────────────
   6. RENDER HELPERS  (badges, task element)
───────────────────────────────────────────────────────────── */

function getVisibleTasks() {
  let tasks = [...state.tasks];

  if (state.filter === 'active')    tasks = tasks.filter(t => !t.completed);
  if (state.filter === 'completed') tasks = tasks.filter(t =>  t.completed);
  if (state.activeCategory)         tasks = tasks.filter(t => t.tags.includes(state.activeCategory));
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
  }

  switch (state.sortBy) {
    case 'dueDate':
      tasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return  1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      break;
    case 'priority':
      tasks.sort((a, b) => prioritySortVal(a) - prioritySortVal(b));
      break;
    default:
      tasks.sort((a, b) => b.createdAt - a.createdAt);
  }
  return tasks;
}

function buildPriorityBadge(priority) {
  if (!priority) return null;
  const meta = PRIORITY_META[priority];
  const span = document.createElement('span');
  span.className = `priority-badge priority-badge--${priority}`;
  span.textContent = meta.label;
  return span;
}

function buildDueDateBadge(task) {
  if (!task.dueDate) return null;
  const span = document.createElement('span');
  const overdue  = isOverdue(task);
  const dueToday = isDueToday(task);
  span.className = 'due-badge' +
    (overdue  ? ' due-badge--overdue'  : '') +
    (dueToday ? ' due-badge--today'    : '');
  span.innerHTML =
    `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">` +
    `<rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.25"/>` +
    `<path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>` +
    `</svg> ` + formatDueDate(task.dueDate) +
    (overdue  ? ' · Overdue'  : '') +
    (dueToday ? ' · Today'    : '');
  return span;
}

function buildTagBadge(categoryId) {
  const cat = getCategoryById(categoryId);
  if (!cat) return null;
  const span = document.createElement('span');
  span.className = 'tag-badge';
  span.textContent = cat.name;
  span.style.setProperty('--tag-color', cat.color);
  return span;
}

function buildTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item' +
    (task.completed   ? ' task-item--completed' : '') +
    (isOverdue(task)  ? ' task-item--overdue'   : '') +
    (task.priority    ? ` task-item--priority-${task.priority}` : '');
  li.dataset.id = task.id;

  // Checkbox
  const checkbox = document.createElement('button');
  checkbox.className = 'task-checkbox';
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute('aria-checked', String(task.completed));
  checkbox.setAttribute('aria-label', task.completed ? 'Mark incomplete' : 'Mark complete');
  checkbox.innerHTML = task.completed
    ? `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 8.5L6.5 10.5L11.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5"/></svg>`;

  // Body
  const body = document.createElement('div');
  body.className = 'task-body';

  const titleEl = document.createElement('span');
  titleEl.className = 'task-title';
  titleEl.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  meta.id = `task-meta-${task.id}`;

  // Priority badge
  const pb = buildPriorityBadge(task.priority);
  if (pb) meta.appendChild(pb);

  // Due date badge
  const db = buildDueDateBadge(task);
  if (db) meta.appendChild(db);

  // Tag badges
  task.tags.forEach(tid => {
    const tb = buildTagBadge(tid);
    if (tb) meta.appendChild(tb);
  });

  body.appendChild(titleEl);
  body.appendChild(meta);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-icon btn-danger task-delete';
  deleteBtn.setAttribute('aria-label', `Delete "${task.title}"`);
  deleteBtn.innerHTML =
    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">` +
    `<path d="M1.75 3.5H12.25M5.25 3.5V2.625C5.25 2.14175 5.64175 1.75 6.125 1.75H7.875C8.35825 1.75 8.75 2.14175 8.75 2.625V3.5M10.5 3.5L9.91667 10.7917C9.8713 11.3373 9.41356 11.75 8.86578 11.75H5.13422C4.58644 11.75 4.1287 11.3373 4.08333 10.7917L3.5 3.5H10.5Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  li.appendChild(checkbox);
  li.appendChild(body);
  li.appendChild(deleteBtn);
  return li;
}


/* ─────────────────────────────────────────────────────────────
   7. RENDER: FORM EXTRAS  (tag picker + priority + date)
───────────────────────────────────────────────────────────── */

function renderFormExtras() {
  const extras = document.getElementById('taskFormExtras');
  if (!extras) return;
  extras.innerHTML = '';

  // ── Priority selector ────────────────────────────────────
  const prioWrap = document.createElement('div');
  prioWrap.className = 'form-extra-group';

  const prioLabel = document.createElement('span');
  prioLabel.className = 'form-extra-label';
  prioLabel.textContent = 'Priority';

  const prioButtons = document.createElement('div');
  prioButtons.className = 'priority-picker';
  prioButtons.id = 'priorityPicker';

  ['high', 'medium', 'low'].forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `priority-chip priority-chip--${p}${pendingPriority === p ? ' priority-chip--selected' : ''}`;
    btn.dataset.priority = p;
    btn.textContent = PRIORITY_META[p].label;
    prioButtons.appendChild(btn);
  });

  prioWrap.appendChild(prioLabel);
  prioWrap.appendChild(prioButtons);
  extras.appendChild(prioWrap);

  // ── Due date picker ──────────────────────────────────────
  const dateWrap = document.createElement('div');
  dateWrap.className = 'form-extra-group';

  const dateLabel = document.createElement('label');
  dateLabel.className = 'form-extra-label';
  dateLabel.htmlFor = 'dueDateInput';
  dateLabel.textContent = 'Due date';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'dueDateInput';
  dateInput.className = 'form-control form-control--date';
  dateInput.value = pendingDueDate;
  dateInput.min = TODAY_STR;

  dateWrap.appendChild(dateLabel);
  dateWrap.appendChild(dateInput);
  extras.appendChild(dateWrap);

  // ── Tag picker (only if categories exist) ───────────────
  if (state.categories.length > 0) {
    const tagWrap = document.createElement('div');
    tagWrap.className = 'form-extra-group form-extra-group--full';

    const tagLabel = document.createElement('span');
    tagLabel.className = 'form-extra-label';
    tagLabel.textContent = 'Tags';

    const chips = document.createElement('div');
    chips.className = 'tag-picker';
    chips.id = 'tagPicker';

    state.categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `tag-chip${pendingTagIds.includes(cat.id) ? ' tag-chip--selected' : ''}`;
      chip.dataset.tagId = cat.id;
      chip.textContent = cat.name;
      chip.style.setProperty('--tag-color', cat.color);
      chips.appendChild(chip);
    });

    tagWrap.appendChild(tagLabel);
    tagWrap.appendChild(chips);
    extras.appendChild(tagWrap);
  }
}


/* ─────────────────────────────────────────────────────────────
   8. RENDER: SIDEBAR
───────────────────────────────────────────────────────────── */

function renderFilterList() {
  const el = document.getElementById('filterList');
  if (!el) return;
  el.innerHTML = '';
  [
    { value: 'all',       label: '📋  All tasks'  },
    { value: 'active',    label: '⏳  Active'      },
    { value: 'completed', label: '✅  Completed'   },
  ].forEach(f => {
    const li  = document.createElement('li');
    const btn = document.createElement('button');
    btn.className  = `filter-btn${state.filter === f.value && !state.activeCategory ? ' filter-btn--active' : ''}`;
    btn.dataset.filter = f.value;
    btn.textContent    = f.label;
    li.appendChild(btn);
    el.appendChild(li);
  });
}

function renderCategoryList() {
  const el = document.getElementById('categoryList');
  if (!el) return;
  el.innerHTML = '';

  if (state.categories.length === 0) {
    const li = document.createElement('li');
    li.className   = 'category-empty';
    li.textContent = 'No categories yet';
    el.appendChild(li);
    return;
  }

  state.categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'category-item';

    const btn = document.createElement('button');
    btn.className = `category-btn${state.activeCategory === cat.id ? ' category-btn--active' : ''}`;
    btn.dataset.categoryId = cat.id;

    const dot = document.createElement('span');
    dot.className = 'category-dot';
    dot.style.backgroundColor = cat.color;

    const name = document.createElement('span');
    name.className   = 'category-name';
    name.textContent = cat.name;

    const count = state.tasks.filter(t => t.tags.includes(cat.id)).length;
    const countEl = document.createElement('span');
    countEl.className   = 'category-count';
    countEl.textContent = count;

    btn.appendChild(dot);
    btn.appendChild(name);
    btn.appendChild(countEl);

    const delBtn = document.createElement('button');
    delBtn.className = 'category-delete';
    delBtn.dataset.deleteCategoryId = cat.id;
    delBtn.setAttribute('aria-label', `Delete category "${cat.name}"`);
    delBtn.innerHTML =
      `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">` +
      `<path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

    li.appendChild(btn);
    li.appendChild(delBtn);
    el.appendChild(li);
  });
}


/* ─────────────────────────────────────────────────────────────
   9. RENDER: SORT TOOLBAR
───────────────────────────────────────────────────────────── */

function renderSortToolbar() {
  const sortEl = document.getElementById('toolbarSort');
  if (!sortEl) return;
  sortEl.innerHTML = '';

  const label = document.createElement('label');
  label.className = 'sort-label';
  label.htmlFor = 'sortSelect';
  label.textContent = 'Sort by:';

  const select = document.createElement('select');
  select.id = 'sortSelect';
  select.className = 'sort-select';
  [
    { value: 'created',  label: 'Date created' },
    { value: 'dueDate',  label: 'Due date'      },
    { value: 'priority', label: 'Priority'      },
  ].forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === state.sortBy) o.selected = true;
    select.appendChild(o);
  });

  select.addEventListener('change', e => {
    state.sortBy = e.target.value;
    renderTaskList();
  });

  sortEl.appendChild(label);
  sortEl.appendChild(select);
}


/* ─────────────────────────────────────────────────────────────
   10. RENDER: TASK LIST
───────────────────────────────────────────────────────────── */

function renderTaskList() {
  const taskList   = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const taskCount  = document.getElementById('taskCount');
  const visible    = getVisibleTasks();

  taskList.innerHTML = '';

  if (visible.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    const frag = document.createDocumentFragment();
    visible.forEach(t => frag.appendChild(buildTaskElement(t)));
    taskList.appendChild(frag);
  }

  const active = state.tasks.filter(t => !t.completed).length;
  taskCount.textContent = `${active} task${active !== 1 ? 's' : ''} remaining`;
}


/* ─────────────────────────────────────────────────────────────
   11. MASTER RENDER
───────────────────────────────────────────────────────────── */

function render() {
  renderFilterList();
  renderCategoryList();
  renderFormExtras();
  renderSortToolbar();
  renderTaskList();
}


/* ─────────────────────────────────────────────────────────────
   12. MODAL: ADD CATEGORY
───────────────────────────────────────────────────────────── */

function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = bodyHTML;
  document.getElementById('modalFooter').innerHTML  = footerHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');
  const first = document.getElementById('modal')
    .querySelector('button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if (first) first.focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalBody').innerHTML   = '';
  document.getElementById('modalFooter').innerHTML = '';
}

function openAddCategoryModal() {
  const defaultColor = CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length];
  openModal('New Category',
    `<div class="form-group">
       <label class="form-label" for="catNameInput">Category name</label>
       <input type="text" id="catNameInput" class="form-control"
         placeholder="e.g. Work, Personal, Shopping…" maxlength="30" autocomplete="off"/>
     </div>
     <div class="form-group">
       <span class="form-label">Colour</span>
       <div class="color-picker" id="colorPicker" role="group" aria-label="Pick a colour">
         ${CATEGORY_COLORS.map(c =>
           `<button type="button" class="color-swatch${c === defaultColor ? ' color-swatch--selected' : ''}"
             data-color="${c}" style="background-color:${c}" aria-label="${c}"
             aria-pressed="${c === defaultColor}"></button>`
         ).join('')}
       </div>
     </div>`,
    `<button class="btn btn-secondary" id="modalCancelBtn">Cancel</button>
     <button class="btn btn-primary"   id="modalSaveCatBtn">Add Category</button>`
  );

  document.getElementById('modalCancelBtn') .addEventListener('click', closeModal);
  document.getElementById('modalSaveCatBtn').addEventListener('click', handleSaveCategoryModal);
  document.getElementById('catNameInput')   .addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSaveCategoryModal();
  });
  document.getElementById('colorPicker').addEventListener('click', e => {
    const sw = e.target.closest('.color-swatch');
    if (!sw) return;
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.remove('color-swatch--selected');
      s.setAttribute('aria-pressed', 'false');
    });
    sw.classList.add('color-swatch--selected');
    sw.setAttribute('aria-pressed', 'true');
  });
}

function handleSaveCategoryModal() {
  const input = document.getElementById('catNameInput');
  const name  = input?.value.trim();
  if (!name) {
    input?.classList.add('form-control--error');
    setTimeout(() => input?.classList.remove('form-control--error'), 600);
    return;
  }
  const sw    = document.querySelector('.color-swatch--selected');
  const color = sw ? sw.dataset.color : CATEGORY_COLORS[0];
  addCategory(name, color);
  closeModal();
  render();
}


/* ─────────────────────────────────────────────────────────────
   13. EVENT HANDLERS
───────────────────────────────────────────────────────────── */

function handleFormSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('taskInput');
  const title = input.value.trim();
  if (!title) {
    input.focus();
    input.classList.add('task-input--error');
    setTimeout(() => input.classList.remove('task-input--error'), 600);
    return;
  }
  // Read date input value at submit time
  const dateInput = document.getElementById('dueDateInput');
  pendingDueDate  = dateInput?.value || '';

  addTask(title, {
    tags:     [...pendingTagIds],
    priority: pendingPriority,
    dueDate:  pendingDueDate || null,
  });

  // Reset ephemeral state
  input.value    = '';
  pendingTagIds  = [];
  pendingPriority = null;
  pendingDueDate  = '';
  input.focus();
  render();
}

function handleTaskListClick(e) {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.closest('.task-checkbox')) {
    toggleTask(id);
    render();
    return;
  }
  if (e.target.closest('.task-delete')) {
    // Delete from state immediately so no re-render can resurrect the task.
    // Animate the DOM node that is still briefly visible, then let the next
    // render (triggered right after) clean it up.
    deleteTask(id);
    item.classList.add('task-item--removing');
    render();
    return;
  }
}

function handleFilterClick(e) {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  state.filter = btn.dataset.filter;
  state.activeCategory = null;
  render();
}

function handleCategoryListClick(e) {
  const delBtn = e.target.closest('[data-delete-category-id]');
  if (delBtn) { deleteCategory(delBtn.dataset.deleteCategoryId); render(); return; }
  const catBtn = e.target.closest('.category-btn');
  if (catBtn) {
    const id = catBtn.dataset.categoryId;
    state.activeCategory = state.activeCategory === id ? null : id;
    render();
  }
}

function handleFormExtrasClick(e) {
  // Priority chip
  const prioChip = e.target.closest('.priority-chip');
  if (prioChip) {
    const p = prioChip.dataset.priority;
    pendingPriority = pendingPriority === p ? null : p;
    // Update UI without full re-render
    document.querySelectorAll('.priority-chip').forEach(c => {
      c.classList.toggle('priority-chip--selected', c.dataset.priority === pendingPriority);
    });
    return;
  }
  // Tag chip
  const tagChip = e.target.closest('.tag-chip');
  if (tagChip) {
    const id = tagChip.dataset.tagId;
    if (pendingTagIds.includes(id)) {
      pendingTagIds = pendingTagIds.filter(t => t !== id);
      tagChip.classList.remove('tag-chip--selected');
    } else {
      pendingTagIds.push(id);
      tagChip.classList.add('tag-chip--selected');
    }
  }
}

function handleInputKeydown(e) {
  if (e.key === 'Enter') document.getElementById('taskForm').requestSubmit();
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function handleEscKey(e) {
  if (e.key === 'Escape') closeModal();
}


/* ─────────────────────────────────────────────────────────────
   14. INIT
───────────────────────────────────────────────────────────── */

function attachEventListeners() {
  document.getElementById('taskForm')
    .addEventListener('submit', handleFormSubmit);
  document.getElementById('taskInput')
    .addEventListener('keydown', handleInputKeydown);
  document.getElementById('taskList')
    .addEventListener('click', handleTaskListClick);
  document.getElementById('filterList')
    .addEventListener('click', handleFilterClick);
  document.getElementById('categoryList')
    .addEventListener('click', handleCategoryListClick);
  document.getElementById('addCategoryBtn')
    .addEventListener('click', openAddCategoryModal);
  document.getElementById('taskFormExtras')
    .addEventListener('click', handleFormExtrasClick);
  document.getElementById('modalOverlay')
    .addEventListener('click', handleModalOverlayClick);
  document.getElementById('modalClose')
    .addEventListener('click', closeModal);
  document.addEventListener('keydown', handleEscKey);
}

function init() {
  state.tasks      = loadTasks();
  state.categories = loadCategories();
  attachEventListeners();
  render();
}

document.addEventListener('DOMContentLoaded', init);


/* ─────────────────────────────────────────────────────────────
   15. PUBLIC API
───────────────────────────────────────────────────────────── */
window.Taskly = {
  state,
  addTask, toggleTask, deleteTask, updateTask,
  addCategory, deleteCategory, getCategoryById,
  saveTasks, saveCategories,
  render, openModal, closeModal,
};
