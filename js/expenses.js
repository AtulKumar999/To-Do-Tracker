/**
 * ==========================================================================
 * Trackify - Expense Tracker Module
 * Full CRUD, Event Delegation, Validation, Search, Filter, Sort & Analytics
 * ==========================================================================
 */

class ExpenseTracker {
  constructor() {
    this.expenses = StorageManager.getExpenses();
    this.currentFilter = 'all'; // all | expense | income | month | week
    this.currentCategory = 'all';
    this.currentSort = 'date-desc';
    this.searchQuery = '';
    this.editingExpenseId = null;

    // DOM Elements
    this.listContainer = document.getElementById('expenseListContainer');
    this.form = document.getElementById('expenseForm');
    this.modal = document.getElementById('expenseModal');
    this.modalTitle = document.getElementById('expenseModalTitle');
    this.openModalBtn = document.getElementById('openExpenseModalBtn');
    this.cancelModalBtn = document.getElementById('cancelExpenseModalBtn');
    this.closeModalBtn = document.getElementById('closeExpenseModalBtn');

    // Inputs
    this.descInput = document.getElementById('expenseDescInput');
    this.amountInput = document.getElementById('expenseAmountInput');
    this.typeInputs = document.querySelectorAll('input[name="expenseType"]');
    this.categoryInput = document.getElementById('expenseCategoryInput');
    this.paymentMethodInput = document.getElementById('expensePaymentMethodInput');
    this.dateInput = document.getElementById('expenseDateInput');
    this.notesInput = document.getElementById('expenseNotesInput');

    // Search & Filter controls
    this.searchInput = document.getElementById('expenseSearchInput');
    this.searchClearBtn = document.getElementById('expenseSearchClearBtn');
    this.filterChips = document.getElementById('expenseFilterChips');
    this.categoryFilter = document.getElementById('expenseCategoryFilter');
    this.sortSelect = document.getElementById('expenseSortSelect');

    // Stat metric elements
    this.statBalance = document.getElementById('expenseStatBalance');
    this.statIncome = document.getElementById('expenseStatIncome');
    this.statExpense = document.getElementById('expenseStatExpense');
    this.statSavings = document.getElementById('expenseStatSavings');
    this.navBadge = document.getElementById('navExpenseBalance');

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

    // Close on backdrop click
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
    [this.descInput, this.amountInput, this.categoryInput, this.dateInput].forEach(input => {
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

  handleFormSubmit(e) {
    e.preventDefault();

    // Form Validation
    const isValid = this.validateForm();
    if (!isValid) return;

    const description = this.descInput.value.trim();
    const amount = parseFloat(this.amountInput.value);
    const selectedTypeEl = document.querySelector('input[name="expenseType"]:checked');
    const type = selectedTypeEl ? selectedTypeEl.value : 'expense';
    const category = this.categoryInput.value;
    const paymentMethod = this.paymentMethodInput.value;
    const date = this.dateInput.value;
    const notes = this.notesInput.value.trim();

    if (this.editingExpenseId) {
      // UPDATE existing
      const index = this.expenses.findIndex(x => x.id === this.editingExpenseId);
      if (index !== -1) {
        this.expenses[index] = {
          ...this.expenses[index],
          description,
          amount,
          type,
          category,
          paymentMethod,
          date,
          notes,
          updatedAt: new Date().toISOString()
        };
        App.showToast('Transaction updated successfully!', 'success');
      }
    } else {
      // CREATE new
      const newExpense = {
        id: 'exp-' + Date.now(),
        description,
        amount,
        type,
        category,
        paymentMethod,
        date,
        notes,
        createdAt: new Date().toISOString()
      };
      this.expenses.unshift(newExpense);
      App.showToast('Transaction added successfully!', 'success');
    }

    this.save();
    this.closeModal();
    this.render();
  }

  deleteExpense(id) {
    const expenseToDelete = this.expenses.find(x => x.id === id);
    if (!expenseToDelete) return;

    const prevExpenses = [...this.expenses];
    this.expenses = this.expenses.filter(x => x.id !== id);
    this.save();
    this.render();

    // Trigger Toast with Undo capability
    App.showToast(`Transaction "${this.truncate(expenseToDelete.description, 26)}" deleted`, 'danger', () => {
      this.expenses = prevExpenses;
      this.save();
      this.render();
      App.showToast('Transaction restored!', 'info');
    });
  }

  save() {
    StorageManager.saveExpenses(this.expenses);
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
      case 'delete-expense':
        this.deleteExpense(id);
        break;
      case 'edit-expense':
        this.openEditModal(id);
        break;
      case 'reset-expense-filters':
        this.resetFilters();
        break;
      case 'open-add-expense':
        this.openCreateModal();
        break;
      default:
        break;
    }
  }

  /* ==========================================================================
     Validation Logic
     ========================================================================== */

  validateForm() {
    let isValid = true;

    // Description validation: required and >= 2 characters
    const descVal = this.descInput.value.trim();
    if (!descVal) {
      this.showFieldError(this.descInput, 'Description is required');
      isValid = false;
    } else if (descVal.length < 2) {
      this.showFieldError(this.descInput, 'Description must be at least 2 characters');
      isValid = false;
    } else {
      this.clearFieldError(this.descInput);
    }

    // Amount validation: required, number, > 0
    const amtVal = parseFloat(this.amountInput.value);
    if (isNaN(amtVal) || amtVal <= 0) {
      this.showFieldError(this.amountInput, 'Please enter a valid amount greater than 0');
      isValid = false;
    } else {
      this.clearFieldError(this.amountInput);
    }

    // Category validation
    if (!this.categoryInput.value) {
      this.showFieldError(this.categoryInput, 'Please select a category');
      isValid = false;
    } else {
      this.clearFieldError(this.categoryInput);
    }

    // Date validation
    if (!this.dateInput.value) {
      this.showFieldError(this.dateInput, 'Please select a date');
      isValid = false;
    } else {
      this.clearFieldError(this.dateInput);
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
    [this.descInput, this.amountInput, this.categoryInput, this.dateInput].forEach(inp => {
      if (inp) this.clearFieldError(inp);
    });
  }

  /* ==========================================================================
     Modal State
     ========================================================================== */

  openCreateModal() {
    this.editingExpenseId = null;
    this.form.reset();
    this.clearAllErrors();
    this.modalTitle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
      Add Transaction
    `;
    // Default type = expense
    const defaultExpenseRadio = document.querySelector('input[name="expenseType"][value="expense"]');
    if (defaultExpenseRadio) defaultExpenseRadio.checked = true;

    // Default date = today
    this.dateInput.value = new Date().toISOString().split('T')[0];

    this.modal.classList.add('is-open');
    this.descInput.focus();
  }

  openEditModal(id) {
    const expense = this.expenses.find(x => x.id === id);
    if (!expense) return;

    this.editingExpenseId = id;
    this.clearAllErrors();
    this.modalTitle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
      Edit Transaction
    `;

    this.descInput.value = expense.description;
    this.amountInput.value = expense.amount;

    const typeRadio = document.querySelector(`input[name="expenseType"][value="${expense.type}"]`);
    if (typeRadio) typeRadio.checked = true;

    this.categoryInput.value = expense.category;
    this.paymentMethodInput.value = expense.paymentMethod || 'Credit Card';
    this.dateInput.value = expense.date;
    this.notesInput.value = expense.notes || '';

    this.modal.classList.add('is-open');
    this.descInput.focus();
  }

  closeModal() {
    this.modal.classList.remove('is-open');
    this.editingExpenseId = null;
    this.clearAllErrors();
  }

  /* ==========================================================================
     Filtering, Sorting & Searching
     ========================================================================== */

  getFilteredExpenses() {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    return this.expenses.filter(item => {
      // 1. Text search
      if (this.searchQuery) {
        const matchesDesc = item.description.toLowerCase().includes(this.searchQuery);
        const matchesCategory = item.category.toLowerCase().includes(this.searchQuery);
        const matchesPayment = item.paymentMethod ? item.paymentMethod.toLowerCase().includes(this.searchQuery) : false;
        const matchesNotes = item.notes ? item.notes.toLowerCase().includes(this.searchQuery) : false;
        if (!matchesDesc && !matchesCategory && !matchesPayment && !matchesNotes) return false;
      }

      // 2. Type & Quick Filters
      if (this.currentFilter === 'expense' && item.type !== 'expense') return false;
      if (this.currentFilter === 'income' && item.type !== 'income') return false;
      if (this.currentFilter === 'month') {
        if (!item.date || !item.date.startsWith(currentMonth)) return false;
      }
      if (this.currentFilter === 'week') {
        const itemDate = new Date(item.date);
        if (itemDate < oneWeekAgo) return false;
      }

      // 3. Category Filter
      if (this.currentCategory !== 'all' && item.category !== this.currentCategory) return false;

      return true;
    }).sort((a, b) => {
      // 4. Sorting
      if (this.currentSort === 'date-desc') {
        return new Date(b.date) - new Date(a.date);
      }
      if (this.currentSort === 'date-asc') {
        return new Date(a.date) - new Date(b.date);
      }
      if (this.currentSort === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (this.currentSort === 'amount-asc') {
        return a.amount - b.amount;
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

    const filtered = this.getFilteredExpenses();

    if (!this.listContainer) return;

    if (filtered.length === 0) {
      this.listContainer.innerHTML = this.renderEmptyState();
      return;
    }

    this.listContainer.innerHTML = filtered.map(item => this.renderExpenseCard(item)).join('');
  }

  renderExpenseCard(item) {
    const isIncome = item.type === 'income';
    const symbol = App.getCurrencySymbol();
    const formattedAmount = `${isIncome ? '+' : '-'}${symbol}${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const amountClass = isIncome ? 'amount-income' : 'amount-expense';
    const iconClass = isIncome ? 'expense-icon-income' : 'expense-icon-expense';

    // Choose icon according to type/category
    const iconSvg = isIncome
      ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg>`
      : `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg>`;

    const dateFormatted = new Date(item.date + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `
      <div class="expense-card" id="card-${item.id}">
        <div class="expense-left">
          <div class="expense-icon-wrap ${iconClass}" title="${isIncome ? 'Income' : 'Expense'}">
            ${iconSvg}
          </div>
          <div class="expense-info">
            <span class="expense-desc">${this.escapeHtml(item.description)}</span>
            <div class="expense-meta">
              <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">
                ${isIncome ? 'Income' : 'Expense'}
              </span>
              <span class="badge badge-category">
                ${this.escapeHtml(item.category)}
              </span>
              <span class="badge badge-date">
                ${dateFormatted}
              </span>
              ${item.paymentMethod ? `<span class="expense-payment-tag">${this.escapeHtml(item.paymentMethod)}</span>` : ''}
            </div>
            ${item.notes ? `<p class="task-notes" style="margin-top: 2px;">${this.escapeHtml(item.notes)}</p>` : ''}
          </div>
        </div>
        <div class="expense-right">
          <div class="expense-amount-wrap">
            <span class="expense-amount ${amountClass}">${formattedAmount}</span>
          </div>
          <div class="task-actions">
            <button class="btn-icon btn-icon-edit" data-action="edit-expense" data-id="${item.id}" title="Edit Transaction" aria-label="Edit Transaction">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button class="btn-icon btn-icon-danger" data-action="delete-expense" data-id="${item.id}" title="Delete Transaction" aria-label="Delete Transaction">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
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
          <h3 class="empty-state-title">No transactions match your criteria</h3>
          <p class="empty-state-desc">Try clearing your filters or search keywords to view all transaction history.</p>
          <button class="btn btn-secondary btn-sm" data-action="reset-expense-filters">
            Clear Filters & Search
          </button>
        </div>
      `;
    }

    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h3 class="empty-state-title">No financial records yet</h3>
        <p class="empty-state-desc">Take command of your budget by recording your first income or expense transaction.</p>
        <button class="btn btn-primary" data-action="open-add-expense">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Add Your First Transaction
        </button>
      </div>
    `;
  }

  updateStats() {
    let totalIncome = 0;
    let totalExpense = 0;

    this.expenses.forEach(x => {
      if (x.type === 'income') {
        totalIncome += Number(x.amount);
      } else {
        totalExpense += Number(x.amount);
      }
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;
    const symbol = App.getCurrencySymbol();

    const formatNum = (num) => `${symbol}${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (this.statBalance) {
      this.statBalance.textContent = `${netBalance < 0 ? '-' : ''}${formatNum(netBalance)}`;
      this.statBalance.style.color = netBalance >= 0 ? 'var(--text-primary)' : 'var(--danger)';
    }

    if (this.statIncome) this.statIncome.textContent = `+${formatNum(totalIncome)}`;
    if (this.statExpense) this.statExpense.textContent = `-${formatNum(totalExpense)}`;
    if (this.statSavings) this.statSavings.textContent = `${savingsRate}%`;

    if (this.navBadge) {
      this.navBadge.textContent = `${netBalance < 0 ? '-' : ''}${symbol}${Math.abs(Math.round(netBalance)).toLocaleString()}`;
    }
  }

  getTotals() {
    let income = 0;
    let expense = 0;
    this.expenses.forEach(x => {
      if (x.type === 'income') income += Number(x.amount);
      else expense += Number(x.amount);
    });
    return {
      income,
      expense,
      balance: income - expense,
      count: this.expenses.length
    };
  }

  getCategoryBreakdown() {
    const categories = {};
    let totalSpent = 0;

    this.expenses.filter(x => x.type === 'expense').forEach(x => {
      categories[x.category] = (categories[x.category] || 0) + Number(x.amount);
      totalSpent += Number(x.amount);
    });

    return Object.entries(categories).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
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
window.ExpenseTracker = ExpenseTracker;
