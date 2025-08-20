// Simple Expense Tracker PWA
class ExpenseTracker {
    constructor() {
        this.expenses = [];
        this.nextExpenseId = 1;
        this.nextCategoryId = 100;

        // Initialize default data
        this.mainCategories = [
            {id: 1, name: "Food"},
            {id: 2, name: "Transport"},
            {id: 3, name: "Shopping"},
            {id: 4, name: "Bills"},
            {id: 5, name: "Entertainment"}
        ];

        this.subCategories = {
            "Food": [
                {id: 1, name: "Groceries"},
                {id: 2, name: "Dining Out"},
                {id: 3, name: "Snacks"}
            ],
            "Transport": [
                {id: 4, name: "Fuel"},
                {id: 5, name: "Public Transport"},
                {id: 6, name: "Taxi/Uber"}
            ],
            "Shopping": [
                {id: 7, name: "Clothing"},
                {id: 8, name: "Electronics"},
                {id: 9, name: "Household"}
            ],
            "Bills": [
                {id: 10, name: "Electricity"},
                {id: 11, name: "Internet"},
                {id: 12, name: "Phone"}
            ],
            "Entertainment": [
                {id: 13, name: "Movies"},
                {id: 14, name: "Games"},
                {id: 15, name: "Sports"}
            ]
        };

        this.paymentModes = [
            {id: 1, name: "Cash"},
            {id: 2, name: "Credit Card"},
            {id: 3, name: "Debit Card"},
            {id: 4, name: "UPI"},
            {id: 5, name: "Net Banking"}
        ];

        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setCurrentDate();
            this.populateDropdowns();
            this.setupEventListeners();
            this.renderExpensesList();
            this.setupPWA();
        });
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('expenseDate');
        if (dateInput) {
            dateInput.value = today;
        }
    }

    populateDropdowns() {
        this.populateMainCategories();
        this.populatePaymentModes();
        this.updateCategoryManagement();
    }

    populateMainCategories() {
        const select = document.getElementById('mainCategory');
        if (!select) return;

        select.innerHTML = '<option value="">Select Main Category</option>';
        this.mainCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    populateSubCategories(mainCategory) {
        const select = document.getElementById('subCategory');
        if (!select) return;

        select.innerHTML = '<option value="">Select Sub Category</option>';

        if (mainCategory && this.subCategories[mainCategory]) {
            this.subCategories[mainCategory].forEach(subCat => {
                const option = document.createElement('option');
                option.value = subCat.name;
                option.textContent = subCat.name;
                select.appendChild(option);
            });
        }
    }

    populatePaymentModes() {
        const select = document.getElementById('paymentMode');
        if (!select) return;

        select.innerHTML = '<option value="">Select Payment Mode</option>';
        this.paymentModes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode.name;
            option.textContent = mode.name;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('expenseForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddExpense(e));
        }

        // Main category change
        const mainCategorySelect = document.getElementById('mainCategory');
        if (mainCategorySelect) {
            mainCategorySelect.addEventListener('change', (e) => {
                this.populateSubCategories(e.target.value);
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToCSV());
        }

        // Category management
        const manageBtn = document.getElementById('manageBtn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => this.openCategoryModal());
        }

        // Modal close
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeCategoryModal());
        }

        // Category management tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Add category buttons
        const addMainBtn = document.getElementById('addMainCategory');
        if (addMainBtn) {
            addMainBtn.addEventListener('click', () => this.addMainCategory());
        }

        const addSubBtn = document.getElementById('addSubCategory');
        if (addSubBtn) {
            addSubBtn.addEventListener('click', () => this.addSubCategory());
        }

        const addPaymentBtn = document.getElementById('addPaymentMode');
        if (addPaymentBtn) {
            addPaymentBtn.addEventListener('click', () => this.addPaymentMode());
        }

        // Confirmation dialog
        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');

        if (confirmYes) {
            confirmYes.addEventListener('click', () => this.confirmAction());
        }
        if (confirmNo) {
            confirmNo.addEventListener('click', () => this.cancelAction());
        }

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('categoryModal');
            if (e.target === modal) {
                this.closeCategoryModal();
            }
        });
    }

    handleAddExpense(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const expense = {
            id: this.nextExpenseId++,
            date: formData.get('date'),
            mainCategory: formData.get('mainCategory'),
            subCategory: formData.get('subCategory'),
            amount: parseFloat(formData.get('amount')),
            paymentMode: formData.get('paymentMode')
        };

        // Validate
        if (!expense.date || !expense.mainCategory || !expense.subCategory || 
            !expense.amount || !expense.paymentMode) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }

        if (expense.amount <= 0) {
            this.showMessage('Amount must be greater than 0', 'error');
            return;
        }

        this.expenses.unshift(expense);
        this.renderExpensesList();
        e.target.reset();
        this.setCurrentDate();
        this.populateSubCategories('');
        this.showMessage('Expense added successfully');
    }

    renderExpensesList() {
        const tbody = document.getElementById('expensesTableBody');
        const totalElement = document.getElementById('totalAmount');

        if (!tbody || !totalElement) return;

        tbody.innerHTML = '';

        let total = 0;
        this.expenses.forEach(expense => {
            total += expense.amount;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(expense.date)}</td>
                <td>${expense.mainCategory}</td>
                <td>${expense.subCategory}</td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td>${expense.paymentMode}</td>
                <td>
                    <button class="btn-delete" onclick="expenseTracker.deleteExpense(${expense.id})">
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        totalElement.textContent = `$${total.toFixed(2)}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    deleteExpense(id) {
        this.showConfirmation(
            'Are you sure you want to delete this expense?',
            () => {
                this.expenses = this.expenses.filter(expense => expense.id !== id);
                this.renderExpensesList();
                this.showMessage('Expense deleted successfully');
            }
        );
    }

    exportToCSV() {
        if (this.expenses.length === 0) {
            this.showMessage('No expenses to export', 'error');
            return;
        }

        const headers = ['Date', 'Main Category', 'Sub Category', 'Amount', 'Payment Mode'];
        const csvData = [headers];

        this.expenses.forEach(expense => {
            csvData.push([
                expense.date,
                expense.mainCategory,
                expense.subCategory,
                expense.amount.toFixed(2),
                expense.paymentMode
            ]);
        });

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showMessage('CSV exported successfully');
    }

    // Category Management
    openCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.add('active');
            this.updateCategoryManagement();
        }
    }

    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    updateCategoryManagement() {
        this.renderMainCategoriesList();
        this.renderSubCategoriesList();
        this.renderPaymentModesList();
        this.updateParentCategorySelect();
    }

    renderMainCategoriesList() {
        const list = document.getElementById('mainCategoriesList');
        if (!list) return;

        list.innerHTML = '';
        this.mainCategories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `
                <span>${category.name}</span>
                <div class="category-item-actions">
                    <button class="btn btn-danger btn-small" onclick="expenseTracker.deleteMainCategory('${category.name}')">
                        Delete
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    renderSubCategoriesList() {
        const container = document.getElementById('subCategoriesList');
        if (!container) return;

        container.innerHTML = '';
        Object.keys(this.subCategories).forEach(mainCat => {
            const div = document.createElement('div');
            div.className = 'category-group';

            const title = document.createElement('h4');
            title.textContent = mainCat;
            div.appendChild(title);

            const list = document.createElement('ul');
            list.className = 'category-list';

            this.subCategories[mainCat].forEach(subCat => {
                const li = document.createElement('li');
                li.className = 'category-item';
                li.innerHTML = `
                    <span>${subCat.name}</span>
                    <div class="category-item-actions">
                        <button class="btn btn-danger btn-small" 
                                onclick="expenseTracker.deleteSubCategory('${mainCat}', '${subCat.name}')">
                            Delete
                        </button>
                    </div>
                `;
                list.appendChild(li);
            });

            div.appendChild(list);
            container.appendChild(div);
        });
    }

    renderPaymentModesList() {
        const list = document.getElementById('paymentModesList');
        if (!list) return;

        list.innerHTML = '';
        this.paymentModes.forEach(mode => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `
                <span>${mode.name}</span>
                <div class="category-item-actions">
                    <button class="btn btn-danger btn-small" onclick="expenseTracker.deletePaymentMode('${mode.name}')">
                        Delete
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    updateParentCategorySelect() {
        const select = document.getElementById('parentCategorySelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select Main Category</option>';
        this.mainCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    addMainCategory() {
        const input = document.getElementById('newMainCategory');
        if (!input) return;

        const name = input.value.trim();
        if (!name) {
            this.showMessage('Please enter a category name', 'error');
            return;
        }

        if (this.mainCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Category already exists', 'error');
            return;
        }

        this.mainCategories.push({
            id: this.nextCategoryId++,
            name: name
        });

        this.subCategories[name] = [];

        input.value = '';
        this.updateCategoryManagement();
        this.populateMainCategories();
        this.showMessage('Main category added successfully');
    }

    addSubCategory() {
        const parentSelect = document.getElementById('parentCategorySelect');
        const input = document.getElementById('newSubCategory');

        if (!parentSelect || !input) return;

        const parentCategory = parentSelect.value;
        const name = input.value.trim();

        if (!parentCategory) {
            this.showMessage('Please select a main category', 'error');
            return;
        }

        if (!name) {
            this.showMessage('Please enter a sub category name', 'error');
            return;
        }

        if (this.subCategories[parentCategory].some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Sub category already exists', 'error');
            return;
        }

        this.subCategories[parentCategory].push({
            id: this.nextCategoryId++,
            name: name
        });

        input.value = '';
        this.updateCategoryManagement();
        this.showMessage('Sub category added successfully');
    }

    addPaymentMode() {
        const input = document.getElementById('newPaymentMode');
        if (!input) return;

        const name = input.value.trim();
        if (!name) {
            this.showMessage('Please enter a payment mode name', 'error');
            return;
        }

        if (this.paymentModes.some(mode => mode.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Payment mode already exists', 'error');
            return;
        }

        this.paymentModes.push({
            id: this.nextCategoryId++,
            name: name
        });

        input.value = '';
        this.updateCategoryManagement();
        this.populatePaymentModes();
        this.showMessage('Payment mode added successfully');
    }

    deleteMainCategory(name) {
        this.showConfirmation(
            `Are you sure you want to delete "${name}" and all its sub-categories?`,
            () => {
                this.mainCategories = this.mainCategories.filter(cat => cat.name !== name);
                delete this.subCategories[name];
                this.updateCategoryManagement();
                this.populateMainCategories();
                this.showMessage('Main category deleted successfully');
            }
        );
    }

    deleteSubCategory(mainCat, subCatName) {
        this.showConfirmation(
            `Are you sure you want to delete "${subCatName}"?`,
            () => {
                this.subCategories[mainCat] = this.subCategories[mainCat].filter(sub => sub.name !== subCatName);
                this.updateCategoryManagement();
                this.showMessage('Sub category deleted successfully');
            }
        );
    }

    deletePaymentMode(name) {
        this.showConfirmation(
            `Are you sure you want to delete "${name}"?`,
            () => {
                this.paymentModes = this.paymentModes.filter(mode => mode.name !== name);
                this.updateCategoryManagement();
                this.populatePaymentModes();
                this.showMessage('Payment mode deleted successfully');
            }
        );
    }

    // Utility methods
    showMessage(message, type = 'success') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        container.appendChild(messageEl);

        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    showConfirmation(message, onConfirm) {
        const dialog = document.getElementById('confirmDialog');
        const messageEl = document.getElementById('confirmMessage');

        if (!dialog || !messageEl) return;

        messageEl.textContent = message;
        dialog.classList.add('active');
        this.pendingConfirmAction = onConfirm;
    }

    confirmAction() {
        const dialog = document.getElementById('confirmDialog');
        if (dialog) {
            dialog.classList.remove('active');
        }

        if (this.pendingConfirmAction) {
            this.pendingConfirmAction();
            this.pendingConfirmAction = null;
        }
    }

    cancelAction() {
        const dialog = document.getElementById('confirmDialog');
        if (dialog) {
            dialog.classList.remove('active');
        }
        this.pendingConfirmAction = null;
    }

    setupPWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW registered successfully');
                })
                .catch(error => {
                    console.log('SW registration failed');
                });
        }

        // Handle beforeinstallprompt event
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
        });
    }
}

// Initialize the app
const expenseTracker = new ExpenseTracker();