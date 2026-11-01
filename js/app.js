/**
 * ==========================================================================
 * Trackify - Master Application Controller
 * Handles View Switching, Theming, Currency, Toasts, Analytics & Keyboard Shortcuts
 * ==========================================================================
 */

class AppController {
  constructor() {
    this.settings = StorageManager.getSettings();
    this.activeView = 'todos'; // 'todos' | 'expenses' | 'analytics'
    this.toastTimeout = null;
    this.undoCallback = null;

    // Sub-modules
    this.todoTracker = null;
    this.expenseTracker = null;

    // DOM Elements
    this.viewTabs = document.querySelectorAll('.nav-tab-btn');
    this.views = {
      todos: document.getElementById('todosView'),
      expenses: document.getElementById('expensesView'),
      analytics: document.getElementById('analyticsView')
    };

    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.currencySelect = document.getElementById('currencySelect');
    this.toastContainer = document.getElementById('toastContainer');
    this.resetDemoBtn = document.getElementById('resetDemoBtn');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.importDataInput = document.getElementById('importDataInput');
  }

  init() {
    // 1. Apply Settings
    this.applyTheme(this.settings.theme);
    if (this.currencySelect) {
      this.currencySelect.value = this.settings.currency || '$';
    }

    // 2. Initialize Trackers
    this.todoTracker = new TodoTracker();
    this.expenseTracker = new ExpenseTracker();

    // 3. Bind UI Events
    this.bindEvents();

    // 4. Initial Render of current view
    this.switchView('todos');
  }

  bindEvents() {
    // View Switcher Tabs
    this.viewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    // Theme Toggle
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => {
        const nextTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(nextTheme);
        this.settings.theme = nextTheme;
        StorageManager.saveSettings(this.settings);
        this.showToast(`Switched to ${nextTheme} mode`, 'info');
      });
    }

    // Currency Switcher
    if (this.currencySelect) {
      this.currencySelect.addEventListener('change', (e) => {
        this.settings.currency = e.target.value;
        StorageManager.saveSettings(this.settings);
        this.expenseTracker.render();
        if (this.activeView === 'analytics') {
          this.renderAnalytics();
        }
        this.showToast(`Currency changed to ${this.settings.currency}`, 'info');
      });
    }

    // Reset Demo Data
    if (this.resetDemoBtn) {
      this.resetDemoBtn.addEventListener('click', () => {
        if (confirm('Load demo data? This will overwrite current entries with sample records.')) {
          const fresh = StorageManager.resetToDemo();
          this.todoTracker.todos = fresh.todos;
          this.expenseTracker.expenses = fresh.expenses;
          this.todoTracker.render();
          this.expenseTracker.render();
          if (this.activeView === 'analytics') this.renderAnalytics();
          this.showToast('Demo data loaded successfully!', 'success');
        }
      });
    }

    // Export Data (JSON)
    if (this.exportDataBtn) {
      this.exportDataBtn.addEventListener('click', () => this.exportBackup());
    }

    // Import Data
    if (this.importDataInput) {
      this.importDataInput.addEventListener('change', (e) => this.importBackup(e));
    }

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape: Close modals
      if (e.key === 'Escape') {
        this.todoTracker.closeModal();
        this.expenseTracker.closeModal();
      }

      // Ctrl + N or Cmd + N: New Task
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.switchView('todos');
        this.todoTracker.openCreateModal();
      }

      // Ctrl + E or Cmd + E: New Expense
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this.switchView('expenses');
        this.expenseTracker.openCreateModal();
      }

      // '/' to focus search (if not already inside an input/textarea)
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        if (this.activeView === 'todos' && this.todoTracker.searchInput) {
          this.todoTracker.searchInput.focus();
        } else if (this.activeView === 'expenses' && this.expenseTracker.searchInput) {
          this.expenseTracker.searchInput.focus();
        }
      }
    });
  }

  switchView(viewName) {
    this.activeView = viewName;

    // Update Tab UI
    this.viewTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-view') === viewName);
    });

    // Update Views
    Object.keys(this.views).forEach(key => {
      if (this.views[key]) {
        this.views[key].classList.toggle('active-view', key === viewName);
      }
    });

    // Special view actions
    if (viewName === 'analytics') {
      this.renderAnalytics();
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (this.themeToggleBtn) {
      this.themeToggleBtn.innerHTML = theme === 'dark' 
        ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`
        : `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
      this.themeToggleBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
    }
  }

  getCurrencySymbol() {
    return this.settings.currency || '$';
  }

  /**
   * Universal Toast Notifications
   */
  showToast(message, type = 'info', undoHandler = null) {
    if (!this.toastContainer) return;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    const typeIcons = {
      success: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
      danger: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
      info: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
      warning: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
    };

    const undoBtnHtml = undoHandler ? `<button class="toast-undo-btn" id="toastUndoBtn">Undo</button>` : '';

    this.toastContainer.innerHTML = `
      <div class="toast toast-${type}" id="activeToast">
        <div class="toast-icon">${typeIcons[type] || typeIcons.info}</div>
        <div class="toast-content">${message}</div>
        ${undoBtnHtml}
      </div>
    `;

    const toastEl = document.getElementById('activeToast');
    // Force reflow for entrance transition
    setTimeout(() => {
      if (toastEl) toastEl.classList.add('show');
    }, 10);

    if (undoHandler) {
      const undoBtn = document.getElementById('toastUndoBtn');
      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          undoHandler();
          this.dismissToast();
        });
      }
    }

    this.toastTimeout = setTimeout(() => {
      this.dismissToast();
    }, 4500);
  }

  dismissToast() {
    const toastEl = document.getElementById('activeToast');
    if (toastEl) {
      toastEl.classList.remove('show');
      setTimeout(() => {
        if (this.toastContainer) this.toastContainer.innerHTML = '';
      }, 300);
    }
  }

  /**
   * Combined Analytics Rendering
   */
  renderAnalytics() {
    const todos = this.todoTracker.todos;
    const totalTodos = todos.length;
    const completedTodos = todos.filter(t => t.completed).length;
    const pendingTodos = totalTodos - completedTodos;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    const highPriorityPending = todos.filter(t => !t.completed && t.priority === 'high').length;

    const financialTotals = this.expenseTracker.getTotals();
    const categories = this.expenseTracker.getCategoryBreakdown();
    const symbol = this.getCurrencySymbol();

    // Elements
    const scoreEl = document.getElementById('analyticsProdScore');
    const netEl = document.getElementById('analyticsNetCash');
    const highUrgentEl = document.getElementById('analyticsHighUrgent');
    const catListEl = document.getElementById('analyticsCategoryList');
    const taskBreakdownEl = document.getElementById('analyticsTaskBreakdown');

    if (scoreEl) scoreEl.textContent = `${completionRate}%`;
    if (netEl) {
      const sign = financialTotals.balance < 0 ? '-' : '+';
      netEl.textContent = `${sign}${symbol}${Math.abs(financialTotals.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      netEl.style.color = financialTotals.balance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (highUrgentEl) highUrgentEl.textContent = highPriorityPending;

    // Render Category Expense bars
    if (catListEl) {
      if (categories.length === 0) {
        catListEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No expense records found yet.</p>`;
      } else {
        catListEl.innerHTML = categories.slice(0, 5).map(cat => `
          <div class="breakdown-row">
            <div class="breakdown-header">
              <span class="breakdown-label">${cat.name} (${cat.percentage}%)</span>
              <span class="breakdown-value">${symbol}${cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="breakdown-bar-track">
              <div class="breakdown-bar-fill" style="width: ${cat.percentage}%; background: var(--primary);"></div>
            </div>
          </div>
        `).join('');
      }
    }

    // Render Priority breakdown
    if (taskBreakdownEl) {
      const highCount = todos.filter(t => t.priority === 'high').length;
      const medCount = todos.filter(t => t.priority === 'medium').length;
      const lowCount = todos.filter(t => t.priority === 'low').length;

      const calcPct = (cnt) => totalTodos > 0 ? Math.round((cnt / totalTodos) * 100) : 0;

      taskBreakdownEl.innerHTML = `
        <div class="breakdown-row">
          <div class="breakdown-header">
            <span class="breakdown-label">High Priority (${highCount} tasks)</span>
            <span class="breakdown-value">${calcPct(highCount)}%</span>
          </div>
          <div class="breakdown-bar-track">
            <div class="breakdown-bar-fill" style="width: ${calcPct(highCount)}%; background: var(--danger);"></div>
          </div>
        </div>
        <div class="breakdown-row">
          <div class="breakdown-header">
            <span class="breakdown-label">Medium Priority (${medCount} tasks)</span>
            <span class="breakdown-value">${calcPct(medCount)}%</span>
          </div>
          <div class="breakdown-bar-track">
            <div class="breakdown-bar-fill" style="width: ${calcPct(medCount)}%; background: var(--warning);"></div>
          </div>
        </div>
        <div class="breakdown-row">
          <div class="breakdown-header">
            <span class="breakdown-label">Low Priority (${lowCount} tasks)</span>
            <span class="breakdown-value">${calcPct(lowCount)}%</span>
          </div>
          <div class="breakdown-bar-track">
            <div class="breakdown-bar-fill" style="width: ${calcPct(lowCount)}%; background: var(--info);"></div>
          </div>
        </div>
      `;
    }
  }

  /**
   * JSON Export
   */
  exportBackup() {
    const backupData = {
      todos: this.todoTracker.todos,
      expenses: this.expenseTracker.expenses,
      settings: this.settings,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackify-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Data exported successfully!', 'success');
  }

  /**
   * JSON Import
   */
  importBackup(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.todos && Array.isArray(data.todos)) {
          this.todoTracker.todos = data.todos;
          StorageManager.saveTodos(data.todos);
        }
        if (data.expenses && Array.isArray(data.expenses)) {
          this.expenseTracker.expenses = data.expenses;
          StorageManager.saveExpenses(data.expenses);
        }
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
          StorageManager.saveSettings(this.settings);
          this.applyTheme(this.settings.theme);
          if (this.currencySelect) this.currencySelect.value = this.settings.currency || '$';
        }
        this.todoTracker.render();
        this.expenseTracker.render();
        if (this.activeView === 'analytics') this.renderAnalytics();
        this.showToast('Data imported successfully!', 'success');
      } catch (err) {
        this.showToast('Invalid JSON file format!', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.App = new AppController();
  window.App.init();
});
