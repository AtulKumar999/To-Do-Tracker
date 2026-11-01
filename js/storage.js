/**
 * ==========================================================================
 * Trackify - LocalStorage & State Persistence Manager
 * ==========================================================================
 */

const STORAGE_KEYS = {
  TODOS: 'trackify_todos_v1',
  EXPENSES: 'trackify_expenses_v1',
  SETTINGS: 'trackify_settings_v1'
};

const DEFAULT_SETTINGS = {
  currency: '$',
  theme: 'dark'
};

// Seed sample data for an impressive first run experience
const INITIAL_DEMO_TODOS = [
  {
    id: 'todo-1',
    title: 'Finalize Q4 Sprint Roadmap & Deliverables',
    notes: 'Review milestones with design and engineering leads before Thursday standup.',
    category: 'Work',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'todo-2',
    title: 'Review Monthly Cloud Server Invoices',
    notes: 'Audit AWS and Vercel infrastructure bills for unallocated clusters.',
    category: 'Finance',
    priority: 'medium',
    dueDate: new Date(Date.now()).toISOString().split('T')[0], // Today
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'todo-3',
    title: 'Morning 5K Trail Run & Hydration',
    notes: 'Keep average pace under 5:15/km and track heart rate zones.',
    category: 'Health',
    priority: 'low',
    dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (Overdue/Completed example)
    completed: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'todo-4',
    title: 'Refactor UI Components for Dark Mode & Accessibility',
    notes: 'Ensure WCAG AA contrast compliance and test keyboard navigation focus rings.',
    category: 'Work',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    completed: false,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
  }
];

const INITIAL_DEMO_EXPENSES = [
  {
    id: 'exp-1',
    description: 'Quarterly Software Engineering Retainer',
    amount: 3250.00,
    type: 'income',
    category: 'Salary & Client',
    paymentMethod: 'Bank Transfer',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    notes: 'Payment received for client backend architecture sprint.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'exp-2',
    description: 'Whole Foods Organic Groceries',
    amount: 142.80,
    type: 'expense',
    category: 'Food & Groceries',
    paymentMethod: 'Credit Card',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    notes: 'Produce, olive oil, and coffee beans.',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'exp-3',
    description: 'High-Speed Fiber Internet Bill',
    amount: 65.00,
    type: 'expense',
    category: 'Utilities & Bills',
    paymentMethod: 'UPI / Direct Debit',
    date: new Date(Date.now()).toISOString().split('T')[0],
    notes: 'Monthly 1Gbps fiber optic line.',
    createdAt: new Date(Date.now()).toISOString()
  },
  {
    id: 'exp-4',
    description: 'Stock Dividends & Yield',
    amount: 210.50,
    type: 'income',
    category: 'Investments',
    paymentMethod: 'Bank Transfer',
    date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    notes: 'Q3 index fund dividend distributions.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'exp-5',
    description: 'Coworking Desk & Meeting Room Pass',
    amount: 180.00,
    type: 'expense',
    category: 'Office & Work',
    paymentMethod: 'Credit Card',
    date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    notes: 'Dedicated flex desk membership.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

class StorageManager {
  /**
   * Safe getter for local storage item
   */
  static getItem(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (err) {
      console.error(`Error reading key "${key}" from localStorage:`, err);
      return fallback;
    }
  }

  /**
   * Safe setter for local storage item
   */
  static setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`Error writing key "${key}" to localStorage:`, err);
      return false;
    }
  }

  /**
   * Load Todos from localStorage, initializing demo data if first visit
   */
  static getTodos() {
    let todos = this.getItem(STORAGE_KEYS.TODOS);
    if (!todos || !Array.isArray(todos)) {
      todos = [...INITIAL_DEMO_TODOS];
      this.setItem(STORAGE_KEYS.TODOS, todos);
    }
    return todos;
  }

  /**
   * Save Todos to localStorage
   */
  static saveTodos(todos) {
    return this.setItem(STORAGE_KEYS.TODOS, todos);
  }

  /**
   * Load Expenses from localStorage, initializing demo data if first visit
   */
  static getExpenses() {
    let expenses = this.getItem(STORAGE_KEYS.EXPENSES);
    if (!expenses || !Array.isArray(expenses)) {
      expenses = [...INITIAL_DEMO_EXPENSES];
      this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    }
    return expenses;
  }

  /**
   * Save Expenses to localStorage
   */
  static saveExpenses(expenses) {
    return this.setItem(STORAGE_KEYS.EXPENSES, expenses);
  }

  /**
   * Settings (Theme, Currency)
   */
  static getSettings() {
    const settings = this.getItem(STORAGE_KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  static saveSettings(settings) {
    const current = this.getSettings();
    return this.setItem(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
  }

  /**
   * Reset data to demo state
   */
  static resetToDemo() {
    this.setItem(STORAGE_KEYS.TODOS, [...INITIAL_DEMO_TODOS]);
    this.setItem(STORAGE_KEYS.EXPENSES, [...INITIAL_DEMO_EXPENSES]);
    return {
      todos: [...INITIAL_DEMO_TODOS],
      expenses: [...INITIAL_DEMO_EXPENSES]
    };
  }

  /**
   * Clear all user data
   */
  static clearAll() {
    this.setItem(STORAGE_KEYS.TODOS, []);
    this.setItem(STORAGE_KEYS.EXPENSES, []);
    return {
      todos: [],
      expenses: []
    };
  }
}

// Make accessible to window
window.StorageManager = StorageManager;
