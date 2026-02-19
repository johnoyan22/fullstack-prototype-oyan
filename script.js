// ========================================
// GLOBAL VARIABLES & CONFIGURATION
// ========================================
const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;
let editingEmployeeId = null;
let editingAccountId = null;

// Database structure
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// ========================================
// STORAGE FUNCTIONS
// ========================================
function loadFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            window.db = JSON.parse(stored);
        } else {
            // Seed initial data
            seedInitialData();
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
        seedInitialData();
    }
}

function seedInitialData() {
    window.db = {
        accounts: [
            {
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'Admin',
                verified: true
            }
        ],
        departments: [
            { id: 1, name: 'Engineering', description: 'Software team' },
            { id: 2, name: 'HR', description: 'Human Resources' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

// ========================================
// ROUTING FUNCTIONS
// ========================================
function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2); // Remove '#/'

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Protected routes - require authentication
    const protectedRoutes = ['profile', 'employees', 'departments', 'accounts', 'requests'];
    const adminRoutes = ['employees', 'departments', 'accounts'];

    // Check authentication
    if (protectedRoutes.includes(route) && !currentUser) {
        navigateTo('#/login');
        return;
    }

    // Check admin access
    if (adminRoutes.includes(route) && currentUser && currentUser.role !== 'Admin') {
        navigateTo('#/');
        showToast('Access denied. Admin privileges required.', 'danger');
        return;
    }

    // Route to appropriate page
    let pageId = route ? `${route}-page` : 'home-page';
    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add('active');

        // Render page-specific content
        switch (route) {
            case 'profile':
                renderProfile();
                break;
            case 'employees':
                renderEmployeesList();
                break;
            case 'departments':
                renderDepartmentsList();
                break;
            case 'accounts':
                renderAccountsList();
                break;
            case 'requests':
                renderRequestsList();
                break;
        }
    } else {
        // Default to home if page not found
        document.getElementById('home-page').classList.add('active');
    }
}

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================
function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;

    if (isAuth && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');

        // Update username display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = user.firstName + ' ' + user.lastName;
        }

        // Add admin class if admin
        if (user.role === 'Admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
    } else {
        body.classList.remove('authenticated');
        body.classList.add('not-authenticated');
        body.classList.remove('is-admin');
    }
}

function checkAuthState() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        const user = window.db.accounts.find(acc => acc.email === token);
        if (user && user.verified) {
            setAuthState(true, user);
        } else {
            localStorage.removeItem('auth_token');
            setAuthState(false);
        }
    }
}

// ========================================
// REGISTRATION
// ========================================
document.getElementById('register-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    // Check if email already exists
    if (window.db.accounts.find(acc => acc.email === email)) {
        showToast('Email already registered!', 'danger');
        return;
    }

    // Validate password length
    if (password.length < 6) {
        showToast('Password must be at least 6 characters!', 'danger');
        return;
    }

    // Create new account
    const newAccount = {
        id: window.db.accounts.length + 1,
        firstName,
        lastName,
        email,
        password,
        role: 'User',
        verified: false
    };

    window.db.accounts.push(newAccount);
    saveToStorage();

    // Store unverified email for verification page
    localStorage.setItem('unverified_email', email);

    showToast('Account created! Please verify your email.', 'success');
    navigateTo('#/verify-email');
});

// ========================================
// EMAIL VERIFICATION
// ========================================
function showVerifyEmailPage() {
    const email = localStorage.getItem('unverified_email');
    const display = document.getElementById('verify-email-display');
    if (display && email) {
        display.textContent = email;
    }
}

document.getElementById('simulate-verify-btn').addEventListener('click', function () {
    const email = localStorage.getItem('unverified_email');
    if (!email) {
        showToast('No pending verification found!', 'danger');
        return;
    }

    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem('unverified_email');
        showToast('Email verified successfully!', 'success');
        navigateTo('#/login');

        // Show success message on login page
        setTimeout(() => {
            const alert = document.getElementById('login-success-alert');
            if (alert) {
                alert.classList.remove('d-none');
            }
        }, 100);
    } else {
        showToast('Account not found!', 'danger');
    }
});

// ========================================
// LOGIN
// ========================================
document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    const account = window.db.accounts.find(
        acc => acc.email === email && acc.password === password && acc.verified === true
    );

    if (account) {
        localStorage.setItem('auth_token', account.email);
        setAuthState(true, account);
        showToast('Login successful!', 'success');
        navigateTo('#/profile');

        // Clear form
        document.getElementById('login-form').reset();
    } else {
        showToast('Invalid credentials or email not verified!', 'danger');
    }
});

// ========================================
// LOGOUT
// ========================================
document.getElementById('logout-btn').addEventListener('click', function (e) {
    e.preventDefault();
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out successfully!', 'success');
    navigateTo('#/');
});

// ========================================
// PROFILE PAGE
// ========================================
function renderProfile() {
    const container = document.getElementById('profile-content');
    if (!currentUser) return;

    container.innerHTML = `
        <div class="mb-3">
            <strong>${currentUser.firstName} ${currentUser.lastName}</strong>
        </div>
        <div class="mb-3">
            <strong>Email:</strong> ${currentUser.email}
        </div>
        <div class="mb-3">
            <strong>Role:</strong> ${currentUser.role}
        </div>
        <button class="btn btn-primary" onclick="alert('Edit profile functionality coming soon!')">Edit Profile</button>
    `;
}

// ========================================
// EMPLOYEES PAGE
// ========================================
function renderEmployeesList() {
    const container = document.getElementById('employees-list');
    const employees = window.db.employees;

    if (employees.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">No employees.</div>
        `;
        return;
    }

    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Dept</th>
                    <th class="table-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    employees.forEach(emp => {
        const account = window.db.accounts.find(acc => acc.email === emp.email);
        const dept = window.db.departments.find(d => d.id === emp.departmentId);
        const name = account ? `${account.firstName} ${account.lastName}` : emp.email;

        html += `
            <tr>
                <td>${emp.id}</td>
                <td>${name}</td>
                <td>${emp.position}</td>
                <td>${dept ? dept.name : 'N/A'}</td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-primary" onclick="editEmployee(${emp.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function populateDepartmentDropdown() {
    const select = document.getElementById('emp-department');
    select.innerHTML = '<option value="">Select Department</option>';

    window.db.departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        select.appendChild(option);
    });
}

document.getElementById('add-employee-btn').addEventListener('click', function () {
    editingEmployeeId = null;
    document.getElementById('employee-form').reset();
    document.getElementById('employee-form-container').classList.remove('d-none');
    populateDepartmentDropdown();
});

document.getElementById('cancel-employee-btn').addEventListener('click', function () {
    document.getElementById('employee-form-container').classList.add('d-none');
    editingEmployeeId = null;
});

document.getElementById('employee-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const empId = document.getElementById('emp-id').value.trim();
    const email = document.getElementById('emp-email').value.trim().toLowerCase();
    const position = document.getElementById('emp-position').value.trim();
    const departmentId = parseInt(document.getElementById('emp-department').value);
    const hireDate = document.getElementById('emp-hiredate').value;

    // Validate that user email exists
    if (!window.db.accounts.find(acc => acc.email === email)) {
        showToast('User email must match an existing account!', 'danger');
        return;
    }

    if (editingEmployeeId) {
        // Update existing employee
        const employee = window.db.employees.find(e => e.id === editingEmployeeId);
        if (employee) {
            employee.employeeId = empId;
            employee.email = email;
            employee.position = position;
            employee.departmentId = departmentId;
            employee.hireDate = hireDate;
            showToast('Employee updated!', 'success');
        }
    } else {
        // Create new employee
        const newEmployee = {
            id: window.db.employees.length + 1,
            employeeId: empId,
            email: email,
            position: position,
            departmentId: departmentId,
            hireDate: hireDate
        };
        window.db.employees.push(newEmployee);
        showToast('Employee added!', 'success');
    }

    saveToStorage();
    renderEmployeesList();
    document.getElementById('employee-form-container').classList.add('d-none');
    editingEmployeeId = null;
    document.getElementById('employee-form').reset();
});

window.editEmployee = function (id) {
    editingEmployeeId = id;
    const employee = window.db.employees.find(e => e.id === id);
    if (!employee) return;

    document.getElementById('emp-id').value = employee.employeeId;
    document.getElementById('emp-email').value = employee.email;
    document.getElementById('emp-position').value = employee.position;
    document.getElementById('emp-hiredate').value = employee.hireDate;

    populateDepartmentDropdown();
    document.getElementById('emp-department').value = employee.departmentId;

    document.getElementById('employee-form-container').classList.remove('d-none');
};

window.deleteEmployee = function (id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        window.db.employees = window.db.employees.filter(e => e.id !== id);
        saveToStorage();
        renderEmployeesList();
        showToast('Employee deleted!', 'success');
    }
};

// ========================================
// DEPARTMENTS PAGE
// ========================================
function renderDepartmentsList() {
    const container = document.getElementById('departments-list');
    const departments = window.db.departments;

    if (departments.length === 0) {
        container.innerHTML = `<div class="alert alert-info">No departments.</div>`;
        return;
    }

    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th class="table-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    departments.forEach(dept => {
        html += `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-primary" onclick="alert('Edit department: ${dept.name}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="alert('Delete department: ${dept.name}')">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

document.getElementById('add-department-btn').addEventListener('click', function () {
    alert('Add Department functionality - Not fully implemented in this prototype');
});

// ========================================
// ACCOUNTS PAGE
// ========================================
function renderAccountsList() {
    const container = document.getElementById('accounts-list');
    const accounts = window.db.accounts;

    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th class="table-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    accounts.forEach(acc => {
        html += `
            <tr>
                <td>${acc.firstName} ${acc.lastName}</td>
                <td>${acc.email}</td>
                <td>${acc.role}</td>
                <td>${acc.verified ? '✓' : '—'}</td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-primary" onclick="editAccount(${acc.id})">Edit</button>
                    <button class="btn btn-sm btn-warning" onclick="resetPassword(${acc.id})">Reset Password</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAccount(${acc.id})">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

document.getElementById('add-account-btn').addEventListener('click', function () {
    editingAccountId = null;
    document.getElementById('account-form').reset();
    document.getElementById('account-form-container').classList.remove('d-none');
});

document.getElementById('cancel-account-btn').addEventListener('click', function () {
    document.getElementById('account-form-container').classList.add('d-none');
    editingAccountId = null;
});

document.getElementById('account-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const firstName = document.getElementById('acc-firstname').value.trim();
    const lastName = document.getElementById('acc-lastname').value.trim();
    const email = document.getElementById('acc-email').value.trim().toLowerCase();
    const password = document.getElementById('acc-password').value;
    const role = document.getElementById('acc-role').value;
    const verified = document.getElementById('acc-verified').checked;

    if (password.length < 6) {
        showToast('Password must be at least 6 characters!', 'danger');
        return;
    }

    if (editingAccountId) {
        // Update existing account
        const account = window.db.accounts.find(a => a.id === editingAccountId);
        if (account) {
            // Check if email changed and already exists
            if (account.email !== email && window.db.accounts.find(a => a.email === email)) {
                showToast('Email already exists!', 'danger');
                return;
            }

            account.firstName = firstName;
            account.lastName = lastName;
            account.email = email;
            account.password = password;
            account.role = role;
            account.verified = verified;
            showToast('Account updated!', 'success');
        }
    } else {
        // Create new account
        if (window.db.accounts.find(a => a.email === email)) {
            showToast('Email already exists!', 'danger');
            return;
        }

        const newAccount = {
            id: window.db.accounts.length + 1,
            firstName,
            lastName,
            email,
            password,
            role,
            verified
        };
        window.db.accounts.push(newAccount);
        showToast('Account created!', 'success');
    }

    saveToStorage();
    renderAccountsList();
    document.getElementById('account-form-container').classList.add('d-none');
    editingAccountId = null;
    document.getElementById('account-form').reset();
});

window.editAccount = function (id) {
    editingAccountId = id;
    const account = window.db.accounts.find(a => a.id === id);
    if (!account) return;

    document.getElementById('acc-firstname').value = account.firstName;
    document.getElementById('acc-lastname').value = account.lastName;
    document.getElementById('acc-email').value = account.email;
    document.getElementById('acc-password').value = account.password;
    document.getElementById('acc-role').value = account.role;
    document.getElementById('acc-verified').checked = account.verified;

    document.getElementById('account-form-container').classList.remove('d-none');
};

window.resetPassword = function (id) {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword) return;

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters!', 'danger');
        return;
    }

    const account = window.db.accounts.find(a => a.id === id);
    if (account) {
        account.password = newPassword;
        saveToStorage();
        showToast('Password reset successfully!', 'success');
    }
};

window.deleteAccount = function (id) {
    // Prevent self-deletion
    if (currentUser && currentUser.id === id) {
        showToast('You cannot delete your own account!', 'danger');
        return;
    }

    if (confirm('Are you sure you want to delete this account?')) {
        window.db.accounts = window.db.accounts.filter(a => a.id !== id);
        saveToStorage();
        renderAccountsList();
        showToast('Account deleted!', 'success');
    }
};

// ========================================
// REQUESTS PAGE
// ========================================
function renderRequestsList() {
    const container = document.getElementById('requests-list');
    if (!currentUser) return;

    const userRequests = window.db.requests.filter(req => req.employeeEmail === currentUser.email);

    if (userRequests.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                You have no requests yet.
                <button class="btn btn-sm btn-primary ms-2" data-bs-toggle="modal" data-bs-target="#requestModal">Create One</button>
            </div>
        `;
        return;
    }

    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    userRequests.forEach(req => {
        const itemsList = req.items.map(item => `${item.name} (${item.qty})`).join(', ');
        const statusClass = req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning';

        html += `
            <tr>
                <td>${req.date}</td>
                <td>${req.type}</td>
                <td>${itemsList}</td>
                <td><span class="badge bg-${statusClass}">${req.status}</span></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

document.getElementById('new-request-btn').addEventListener('click', function () {
    const modal = new bootstrap.Modal(document.getElementById('requestModal'));
    modal.show();

    // Reset form and items
    document.getElementById('request-form').reset();
    const itemsContainer = document.getElementById('request-items');
    itemsContainer.innerHTML = `
        <div class="input-group mb-2">
            <input type="text" class="form-control item-name" placeholder="Item name" required>
            <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
            <button type="button" class="btn btn-danger remove-item" disabled>×</button>
        </div>
    `;
});

document.getElementById('add-item-btn').addEventListener('click', function () {
    const container = document.getElementById('request-items');
    const newItem = document.createElement('div');
    newItem.className = 'input-group mb-2';
    newItem.innerHTML = `
        <input type="text" class="form-control item-name" placeholder="Item name" required>
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
        <button type="button" class="btn btn-danger remove-item">×</button>
    `;
    container.appendChild(newItem);

    // Add event listener to remove button
    newItem.querySelector('.remove-item').addEventListener('click', function () {
        newItem.remove();
    });
});

document.getElementById('request-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const type = document.getElementById('req-type').value;
    const itemInputs = document.querySelectorAll('#request-items .input-group');

    const items = [];
    itemInputs.forEach(input => {
        const name = input.querySelector('.item-name').value.trim();
        const qty = parseInt(input.querySelector('.item-qty').value);
        if (name && qty > 0) {
            items.push({ name, qty });
        }
    });

    if (items.length === 0) {
        showToast('Please add at least one item!', 'danger');
        return;
    }

    const newRequest = {
        id: window.db.requests.length + 1,
        type,
        items,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        employeeEmail: currentUser.email
    };

    window.db.requests.push(newRequest);
    saveToStorage();

    showToast('Request submitted!', 'success');
    const modal = bootstrap.Modal.getInstance(document.getElementById('requestModal'));
    modal.hide();

    renderRequestsList();
});

// ========================================
// TOAST NOTIFICATIONS
// ========================================
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.role = 'alert';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ========================================
// INITIALIZATION
// ========================================
function init() {
    // Load data from storage
    loadFromStorage();

    // Check authentication state
    checkAuthState();

    // Set up routing
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    handleRouting();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRouting);

    // Handle verify email page
    if (window.location.hash === '#/verify-email') {
        showVerifyEmailPage();
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
