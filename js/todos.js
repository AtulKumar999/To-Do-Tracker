/**
 * ==========================================================================
 * Trackify - Todo Tracker Module
 * Full CRUD, Event Delegation, Validation, Search, Filter, Sort & Analytics
 * ==========================================================================
 */

class TodoTracker {
  constructor() {
    this.todos = StorageManager.getTodos();
    this.currentFilter = 'all'; // all | active | completed | high | today
    this.currentCategory = 'all';
    this.currentSort = 'due-asc';
    this.searchQuery = '';
    this.editingTodoId = null;

    // DOM Elements
    this.listContainer = document.getElementById('todoListContainer');
    this.form = document.getElementById('todoForm');
    this.modal = document.getElementById('todoModal');
    this.modalTitle = document.getElementById('todoModalTitle');
    this.openModalBtn = document.getElementById('openTodoModalBtn');
    this.cancelModalBtn = document.getElementById('cancelTodoModalBtn');
    this.closeModalBtn = document.getElementById('closeTodoModalBtn');

    // Inputs
    this.titleInput = document.getElementById('todoTitleInput');
    this.categoryInput = document.getElementById('todoCategoryInput');
    this.priorityInput = document.getElementById('todoPriorityInput');
    this.dueDateInput = document.getElementById('todoDueDateInput');
    this.notesInput = document.getElementById('todoNotesInput');

    // Search and Filter controls
    this.searchInput = document.getElementById('todoSearchInput');
    this.searchClearBtn = document.getElementById('todoSearchClearBtn');
    this.filterChips = document.getElementById('todoFilterChips');
    this.categoryFilter = document.getElementById('todoCategoryFilter');
    this.sortSelect = document.getElementById('todoSortSelect');

    // Stat metric elements
    this.statTotal = document.getElementById('todoStatTotal');
    this.statActive = document.getElementById('todoStatActive');
    this.statCompleted = document.getElementById('todoStatCompleted');
    this.statRate = document.getElementById('todoStatRate');
    this.navBadge = document.getElementById('navTodoCount');
    this.progressBar = document.getElementById('todoProgressBar');
    this.progressText = document.getElementById('todoProgressText');

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
  }

  /**
   * Bind event listeners including EVENT DELEGATION
   */
  bindEvents() {
    // 1. EVENT DELEGATION on the list container
    if (this.listContainer) {
      this.listContainer.addEventListener('click', (e) => this.handleListClick(e));
      this.listContainer.addEventListener('change', (e) => this.handleListChange(e));
    }

    // 2. Modal open & close
    if (this.openModalBtn) {
      this.openModalBtn.addEventListener('click', () => this.openCreateModal());
    }
    if (this.cancelModalBtn) {
      this.cancelModalBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => this.closeModal());
    }

    // Close modal on backdrop click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // 3. Form submission with validation
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Clear input validation state on typing
    [this.titleInput, this.categoryInput, this.priorityInput, this.dueDateInput].forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.clearFieldError(input));
      }
    });

    // 4. Live Search
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        if (this.searchClearBtn) {
          this.searchClearBtn.style.display = this.searchQuery ? 'block' : 'none';
        }
        this.render();
      });
    }

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.searchClearBtn.style.display = 'none';
        this.render();
      });
    }

    // 5. Filter Chips delegation
    if (this.filterChips) {
      this.filterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-filter]');
        if (!chip) return;

        this.filterChips.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.getAttribute('data-filter');
        this.render();
      });
    }

    // 6. Category Filter
    if (this.categoryFilter) {
      this.categoryFilter.addEventListener('change', (e) => {
        this.currentCategory = e.target.value;
        this.render();
      });
    }

    // 7. Sort Dropdown
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.render();
      });
    }
  }

  /* ==========================================================================
     CRUD Operations
     ========================================================================== */

  /**
   * CREATE or UPDATE Todo
   */
  handleFormSubmit(e) {
    e.preventDefault();

    // Form Validation
    const isValid = this.validateForm();
    if (!isValid) return;

    const title = this.titleInput.value.trim();
    const category = this.categoryInput.value;
    const priority = this.priorityInput.value;
    const dueDate = this.dueDateInput.value;
    const notes = this.notesInput.value.trim();

    if (this.editingTodoId) {
      // UPDATE existing
      const index = this.todos.findIndex(t => t.id === this.editingTodoId);
      if (index !== -1) {
        this.todos[index] = {
          ...this.todos[index],
          title,
          category,
          priority,
          dueDate,
          notes,
          updatedAt: new Date().toISOString()
        };
        App.showToast('Task updated successfully!', 'success');
      }
    } else {
      // CREATE new
      const newTodo = {
        id: 'todo-' + Date.now(),
        title,
        category,
        priority,
        dueDate,
        notes,
        completed: false,
        createdAt: new Date().toISOString()
      };
      this.todos.unshift(newTodo);
      App.showToast('Task added successfully!', 'success');
    }

    this.save();
    this.closeModal();
    this.render();
  }

  /**
   * DELETE Todo with Toast & Undo
   */
  deleteTodo(id) {
    const todoToDelete = this.todos.find(t => t.id === id);
    if (!todoToDelete) return;

    // Filter out item
    const prevTodos = [...this.todos];
    this.todos = this.todos.filter(t => t.id !== id);
    this.save();
    this.render();

    // Trigger Toast with Undo capability
    App.showToast(`Task "${this.truncate(todoToDelete.title, 26)}" deleted`, 'danger', () => {
      this.todos = prevTodos;
      this.save();
      this.render();
      App.showToast('Task restored!', 'info');
    });
  }

  /**
   * TOGGLE Todo Completion
   */
  toggleComplete(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    todo.completed = !todo.completed;
    this.save();
    this.render();

    if (todo.completed) {
      App.showToast(`Completed "${this.truncate(todo.title, 24)}"`, 'success');
    }
  }

  /**
   * Save todos to storage & update badge
   */
  save() {
    StorageManager.saveTodos(this.todos);
    this.updateStats();
  }

  /* ==========================================================================
     Event Delegation Handlers
     ========================================================================== */

  handleListClick(e) {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const id = actionBtn.getAttribute('data-id');

    switch (action) {
      case 'delete-todo':
        this.deleteTodo(id);
        break;
      case 'edit-todo':
        this.openEditModal(id);
        break;
      case 'reset-filters':
        this.resetFilters();
        break;
      case 'open-add-task':
        this.openCreateModal();
        break;
      default:
        break;
    }
  }

  handleListChange(e) {
    const checkbox = e.target.closest('[data-action="toggle-complete"]');
    if (!checkbox) return;

    const id = checkbox.getAttribute('data-id');
    this.toggleComplete(id);
  }

  /* ==========================================================================
     Validation Logic
     ========================================================================== */

  validateForm() {
    let isValid = true;

    // Title validation: required and >= 3 characters
    const titleVal = this.titleInput.value.trim();
    if (!titleVal) {
      this.showFieldError(this.titleInput, 'Task title is required');
      isValid = false;
    } else if (titleVal.length < 3) {
      this.showFieldError(this.titleInput, 'Task title must be at least 3 characters');
      isValid = false;
    } else {
      this.clearFieldError(this.titleInput);
    }

    // Category validation
    if (!this.categoryInput.value) {
      this.showFieldError(this.categoryInput, 'Please choose a category');
      isValid = false;
    } else {
      this.clearFieldError(this.categoryInput);
    }

    // Priority validation
    if (!this.priorityInput.value) {
      this.showFieldError(this.priorityInput, 'Please choose a priority level');
      isValid = false;
    } else {
      this.clearFieldError(this.priorityInput);
    }

    // Due Date validation
    if (!this.dueDateInput.value) {
      this.showFieldError(this.dueDateInput, 'Please select a due date');
      isValid = false;
    } else {
      this.clearFieldError(this.dueDateInput);
    }

    return isValid;
  }

  showFieldError(input, message) {
    input.classList.add('is-invalid');
    const errorEl = document.getElementById(`${input.id}Error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  clearFieldError(input) {
    input.classList.remove('is-invalid');
    const errorEl = document.getElementById(`${input.id}Error`);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }

  clearAllErrors() {
    [this.titleInput, this.categoryInput, this.priorityInput, this.dueDateInput].forEach(inp => {
      if (inp) this.clearFieldError(inp);
    });
  }

  /* ==========================================================================
     Modal State
     ========================================================================== */

  openCreateModal() {
    this.editingTodoId = null;
    this.form.reset();
    this.clearAllErrors();
    this.modalTitle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      Create New Task
    `;
    // Default due date to today
    this.dueDateInput.value = new Date().toISOString().split('T')[0];
    this.modal.classList.add('is-open');
    this.titleInput.focus();
  }

  openEditModal(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    this.editingTodoId = id;
    this.clearAllErrors();
    this.modalTitle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
      Edit Task
    `;

    this.titleInput.value = todo.title;
    this.categoryInput.value = todo.category;
    this.priorityInput.value = todo.priority;
    this.dueDateInput.value = todo.dueDate;
    this.notesInput.value = todo.notes || '';

    this.modal.classList.add('is-open');
    this.titleInput.focus();
  }

  closeModal() {
    this.modal.classList.remove('is-open');
    this.editingTodoId = null;
    this.clearAllErrors();
  }

  /* ==========================================================================
     Filtering, Sorting & Searching
     ========================================================================== */

  getFilteredTodos() {
    const todayStr = new Date().toISOString().split('T')[0];

    return this.todos.filter(todo => {
      // 1. Text search
      if (this.searchQuery) {
        const matchesTitle = todo.title.toLowerCase().includes(this.searchQuery);
        const matchesNotes = todo.notes ? todo.notes.toLowerCase().includes(this.searchQuery) : false;
        const matchesCategory = todo.category.toLowerCase().includes(this.searchQuery);
        if (!matchesTitle && !matchesNotes && !matchesCategory) return false;
      }

      // 2. Status & Quick Filters
      if (this.currentFilter === 'active' && todo.completed) return false;
      if (this.currentFilter === 'completed' && !todo.completed) return false;
      if (this.currentFilter === 'high' && todo.priority !== 'high') return false;
      if (this.currentFilter === 'today' && todo.dueDate !== todayStr) return false;

      // 3. Category Filter
      if (this.currentCategory !== 'all' && todo.category !== this.currentCategory) return false;

      return true;
    }).sort((a, b) => {
      // 4. Sorting
      if (this.currentSort === 'due-asc') {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (this.currentSort === 'due-desc') {
        return new Date(b.dueDate) - new Date(a.dueDate);
      }
      if (this.currentSort === 'priority') {
        const weight = { high: 3, medium: 2, low: 1 };
        return weight[b.priority] - weight[a.priority];
      }
      if (this.currentSort === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (this.currentSort === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }

  resetFilters() {
    this.currentFilter = 'all';
    this.currentCategory = 'all';
    this.searchQuery = '';
    if (this.searchInput) this.searchInput.value = '';
    if (this.searchClearBtn) this.searchClearBtn.style.display = 'none';
    if (this.categoryFilter) this.categoryFilter.value = 'all';
    if (this.filterChips) {
      this.filterChips.querySelectorAll('[data-filter]').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-filter') === 'all');
      });
    }
    this.render();
  }

  /* ==========================================================================
     Rendering & UI Stats
     ========================================================================== */

  render() {
    this.updateStats();

    const filtered = this.getFilteredTodos();

    if (!this.listContainer) return;

    if (filtered.length === 0) {
      this.listContainer.innerHTML = this.renderEmptyState();
      return;
    }

    this.listContainer.innerHTML = filtered.map(todo => this.renderTodoCard(todo)).join('');
  }

  renderTodoCard(todo) {
    const dueDateMeta = this.formatDueDate(todo.dueDate);
    const checkedAttr = todo.completed ? 'checked' : '';
    const completedClass = todo.completed ? 'task-completed' : '';

    return `
      <div class="task-card ${completedClass}" id="card-${todo.id}">
        <div class="task-left">
          <label class="custom-checkbox" title="${todo.completed ? 'Mark incomplete' : 'Mark complete'}">
            <input type="checkbox" data-action="toggle-complete" data-id="${todo.id}" ${checkedAttr}>
            <span class="checkbox-visual">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </span>
          </label>
          <div class="task-details">
            <span class="task-title">${this.escapeHtml(todo.title)}</span>
            ${todo.notes ? `<p class="task-notes">${this.escapeHtml(todo.notes)}</p>` : ''}
            <div class="task-meta">
              <span class="badge badge-priority-${todo.priority}">
                ${todo.priority.toUpperCase()}
              </span>
              <span class="badge badge-category">
                ${this.escapeHtml(todo.category)}
              </span>
              <span class="badge badge-date ${dueDateMeta.cssClass}">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                ${dueDateMeta.label}
              </span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon btn-icon-edit" data-action="edit-todo" data-id="${todo.id}" title="Edit Task" aria-label="Edit Task">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
          <button class="btn-icon btn-icon-danger" data-action="delete-todo" data-id="${todo.id}" title="Delete Task" aria-label="Delete Task">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    const isFiltered = this.searchQuery || this.currentFilter !== 'all' || this.currentCategory !== 'all';

    if (isFiltered) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <h3 class="empty-state-title">No matching tasks found</h3>
          <p class="empty-state-desc">Try clearing your search query or switching your active filters to see more tasks.</p>
          <button class="btn btn-secondary btn-sm" data-action="reset-filters">
            Clear Filters & Search
          </button>
        </div>
      `;
    }

    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
        </div>
        <h3 class="empty-state-title">Your task list is completely clear</h3>
        <p class="empty-state-desc">Organize your priorities, track progress, and accomplish your goals with ease.</p>
        <button class="btn btn-primary" data-action="open-add-task">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Add Your First Task
        </button>
      </div>
    `;
  }

  formatDueDate(dateStr) {
    if (!dateStr) return { label: 'No date', cssClass: '' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, cssClass: 'date-overdue' };
    } else if (diffDays === 0) {
      return { label: 'Due Today', cssClass: 'date-today' };
    } else if (diffDays === 1) {
      return { label: 'Due Tomorrow', cssClass: '' };
    } else {
      const options = { month: 'short', day: 'numeric' };
      return { label: due.toLocaleDateString(undefined, options), cssClass: '' };
    }
  }

  updateStats() {
    const total = this.todos.length;
    const completed = this.todos.filter(t => t.completed).length;
    const active = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (this.statTotal) this.statTotal.textContent = total;
    if (this.statActive) this.statActive.textContent = active;
    if (this.statCompleted) this.statCompleted.textContent = completed;
    if (this.statRate) this.statRate.textContent = `${rate}%`;

    if (this.navBadge) this.navBadge.textContent = active;

    if (this.progressBar) {
      this.progressBar.style.width = `${rate}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = `${rate}% Completed (${completed}/${total} tasks)`;
    }
  }

  truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Make accessible to window
window.TodoTracker = TodoTracker;
