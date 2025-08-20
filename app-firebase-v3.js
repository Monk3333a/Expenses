// Enhanced Family Expense Tracker v3.0 - Fixed Issues
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { 
    doc, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    setDoc, 
    getDoc,
    enableNetwork,
    disableNetwork
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

class FamilyExpenseTracker {
    constructor() {
        this.currentUser = null;
        this.familyId = null;
        this.expenses = [];
        this.categories = {
            main: [],
            sub: [],
            payment: []
        };
        this.unsubscribers = [];
        this.isOnline = navigator.onLine;
        this.editingExpenseId = null;

        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupAuthListeners();
            this.setupEventListeners();
            this.setupNetworkListeners();
            this.setupPWA();

            onAuthStateChanged(auth, (user) => {
                this.handleAuthStateChange(user);
            });
        });
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus('🟢 Online');
            enableNetwork(db);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus('🔴 Offline');
            disableNetwork(db);
        });

        this.updateSyncStatus(this.isOnline ? '🟢 Online' : '🔴 Offline');
    }

    updateSyncStatus(status) {
        const statusEl = document.getElementById('syncStatus');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = `sync-status ${this.isOnline ? 'online' : 'offline'}`;
        }
    }

    async handleAuthStateChange(user) {
        if (user) {
            this.currentUser = user;
            await this.loadUserData();
            this.showMainApp();
            this.setupRealtimeListeners();
        } else {
            this.currentUser = null;
            this.familyId = null;
            this.cleanupListeners();
            this.showAuthSection();
        }
    }

    async loadUserData() {
        try {
            const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
            if (userDoc.exists()) {
                this.familyId = userDoc.data().familyId;
            }

            const emailEl = document.getElementById('userEmail');
            if (emailEl) {
                emailEl.textContent = this.currentUser.email;
            }

            if (this.familyId) {
                await this.loadFamilyCategories();
            }

        } catch (error) {
            console.error('Error loading user data:', error);
            this.showMessage('Error loading user data', 'error');
        }
    }

    setupAuthListeners() {
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            this.handleLogin();
        });

        document.getElementById('signupBtn')?.addEventListener('click', () => {
            this.handleSignup();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        document.getElementById('showSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
    }

    setupEventListeners() {
        // Expense form
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => this.handleAddExpense(e));
        }

        // Edit expense form
        const editExpenseForm = document.getElementById('editExpenseForm');
        if (editExpenseForm) {
            editExpenseForm.addEventListener('submit', (e) => this.handleEditExpense(e));
        }

        // Filters
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('monthFilter')?.addEventListener('change', () => this.applyFilters());

        // Buttons
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('manageBtn')?.addEventListener('click', () => this.openCategoryModal());

        // Modal controls
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeCategoryModal());
        document.getElementById('closeEditModal')?.addEventListener('click', () => this.closeEditModal());
        document.getElementById('cancelEdit')?.addEventListener('click', () => this.closeEditModal());

        // Category management
        this.setupCategoryManagement();

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    setupCategoryManagement() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Add category buttons
        document.getElementById('addMainCategory')?.addEventListener('click', () => this.addMainCategory());
        document.getElementById('addSubCategory')?.addEventListener('click', () => this.addSubCategory());
        document.getElementById('addPaymentMode')?.addEventListener('click', () => this.addPaymentMode());

        // Enter key support for adding categories
        document.getElementById('newMainCategory')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addMainCategory();
        });
        document.getElementById('newSubCategory')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSubCategory();
        });
        document.getElementById('newPaymentMode')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPaymentMode();
        });
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showMessage('Please enter email and password', 'error');
            return;
        }

        try {
            this.showMessage('Signing in...', 'info');
            await signInWithEmailAndPassword(auth, email, password);
            this.showMessage('Signed in successfully!', 'success');
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(this.getAuthErrorMessage(error.code), 'error');
        }
    }

    async handleSignup() {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const familyName = document.getElementById('familyName').value.trim();

        if (!email || !password || !familyName) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            this.showMessage('Creating account...', 'info');

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const familyRef = doc(collection(db, 'families'));
            const familyId = familyRef.id;

            await setDoc(familyRef, {
                name: familyName,
                createdBy: user.uid,
                createdAt: new Date(),
                members: [user.uid]
            });

            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                familyId: familyId,
                familyName: familyName,
                joinedAt: new Date()
            });

            await this.initializeDefaultCategories(familyId);
            this.showMessage('Account created successfully!', 'success');

        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage(this.getAuthErrorMessage(error.code), 'error');
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
            this.showMessage('Signed out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Error signing out', 'error');
        }
    }

    getAuthErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Invalid email or password';
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/invalid-email':
                return 'Invalid email address';
            default:
                return 'Authentication error occurred';
        }
    }

    async initializeDefaultCategories(familyId) {
        const defaultCategories = {
            main: [
                { name: "Food" },
                { name: "Transport" },
                { name: "Shopping" },
                { name: "Bills" },
                { name: "Entertainment" },
                { name: "Healthcare" },
                { name: "Education" }
            ],
            sub: [
                { name: "Groceries" },
                { name: "Dining Out" },
                { name: "Snacks" },
                { name: "Coffee/Tea" },
                { name: "Fuel" },
                { name: "Public Transport" },
                { name: "Taxi/Uber" },
                { name: "Car Maintenance" },
                { name: "Clothing" },
                { name: "Electronics" },
                { name: "Household Items" },
                { name: "Personal Care" },
                { name: "Electricity" },
                { name: "Internet" },
                { name: "Phone" },
                { name: "Water" },
                { name: "Gas" },
                { name: "Movies" },
                { name: "Games" },
                { name: "Sports" },
                { name: "Books" },
                { name: "Doctor Visit" },
                { name: "Medicines" },
                { name: "Health Insurance" },
                { name: "Course Fees" },
                { name: "Supplies" }
            ],
            payment: [
                { name: "Cash" },
                { name: "Credit Card" },
                { name: "Debit Card" },
                { name: "UPI" },
                { name: "Net Banking" },
                { name: "Mobile Wallet" }
            ]
        };

        await setDoc(doc(db, 'families', familyId, 'settings', 'categories'), defaultCategories);
    }

    setupRealtimeListeners() {
        if (!this.familyId) return;

        const expensesRef = collection(db, 'families', this.familyId, 'expenses');
        const expensesQuery = query(expensesRef, orderBy('date', 'desc'));

        const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
            this.expenses = [];
            snapshot.forEach((doc) => {
                this.expenses.push({ id: doc.id, ...doc.data() });
            });
            this.renderExpensesList();
            this.updateAnalytics();
            this.updateSyncStatus(this.isOnline ? '🟢 Synced' : '🔴 Offline');
        });

        const categoriesRef = doc(db, 'families', this.familyId, 'settings', 'categories');
        const unsubCategories = onSnapshot(categoriesRef, (doc) => {
            if (doc.exists()) {
                this.categories = doc.data();
                this.populateDropdowns();
                this.updateCategoryManagement();
            }
        });

        this.unsubscribers.push(unsubExpenses, unsubCategories);
    }

    cleanupListeners() {
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers = [];
    }

    async handleAddExpense(e) {
        e.preventDefault();

        if (!this.currentUser || !this.familyId) {
            this.showMessage('Please sign in first', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const expense = {
            date: formData.get('date'),
            mainCategory: formData.get('mainCategory'),
            subCategory: formData.get('subCategory'),
            amount: parseFloat(formData.get('amount')),
            paymentMode: formData.get('paymentMode'),
            description: formData.get('description') || '',
            addedAt: new Date(),
            familyId: this.familyId
        };

        if (!expense.date || !expense.mainCategory || !expense.subCategory || 
            !expense.amount || !expense.paymentMode) {
            this.showMessage('Please fill all required fields', 'error');
            return;
        }

        if (expense.amount <= 0) {
            this.showMessage('Amount must be greater than 0', 'error');
            return;
        }

        try {
            this.updateSyncStatus('⏳ Syncing...');

            await addDoc(collection(db, 'families', this.familyId, 'expenses'), expense);

            e.target.reset();
            this.setCurrentDate();

            this.showMessage('Expense added successfully!', 'success');
            this.updateSyncStatus(this.isOnline ? '🟢 Synced' : '🔴 Offline');

        } catch (error) {
            console.error('Error adding expense:', error);
            this.showMessage('Error adding expense', 'error');
            this.updateSyncStatus('❌ Sync Error');
        }
    }

    async handleEditExpense(e) {
        e.preventDefault();

        if (!this.editingExpenseId) return;

        const formData = new FormData(e.target);
        const updatedExpense = {
            date: formData.get('date'),
            mainCategory: formData.get('mainCategory'),
            subCategory: formData.get('subCategory'),
            amount: parseFloat(formData.get('amount')),
            paymentMode: formData.get('paymentMode'),
            description: formData.get('description') || '',
            updatedAt: new Date()
        };

        if (!updatedExpense.date || !updatedExpense.mainCategory || !updatedExpense.subCategory || 
            !updatedExpense.amount || !updatedExpense.paymentMode) {
            this.showMessage('Please fill all required fields', 'error');
            return;
        }

        if (updatedExpense.amount <= 0) {
            this.showMessage('Amount must be greater than 0', 'error');
            return;
        }

        try {
            this.updateSyncStatus('⏳ Syncing...');

            await updateDoc(doc(db, 'families', this.familyId, 'expenses', this.editingExpenseId), updatedExpense);

            this.closeEditModal();
            this.showMessage('Expense updated successfully!', 'success');
            this.updateSyncStatus(this.isOnline ? '🟢 Synced' : '🔴 Offline');

        } catch (error) {
            console.error('Error updating expense:', error);
            this.showMessage('Error updating expense', 'error');
            this.updateSyncStatus('❌ Sync Error');
        }
    }

    editExpense(expenseId) {
        const expense = this.expenses.find(exp => exp.id === expenseId);
        if (!expense) return;

        this.editingExpenseId = expenseId;

        // Populate edit form
        document.getElementById('editDate').value = expense.date;
        document.getElementById('editAmount').value = expense.amount;
        document.getElementById('editMainCategory').value = expense.mainCategory;
        document.getElementById('editSubCategory').value = expense.subCategory;
        document.getElementById('editPaymentMode').value = expense.paymentMode;
        document.getElementById('editDescription').value = expense.description || '';

        // Populate dropdowns if needed
        this.populateEditDropdowns();

        // Show modal
        document.getElementById('editExpenseModal').classList.add('active');
    }

    closeEditModal() {
        document.getElementById('editExpenseModal').classList.remove('active');
        this.editingExpenseId = null;
    }

    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            this.updateSyncStatus('⏳ Syncing...');
            await deleteDoc(doc(db, 'families', this.familyId, 'expenses', expenseId));
            this.showMessage('Expense deleted successfully', 'success');
            this.updateSyncStatus(this.isOnline ? '🟢 Synced' : '🔴 Offline');
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showMessage('Error deleting expense', 'error');
        }
    }

    // Category Management Functions
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    async addMainCategory() {
        const input = document.getElementById('newMainCategory');
        const name = input.value.trim();

        if (!name) {
            this.showMessage('Please enter a category name', 'error');
            return;
        }

        if (this.categories.main.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Category already exists', 'error');
            return;
        }

        try {
            const newCategories = {
                ...this.categories,
                main: [...this.categories.main, { name: name }]
            };

            await setDoc(doc(db, 'families', this.familyId, 'settings', 'categories'), newCategories);

            input.value = '';
            this.showMessage('Main category added successfully', 'success');

        } catch (error) {
            console.error('Error adding main category:', error);
            this.showMessage('Error adding category', 'error');
        }
    }

    async addSubCategory() {
        const input = document.getElementById('newSubCategory');
        const name = input.value.trim();

        if (!name) {
            this.showMessage('Please enter a sub-category name', 'error');
            return;
        }

        if (this.categories.sub.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Sub-category already exists', 'error');
            return;
        }

        try {
            const newCategories = {
                ...this.categories,
                sub: [...this.categories.sub, { name: name }]
            };

            await setDoc(doc(db, 'families', this.familyId, 'settings', 'categories'), newCategories);

            input.value = '';
            this.showMessage('Sub-category added successfully', 'success');

        } catch (error) {
            console.error('Error adding sub-category:', error);
            this.showMessage('Error adding sub-category', 'error');
        }
    }

    async addPaymentMode() {
        const input = document.getElementById('newPaymentMode');
        const name = input.value.trim();

        if (!name) {
            this.showMessage('Please enter a payment mode name', 'error');
            return;
        }

        if (this.categories.payment.some(mode => mode.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Payment mode already exists', 'error');
            return;
        }

        try {
            const newCategories = {
                ...this.categories,
                payment: [...this.categories.payment, { name: name }]
            };

            await setDoc(doc(db, 'families', this.familyId, 'settings', 'categories'), newCategories);

            input.value = '';
            this.showMessage('Payment mode added successfully', 'success');

        } catch (error) {
            console.error('Error adding payment mode:', error);
            this.showMessage('Error adding payment mode', 'error');
        }
    }

    async deleteMainCategory(categoryName) {
        if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) return;

        try {
            const newCategories = {
                ...this.categories,
                main: this.categories.main.filter(cat => cat.name !== categoryName)
            };

            await setDoc(doc(db, 'families', this.familyId, 'settings', 'categories'), newCategories);
            this.showMessage('Main category deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting main category:', error);
            this.showMessage('Error deleting category', 'error');
        }
    }

    async deleteSubCategory(categoryName) {
        if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) return;

        try {
            const newCategories = {
                ...this.categories,
                sub: this.categories.sub.filter(sub => sub.name !== categoryName)
            };

            await setDoc(doc(db, 'families', this.familyId, 'settings', 'categories'), newCategories);
            this.showMessage('Sub-category deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting sub-category:', error);
            this.showMessage('Error deleting sub-category', 'error');
        }
    }

    async deletePaymentMode(modeName) {
        if (!confirm(`Are you sure you want to delete "${modeName}"?`)) return;

        try {
            const newCategories = {
                ...this.categories,
                payment: this.categories.payment.filter(mode => mode.name !== modeName)
            };

            await setDoc(doc(db, 'families', this.familyId, 'settings', 'categories'), newCategories);
            this.showMessage('Payment mode deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting payment mode:', error);
            this.showMessage('Error deleting payment mode', 'error');
        }
    }

    updateCategoryManagement() {
        this.renderMainCategoriesList();
        this.renderSubCategoriesList();
        this.renderPaymentModesList();
    }

    renderMainCategoriesList() {
        const list = document.getElementById('mainCategoriesList');
        if (!list || !this.categories.main) return;

        list.innerHTML = '';
        this.categories.main.forEach(category => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `
                <span class="category-name">${category.name}</span>
                <button class="btn btn-danger btn-small" onclick="familyTracker.deleteMainCategory('${category.name}')">
                    Delete
                </button>
            `;
            list.appendChild(li);
        });
    }

    renderSubCategoriesList() {
        const list = document.getElementById('subCategoriesList');
        if (!list || !this.categories.sub) return;

        list.innerHTML = '';
        this.categories.sub.forEach(subCat => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `
                <span class="category-name">${subCat.name}</span>
                <button class="btn btn-danger btn-small" onclick="familyTracker.deleteSubCategory('${subCat.name}')">
                    Delete
                </button>
            `;
            list.appendChild(li);
        });
    }

    renderPaymentModesList() {
        const list = document.getElementById('paymentModesList');
        if (!list || !this.categories.payment) return;

        list.innerHTML = '';
        this.categories.payment.forEach(mode => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `
                <span class="category-name">${mode.name}</span>
                <button class="btn btn-danger btn-small" onclick="familyTracker.deletePaymentMode('${mode.name}')">
                    Delete
                </button>
            `;
            list.appendChild(li);
        });
    }

    // Analytics Functions
    updateAnalytics() {
        this.updateBasicSummary();
        this.updateMonthlyAnalytics();
        this.updateYearlyAnalytics();
        this.updateLast3MonthsAnalytics();
    }

    updateBasicSummary() {
        const filteredExpenses = this.applyFiltersToExpenses();

        const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalEl = document.getElementById('totalAmount');
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

        const totalCountEl = document.getElementById('totalCount');
        if (totalCountEl) totalCountEl.textContent = filteredExpenses.length;
    }

    updateMonthlyAnalytics() {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const thisMonthExpenses = this.expenses.filter(exp => {
            if (!exp.date) return false;
            return exp.date.startsWith(currentMonth);
        });

        const monthlyTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const monthlyEl = document.getElementById('monthlyAmount');
        if (monthlyEl) monthlyEl.textContent = `$${monthlyTotal.toFixed(2)}`;

        // Month progress
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const monthProgress = (daysPassed / daysInMonth) * 100;

        const monthProgressEl = document.getElementById('monthProgress');
        if (monthProgressEl) {
            monthProgressEl.textContent = `${Math.round(monthProgress)}% of month elapsed`;
        }

        // Daily average this month
        const dailyAvg = daysPassed > 0 ? monthlyTotal / daysPassed : 0;
        const dailyAvgEl = document.getElementById('dailyAverage');
        if (dailyAvgEl) dailyAvgEl.textContent = `$${dailyAvg.toFixed(2)}`;
    }

    updateYearlyAnalytics() {
        const now = new Date();
        const currentYear = now.getFullYear().toString();

        const thisYearExpenses = this.expenses.filter(exp => {
            if (!exp.date) return false;
            return exp.date.startsWith(currentYear);
        });

        const yearlyTotal = thisYearExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const yearlyEl = document.getElementById('yearlyAmount');
        if (yearlyEl) yearlyEl.textContent = `$${yearlyTotal.toFixed(2)}`;

        // Year progress
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const totalDaysInYear = Math.floor((new Date(now.getFullYear(), 11, 31) - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const yearProgress = (dayOfYear / totalDaysInYear) * 100;

        const yearProgressEl = document.getElementById('yearProgress');
        if (yearProgressEl) {
            yearProgressEl.textContent = `${Math.round(yearProgress)}% of year elapsed`;
        }
    }

    updateLast3MonthsAnalytics() {
        const now = new Date();
        const last3MonthsData = [];

        for (let i = 0; i < 3; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const monthExpenses = this.expenses.filter(exp => {
                if (!exp.date) return false;
                return exp.date.startsWith(monthStr);
            });

            const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const count = monthExpenses.length;

            last3MonthsData.unshift({ month: monthName, total, count });
        }

        this.renderLast3MonthsChart(last3MonthsData);
    }

    renderLast3MonthsChart(data) {
        const container = document.getElementById('last3MonthsChart');
        if (!container) return;

        const maxAmount = Math.max(...data.map(d => d.total));

        container.innerHTML = '';

        data.forEach(monthData => {
            const barContainer = document.createElement('div');
            barContainer.className = 'month-bar-container';

            const barHeight = maxAmount > 0 ? (monthData.total / maxAmount) * 100 : 0;

            barContainer.innerHTML = `
                <div class="month-bar" style="height: ${barHeight}%"></div>
                <div class="month-label">${monthData.month}</div>
                <div class="month-amount">$${monthData.total.toFixed(0)}</div>
                <div class="month-count">${monthData.count} items</div>
            `;

            container.appendChild(barContainer);
        });
    }

    // UI Helper Methods
    showAuthSection() {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        this.setCurrentDate();
        this.populateDropdowns();
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    }

    showSignupForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
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
        this.populateSubCategories();
        this.populatePaymentModes();
        this.populateFilters();
        this.populateEditDropdowns();
    }

    populateMainCategories() {
        const select = document.getElementById('mainCategory');
        if (!select || !this.categories.main) return;

        select.innerHTML = '<option value="">Select Main Category</option>';
        this.categories.main.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    populateSubCategories() {
        const select = document.getElementById('subCategory');
        if (!select || !this.categories.sub) return;

        select.innerHTML = '<option value="">Select Sub Category</option>';
        this.categories.sub.forEach(subCat => {
            const option = document.createElement('option');
            option.value = subCat.name;
            option.textContent = subCat.name;
            select.appendChild(option);
        });
    }

    populatePaymentModes() {
        const select = document.getElementById('paymentMode');
        if (!select || !this.categories.payment) return;

        select.innerHTML = '<option value="">Select Payment Mode</option>';
        this.categories.payment.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode.name;
            option.textContent = mode.name;
            select.appendChild(option);
        });
    }

    populateEditDropdowns() {
        // Populate edit form dropdowns
        const editMainSelect = document.getElementById('editMainCategory');
        if (editMainSelect && this.categories.main) {
            editMainSelect.innerHTML = '<option value="">Select Main Category</option>';
            this.categories.main.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                editMainSelect.appendChild(option);
            });
        }

        const editSubSelect = document.getElementById('editSubCategory');
        if (editSubSelect && this.categories.sub) {
            editSubSelect.innerHTML = '<option value="">Select Sub Category</option>';
            this.categories.sub.forEach(subCat => {
                const option = document.createElement('option');
                option.value = subCat.name;
                option.textContent = subCat.name;
                editSubSelect.appendChild(option);
            });
        }

        const editPaymentSelect = document.getElementById('editPaymentMode');
        if (editPaymentSelect && this.categories.payment) {
            editPaymentSelect.innerHTML = '<option value="">Select Payment Mode</option>';
            this.categories.payment.forEach(mode => {
                const option = document.createElement('option');
                option.value = mode.name;
                option.textContent = mode.name;
                editPaymentSelect.appendChild(option);
            });
        }
    }

    populateFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && this.categories.main) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            this.categories.main.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                categoryFilter.appendChild(option);
            });
        }
    }

    renderExpensesList() {
        const tbody = document.getElementById('expensesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        let filteredExpenses = this.applyFiltersToExpenses();

        filteredExpenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(expense.date)}</td>
                <td>
                    <div class="category-cell">
                        <strong>${expense.mainCategory}</strong><br>
                        <small>${expense.subCategory}</small>
                        ${expense.description ? `<br><em class="description">${expense.description}</em>` : ''}
                    </div>
                </td>
                <td class="amount-cell">$${expense.amount.toFixed(2)}</td>
                <td>${expense.paymentMode}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit btn-small" onclick="familyTracker.editExpense('${expense.id}')">
                            Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="familyTracker.deleteExpense('${expense.id}')">
                            Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        if (filteredExpenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No expenses found</td></tr>';
        }
    }

    applyFiltersToExpenses() {
        let filtered = [...this.expenses];

        const categoryFilter = document.getElementById('categoryFilter')?.value;
        const monthFilter = document.getElementById('monthFilter')?.value;

        if (categoryFilter) {
            filtered = filtered.filter(exp => exp.mainCategory === categoryFilter);
        }

        if (monthFilter) {
            const [year, month] = monthFilter.split('-');
            filtered = filtered.filter(exp => {
                if (!exp.date) return false;
                const expDate = new Date(exp.date);
                return expDate.getFullYear() == year && (expDate.getMonth() + 1) == month;
            });
        }

        return filtered;
    }

    applyFilters() {
        this.renderExpensesList();
        this.updateBasicSummary();
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    exportToCSV() {
        const filteredExpenses = this.applyFiltersToExpenses();

        if (filteredExpenses.length === 0) {
            this.showMessage('No expenses to export', 'error');
            return;
        }

        const headers = ['Date', 'Main Category', 'Sub Category', 'Amount', 'Payment Mode', 'Description'];
        const csvData = [headers];

        filteredExpenses.forEach(expense => {
            csvData.push([
                expense.date,
                expense.mainCategory,
                expense.subCategory,
                expense.amount.toFixed(2),
                expense.paymentMode,
                expense.description || ''
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

        this.showMessage('CSV exported successfully!', 'success');
    }

    openCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.add('active');
            this.updateCategoryManagement();
        }
    }

    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) modal.classList.remove('active');
    }

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
        }, 4000);
    }

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('SW registered successfully');
                })
                .catch(error => {
                    console.log('SW registration failed');
                });
        }
    }
}

// Initialize the app
const familyTracker = new FamilyExpenseTracker();
window.familyTracker = familyTracker;