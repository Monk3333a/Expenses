// Enhanced Family Expense Tracker with Independent Subcategories and Analytics
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
            sub: [],  // Now independent array instead of nested object
            payment: []
        };
        this.unsubscribers = [];
        this.isOnline = navigator.onLine;

        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupAuthListeners();
            this.setupEventListeners();
            this.setupNetworkListeners();
            this.setupPWA();

            // Monitor auth state
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
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => this.handleAddExpense(e));
        }

        // Filters
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('memberFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('monthFilter')?.addEventListener('change', () => this.applyFilters());

        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('manageBtn')?.addEventListener('click', () => this.openCategoryModal());
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeCategoryModal());

        this.setupCategoryManagement();
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
        // Updated structure with independent subcategories
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
                // Food subcategories
                { name: "Groceries" },
                { name: "Dining Out" },
                { name: "Snacks" },
                { name: "Coffee/Tea" },

                // Transport subcategories  
                { name: "Fuel" },
                { name: "Public Transport" },
                { name: "Taxi/Uber" },
                { name: "Car Maintenance" },

                // Shopping subcategories
                { name: "Clothing" },
                { name: "Electronics" },
                { name: "Household Items" },
                { name: "Personal Care" },

                // Bills subcategories
                { name: "Electricity" },
                { name: "Internet" },
                { name: "Phone" },
                { name: "Water" },
                { name: "Gas" },

                // Entertainment subcategories
                { name: "Movies" },
                { name: "Games" },
                { name: "Sports" },
                { name: "Books" },

                // Healthcare subcategories
                { name: "Doctor Visit" },
                { name: "Medicines" },
                { name: "Health Insurance" },

                // Education subcategories
                { name: "Books" },
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
            addedBy: formData.get('addedBy') || 'Unknown',
            addedByEmail: this.currentUser.email,
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

    // Enhanced Analytics Functions
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

        // This month's expenses
        const thisMonthExpenses = this.expenses.filter(exp => {
            if (!exp.date) return false;
            return exp.date.startsWith(currentMonth);
        });

        const monthlyTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const monthlyEl = document.getElementById('monthlyAmount');
        if (monthlyEl) monthlyEl.textContent = `$${monthlyTotal.toFixed(2)}`;

        // Month to date progress
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const monthProgress = (daysPassed / daysInMonth) * 100;

        const monthProgressEl = document.getElementById('monthProgress');
        if (monthProgressEl) {
            monthProgressEl.textContent = `${Math.round(monthProgress)}% of month elapsed`;
        }
    }

    updateYearlyAnalytics() {
        const now = new Date();
        const currentYear = now.getFullYear().toString();

        // This year's expenses
        const thisYearExpenses = this.expenses.filter(exp => {
            if (!exp.date) return false;
            return exp.date.startsWith(currentYear);
        });

        const yearlyTotal = thisYearExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const yearlyEl = document.getElementById('yearlyAmount');
        if (yearlyEl) yearlyEl.textContent = `$${yearlyTotal.toFixed(2)}`;

        // Year to date progress
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
        this.populateSubCategories(); // Now independent
        this.populatePaymentModes();
        this.populateFilters();
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

        // Now subcategories are independent - show all of them
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

    populateFilters() {
        // Category filter
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

        // Member filter
        const memberFilter = document.getElementById('memberFilter');
        if (memberFilter) {
            const members = [...new Set(this.expenses.map(exp => exp.addedBy).filter(Boolean))];
            memberFilter.innerHTML = '<option value="">All Members</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member;
                option.textContent = member;
                memberFilter.appendChild(option);
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
                    </div>
                </td>
                <td class="amount-cell">$${expense.amount.toFixed(2)}</td>
                <td>${expense.addedBy}</td>
                <td>
                    <button class="btn-delete btn-small" onclick="familyTracker.deleteExpense('${expense.id}')">
                        Delete
                    </button>
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
        const memberFilter = document.getElementById('memberFilter')?.value;
        const monthFilter = document.getElementById('monthFilter')?.value;

        if (categoryFilter) {
            filtered = filtered.filter(exp => exp.mainCategory === categoryFilter);
        }

        if (memberFilter) {
            filtered = filtered.filter(exp => exp.addedBy === memberFilter);
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

        const headers = ['Date', 'Main Category', 'Sub Category', 'Amount', 'Payment Mode', 'Added By'];
        const csvData = [headers];

        filteredExpenses.forEach(expense => {
            csvData.push([
                expense.date,
                expense.mainCategory,
                expense.subCategory,
                expense.amount.toFixed(2),
                expense.paymentMode,
                expense.addedBy
            ]);
        });

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `family_expenses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showMessage('CSV exported successfully!', 'success');
    }

    // Category Management (simplified for this example)
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

    updateCategoryManagement() {
        // Update category management UI
        console.log('Category management updated');
    }

    setupCategoryManagement() {
        // Add category management event listeners
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