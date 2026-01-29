// ============================================
// employees.js - Employee Management Module
// ============================================

// ============================================
// STATE MANAGEMENT
// ============================================
let employees = [];
let filteredEmployees = [];
let departments = [];
let positions = [];
let shifts = [];

let currentPage = 1;
let itemsPerPage = APP_CONFIG.defaultPageSize || 10;
let sortColumn = 'full_name';
let sortDirection = 'asc';
let editingEmployeeId = null;
let deleteEmployeeId = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    // Protect page - hanya user yang login bisa akses
    const isAuth = await Auth.protectPage();
    if (!isAuth) return;

    // Initialize
    await init();
});

async function init() {
    try {
        showLoading('employeeTableBody');
        
        // Load reference data (departments, positions, shifts)
        await loadReferenceData();
        
        // Load employees
        await loadEmployees();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load user info for header
        await loadUserInfo();
        
        console.log('✅ Employee Management initialized');
    } catch (error) {
        console.error('Initialization error:', error);
        showError('employeeTableBody', 'Gagal memuat data. Silakan refresh halaman.');
    }
}

// ============================================
// LOAD DATA FROM SUPABASE
// ============================================

// Load reference data (departments, positions, shifts)
async function loadReferenceData() {
    const supabase = getSupabase();
    
    // Fetch departments
    const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('dept_name');
    
    if (deptError) throw deptError;
    departments = deptData || [];
    
    // Fetch positions
    const { data: posData, error: posError } = await supabase
        .from('positions')
        .select('*')
        .eq('is_active', true)
        .order('position_name');
    
    if (posError) throw posError;
    positions = posData || [];
    
    // Fetch shifts
    const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_active', true)
        .order('shift_name');
    
    if (shiftError) throw shiftError;
    shifts = shiftData || [];
    
    // Populate dropdowns
    populateDropdowns();
    
    console.log('✅ Reference data loaded');
}

// Populate filter & form dropdowns
function populateDropdowns() {
    // Department filter
    const deptFilter = document.getElementById('filterDepartment');
    if (deptFilter) {
        deptFilter.innerHTML = '<option value="">All Departments</option>';
        departments.forEach(dept => {
            deptFilter.innerHTML += `<option value="${dept.id}">${dept.dept_name}</option>`;
        });
    }
    
    // Department select in form
    const deptSelect = document.getElementById('employeeDepartment');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">Pilih Department</option>';
        departments.forEach(dept => {
            deptSelect.innerHTML += `<option value="${dept.id}">${dept.dept_name}</option>`;
        });
    }
    
    // Position select in form
    const posSelect = document.getElementById('employeePosition');
    if (posSelect) {
        posSelect.innerHTML = '<option value="">Pilih Position</option>';
        positions.forEach(pos => {
            posSelect.innerHTML += `<option value="${pos.id}">${pos.position_name}</option>`;
        });
    }
    
    // Shift select in form
    const shiftSelect = document.getElementById('employeeShift');
    if (shiftSelect) {
        shiftSelect.innerHTML = '<option value="">Pilih Shift</option>';
        shifts.forEach(shift => {
            shiftSelect.innerHTML += `<option value="${shift.id}">${shift.shift_name} (${formatTime(shift.start_time)} - ${formatTime(shift.end_time)})</option>`;
        });
    }
    
    // Gender select
    const genderSelect = document.getElementById('employeeGender');
    if (genderSelect) {
        genderSelect.innerHTML = '<option value="">Pilih Gender</option>';
        GENDER_OPTIONS.forEach(gender => {
            genderSelect.innerHTML += `<option value="${gender}">${gender}</option>`;
        });
    }
    
    // Marital status select
    const maritalSelect = document.getElementById('employeeMaritalStatus');
    if (maritalSelect) {
        maritalSelect.innerHTML = '<option value="">Pilih Status</option>';
        MARITAL_STATUS_OPTIONS.forEach(status => {
            maritalSelect.innerHTML += `<option value="${status}">${status}</option>`;
        });
    }
    
    // Employment status select
    const empStatusSelect = document.getElementById('employeeStatus');
    if (empStatusSelect) {
        empStatusSelect.innerHTML = '<option value="">Pilih Status</option>';
        Object.values(EMPLOYMENT_STATUS).forEach(status => {
            empStatusSelect.innerHTML += `<option value="${status}">${status}</option>`;
        });
    }
}

// Load employees from Supabase
async function loadEmployees() {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('employees')
        .select(`
            *,
            department:departments(id, dept_name, dept_code),
            position:positions(id, position_name),
            shift:shifts(id, shift_name, start_time, end_time)
        `)
        .order('full_name');
    
    if (error) throw error;
    
    employees = data || [];
    filteredEmployees = [...employees];
    
    console.log(`✅ Loaded ${employees.length} employees`);
    
    // Render table & stats
    applyFilters();
    updateStats();
}

// Load user info for header
async function loadUserInfo() {
    const userInfo = await Auth.getUserInfo();
    if (userInfo) {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        
        if (userNameEl) userNameEl.textContent = userInfo.name;
        if (userRoleEl) userRoleEl.textContent = userInfo.role;
    }
}

// ============================================
// FILTERING & SORTING
// ============================================

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const deptFilter = document.getElementById('filterDepartment')?.value || '';
    
    filteredEmployees = employees.filter(emp => {
        // Search filter
        const matchesSearch = !searchTerm || 
            emp.full_name?.toLowerCase().includes(searchTerm) ||
            emp.employee_id?.toLowerCase().includes(searchTerm) ||
            emp.email?.toLowerCase().includes(searchTerm) ||
            emp.department?.dept_name?.toLowerCase().includes(searchTerm) ||
            emp.position?.position_name?.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = !statusFilter || emp.employment_status === statusFilter;
        
        // Department filter
        const matchesDept = !deptFilter || emp.department_id === deptFilter;
        
        return matchesSearch && matchesStatus && matchesDept;
    });
    
    // Apply sorting
    sortData();
    
    // Reset to first page
    currentPage = 1;
    
    // Render
    renderTable();
    updatePagination();
}

function sortData() {
    filteredEmployees.sort((a, b) => {
        let valA, valB;
        
        // Handle nested properties
        if (sortColumn === 'department') {
            valA = a.department?.dept_name || '';
            valB = b.department?.dept_name || '';
        } else if (sortColumn === 'position') {
            valA = a.position?.position_name || '';
            valB = b.position?.position_name || '';
        } else {
            valA = a[sortColumn] || '';
            valB = b[sortColumn] || '';
        }
        
        // String comparison
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    updateSortIcons();
    applyFilters();
}

function updateSortIcons() {
    // Reset all icons
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.className = 'sort-icon fas fa-sort text-gray-300';
    });
    
    // Update active column icon
    const activeIcon = document.querySelector(`[data-sort="${sortColumn}"] .sort-icon`);
    if (activeIcon) {
        activeIcon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-primary-600`;
    }
}

// ============================================
// TABLE RENDERING
// ============================================

function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredEmployees.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-users text-gray-300 text-5xl mb-4"></i>
                        <p class="text-gray-500 text-lg">Tidak ada data karyawan</p>
                        <p class="text-gray-400 text-sm">Coba ubah filter atau tambah karyawan baru</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageData.map(emp => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                         style="background-color: ${getAvatarColor(emp.full_name)}">
                        ${getInitials(emp.full_name)}
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${emp.full_name}</div>
                        <div class="text-sm text-gray-500">${emp.employee_id}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${emp.email || '-'}</div>
                <div class="text-sm text-gray-500">${emp.phone || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${emp.department?.dept_name || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${emp.position?.position_name || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDateShort(emp.join_date)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(emp.employment_status)}">
                    ${emp.employment_status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                    <button onclick="viewEmployee('${emp.id}')" 
                            class="text-blue-600 hover:text-blue-900 p-1" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editEmployee('${emp.id}')" 
                            class="text-yellow-600 hover:text-yellow-900 p-1" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="confirmDelete('${emp.id}')" 
                            class="text-red-600 hover:text-red-900 p-1" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================
// PAGINATION
// ============================================

function updatePagination() {
    const totalItems = filteredEmployees.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Update info text
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalItems} entries`;
    }
    
    // Update pagination buttons
    const paginationContainer = document.getElementById('paginationButtons');
    if (!paginationContainer) return;
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button onclick="goToPage(${currentPage - 1})" 
                class="px-3 py-1 rounded border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="goToPage(1)" class="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-50">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="px-2 text-gray-500">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="goToPage(${i})" 
                    class="px-3 py-1 rounded border ${i === currentPage ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="px-2 text-gray-500">...</span>`;
        }
        paginationHTML += `
            <button onclick="goToPage(${totalPages})" class="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-50">${totalPages}</button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button onclick="goToPage(${currentPage + 1})" 
                class="px-3 py-1 rounded border ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    updatePagination();
    
    // Scroll to top of table
    document.getElementById('employeeTableBody')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value) || 10;
    currentPage = 1;
    renderTable();
    updatePagination();
}

// ============================================
// STATISTICS
// ============================================

function updateStats() {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.employment_status === EMPLOYMENT_STATUS.ACTIVE).length;
    const onLeave = employees.filter(e => e.employment_status === EMPLOYMENT_STATUS.ON_LEAVE).length;
    
    // New hires this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newHires = employees.filter(e => {
        const joinDate = new Date(e.join_date);
        return joinDate >= firstDayOfMonth;
    }).length;
    
    // Update DOM
    const statTotal = document.getElementById('statTotalEmployees');
    const statActive = document.getElementById('statActiveEmployees');
    const statLeave = document.getElementById('statOnLeave');
    const statNew = document.getElementById('statNewHires');
    
    if (statTotal) statTotal.textContent = totalEmployees;
    if (statActive) statActive.textContent = activeEmployees;
    if (statLeave) statLeave.textContent = onLeave;
    if (statNew) statNew.textContent = newHires;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(mode = 'add') {
    const modal = document.getElementById('employeeModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('employeeForm');
    
    if (!modal) return;
    
    // Reset form
    if (form) form.reset();
    editingEmployeeId = null;
    
    // Set title
    if (modalTitle) {
        modalTitle.textContent = mode === 'add' ? 'Tambah Karyawan Baru' : 'Edit Karyawan';
    }
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Focus first input
    setTimeout(() => {
        document.getElementById('employeeFullName')?.focus();
    }, 100);
}

function closeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    editingEmployeeId = null;
}

function openViewModal() {
    const modal = document.getElementById('viewEmployeeModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeViewModal() {
    const modal = document.getElementById('viewEmployeeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function openDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    deleteEmployeeId = null;
}

// ============================================
// CRUD OPERATIONS
// ============================================

// VIEW EMPLOYEE
async function viewEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) {
        showToast('Data karyawan tidak ditemukan', 'error');
        return;
    }
    
    const content = document.getElementById('viewEmployeeContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="flex items-center space-x-4 mb-6 pb-6 border-b">
            <div class="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                 style="background-color: ${getAvatarColor(emp.full_name)}">
                ${getInitials(emp.full_name)}
            </div>
            <div>
                <h3 class="text-xl font-semibold text-gray-900">${emp.full_name}</h3>
                <p class="text-gray-500">${emp.position?.position_name || '-'}</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusClass(emp.employment_status)}">
                    ${emp.employment_status}
                </span>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">ID Karyawan</p>
                <p class="text-sm font-medium text-gray-900">${emp.employee_id}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Department</p>
                <p class="text-sm font-medium text-gray-900">${emp.department?.dept_name || '-'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <p class="text-sm font-medium text-gray-900">${emp.email || '-'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">No. Telepon</p>
                <p class="text-sm font-medium text-gray-900">${emp.phone || '-'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Tanggal Bergabung</p>
                <p class="text-sm font-medium text-gray-900">${formatDateLong(emp.join_date)}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Shift</p>
                <p class="text-sm font-medium text-gray-900">${emp.shift ? `${emp.shift.shift_name} (${formatTime(emp.shift.start_time)} - ${formatTime(emp.shift.end_time)})` : '-'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Jenis Kelamin</p>
                <p class="text-sm font-medium text-gray-900">${emp.gender || '-'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Status Pernikahan</p>
                <p class="text-sm font-medium text-gray-900">${emp.marital_status || '-'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Tanggal Lahir</p>
                <p class="text-sm font-medium text-gray-900">${formatDateLong(emp.birth_date)}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">NIK</p>
                <p class="text-sm font-medium text-gray-900">${emp.nik || '-'}</p>
            </div>
        </div>
        
        ${emp.address ? `
        <div class="mt-4 bg-gray-50 p-4 rounded-lg">
            <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Alamat</p>
            <p class="text-sm font-medium text-gray-900">${emp.address}</p>
        </div>
        ` : ''}
    `;
    
    openViewModal();
}

// EDIT EMPLOYEE - Populate form
async function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) {
        showToast('Data karyawan tidak ditemukan', 'error');
        return;
    }
    
    editingEmployeeId = id;
    
    // Populate form fields
    document.getElementById('employeeFullName').value = emp.full_name || '';
    document.getElementById('employeeEmail').value = emp.email || '';
    document.getElementById('employeePhone').value = emp.phone || '';
    document.getElementById('employeeNIK').value = emp.nik || '';
    document.getElementById('employeeBirthDate').value = emp.birth_date || '';
    document.getElementById('employeeGender').value = emp.gender || '';
    document.getElementById('employeeMaritalStatus').value = emp.marital_status || '';
    document.getElementById('employeeAddress').value = emp.address || '';
    document.getElementById('employeeDepartment').value = emp.department_id || '';
    document.getElementById('employeePosition').value = emp.position_id || '';
    document.getElementById('employeeShift').value = emp.shift_id || '';
document.getElementById('employeeJoinDate').value = emp.join_date || '';
    document.getElementById('employeeStatus').value = emp.employment_status || '';
    
    // Open modal with edit mode
    openModal('edit');
    document.getElementById('modalTitle').textContent = 'Edit Karyawan';
}

// SAVE EMPLOYEE - Create or Update
async function saveEmployee() {
    const form = document.getElementById('employeeForm');
    if (!form) return;
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Get form data
    const formData = {
        full_name: document.getElementById('employeeFullName').value.trim(),
        email: document.getElementById('employeeEmail').value.trim() || null,
        phone: document.getElementById('employeePhone').value.trim() || null,
        nik: document.getElementById('employeeNIK').value.trim() || null,
        birth_date: document.getElementById('employeeBirthDate').value || null,
        gender: document.getElementById('employeeGender').value || null,
        marital_status: document.getElementById('employeeMaritalStatus').value || null,
        address: document.getElementById('employeeAddress').value.trim() || null,
        department_id: document.getElementById('employeeDepartment').value || null,
        position_id: document.getElementById('employeePosition').value || null,
        shift_id: document.getElementById('employeeShift').value || null,
        join_date: document.getElementById('employeeJoinDate').value || null,
        employment_status: document.getElementById('employeeStatus').value || EMPLOYMENT_STATUS.ACTIVE
    };
    
    // Validation
    if (!formData.full_name) {
        showToast('Nama lengkap wajib diisi', 'error');
        return;
    }
    
    const supabase = getSupabase();
    
    try {
        showButtonLoading('btnSaveEmployee', true);
        
        if (editingEmployeeId) {
            // UPDATE existing employee
            const { data, error } = await supabase
                .from('employees')
                .update(formData)
                .eq('id', editingEmployeeId)
                .select(`
                    *,
                    department:departments(id, dept_name, dept_code),
                    position:positions(id, position_name),
                    shift:shifts(id, shift_name, start_time, end_time)
                `)
                .single();
            
            if (error) throw error;
            
            // Update local array
            const index = employees.findIndex(e => e.id === editingEmployeeId);
            if (index !== -1) {
                employees[index] = data;
            }
            
            showToast('Data karyawan berhasil diperbarui', 'success');
            
        } else {
            // CREATE new employee
            // Generate employee_id automatically
            const { data: lastEmp } = await supabase
                .from('employees')
                .select('employee_id')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            // Generate new ID (e.g., EMP001, EMP002, ...)
            let newEmpId = 'EMP001';
            if (lastEmp && lastEmp.employee_id) {
                const lastNum = parseInt(lastEmp.employee_id.replace('EMP', '')) || 0;
                newEmpId = `EMP${String(lastNum + 1).padStart(3, '0')}`;
            }
            
            formData.employee_id = newEmpId;
            
            const { data, error } = await supabase
                .from('employees')
                .insert(formData)
                .select(`
                    *,
                    department:departments(id, dept_name, dept_code),
                    position:positions(id, position_name),
                    shift:shifts(id, shift_name, start_time, end_time)
                `)
                .single();
            
            if (error) throw error;
            
            // Add to local array
            employees.unshift(data);
            
            showToast(`Karyawan berhasil ditambahkan dengan ID: ${newEmpId}`, 'success');
        }
        
        // Close modal & refresh
        closeModal();
        applyFilters();
        updateStats();
        
    } catch (error) {
        console.error('Save employee error:', error);
        showToast(error.message || 'Gagal menyimpan data karyawan', 'error');
    } finally {
        showButtonLoading('btnSaveEmployee', false);
    }
}

// CONFIRM DELETE
function confirmDelete(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) {
        showToast('Data karyawan tidak ditemukan', 'error');
        return;
    }
    
    deleteEmployeeId = id;
    
    const deleteInfo = document.getElementById('deleteEmployeeInfo');
    if (deleteInfo) {
        deleteInfo.innerHTML = `
            <p class="text-gray-600">Apakah Anda yakin ingin menghapus karyawan:</p>
            <p class="font-semibold text-gray-900 mt-2">${emp.full_name}</p>
            <p class="text-sm text-gray-500">${emp.employee_id} - ${emp.position?.position_name || 'No Position'}</p>
            <p class="text-red-600 text-sm mt-4">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                Tindakan ini tidak dapat dibatalkan!
            </p>
        `;
    }
    
    openDeleteModal();
}

// DELETE EMPLOYEE
async function deleteEmployee() {
    if (!deleteEmployeeId) return;
    
    const supabase = getSupabase();
    
    try {
        showButtonLoading('btnConfirmDelete', true);
        
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', deleteEmployeeId);
        
        if (error) throw error;
        
        // Remove from local array
        employees = employees.filter(e => e.id !== deleteEmployeeId);
        
        showToast('Karyawan berhasil dihapus', 'success');
        
        // Close modal & refresh
        closeDeleteModal();
        applyFilters();
        updateStats();
        
    } catch (error) {
        console.error('Delete employee error:', error);
        showToast(error.message || 'Gagal menghapus karyawan', 'error');
    } finally {
        showButtonLoading('btnConfirmDelete', false);
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportEmployees() {
    if (filteredEmployees.length === 0) {
        showToast('Tidak ada data untuk di-export', 'warning');
        return;
    }
    
    // Prepare CSV data
    const headers = [
        'Employee ID',
        'Full Name',
        'Email',
        'Phone',
        'NIK',
        'Gender',
        'Birth Date',
        'Department',
        'Position',
        'Shift',
        'Join Date',
        'Status'
    ];
    
    const rows = filteredEmployees.map(emp => [
        emp.employee_id || '',
        emp.full_name || '',
        emp.email || '',
        emp.phone || '',
        emp.nik || '',
        emp.gender || '',
        emp.birth_date || '',
        emp.department?.dept_name || '',
        emp.position?.position_name || '',
        emp.shift?.shift_name || '',
        emp.join_date || '',
        emp.employment_status || ''
    ]);
    
    // Build CSV string
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `employees_${formatDateForFile(new Date())}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    
    showToast(`Exported ${filteredEmployees.length} karyawan ke ${fileName}`, 'success');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyFilters();
        }, 300));
    }
    
    // Filter dropdowns
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', applyFilters);
    }
    
    const filterDepartment = document.getElementById('filterDepartment');
    if (filterDepartment) {
        filterDepartment.addEventListener('change', applyFilters);
    }
    
    // Items per page
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            changeItemsPerPage(e.target.value);
        });
    }
    
    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal();
                closeViewModal();
                closeDeleteModal();
            }
        });
    });
    
    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeViewModal();
            closeDeleteModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + K = Focus search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
        
        // Ctrl + N = New employee (Admin only)
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            openModal('add');
        }
        
        // Ctrl + E = Export
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            exportEmployees();
        }
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function getAvatarColor(name) {
    if (!name) return '#6B7280';
    const colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function getStatusClass(status) {
    const statusClasses = {
        [EMPLOYMENT_STATUS.ACTIVE]: 'bg-green-100 text-green-800',
        [EMPLOYMENT_STATUS.INACTIVE]: 'bg-gray-100 text-gray-800',
        [EMPLOYMENT_STATUS.ON_LEAVE]: 'bg-yellow-100 text-yellow-800',
        [EMPLOYMENT_STATUS.PROBATION]: 'bg-blue-100 text-blue-800',
        [EMPLOYMENT_STATUS.TERMINATED]: 'bg-red-100 text-red-800',
        [EMPLOYMENT_STATUS.RESIGNED]: 'bg-orange-100 text-orange-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateLong(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatDateForFile(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function formatTime(timeStr) {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5); // "08:00:00" -> "08:00"
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
                        <p class="text-gray-500">Memuat data...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                        <p class="text-red-600">${message}</p>
                        <button onclick="init()" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            <i class="fas fa-redo mr-2"></i>Coba Lagi
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function showButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Menyimpan...
        `;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// ============================================
// LOGOUT FUNCTION
// ============================================

async function logout() {
    const confirmed = confirm('Apakah Anda yakin ingin keluar?');
    if (confirmed) {
        await Auth.logout();
    }
}

// ============================================
// GLOBAL FUNCTIONS (dipanggil dari HTML onclick)
// ============================================

// Make functions available globally
window.openModal = openModal;
window.closeModal = closeModal;
window.closeViewModal = closeViewModal;
window.closeDeleteModal = closeDeleteModal;
window.viewEmployee = viewEmployee;
window.editEmployee = editEmployee;
window.saveEmployee = saveEmployee;
window.confirmDelete = confirmDelete;
window.deleteEmployee = deleteEmployee;
window.exportEmployees = exportEmployees;
window.sortTable = sortTable;
window.goToPage = goToPage;
window.changeItemsPerPage = changeItemsPerPage;
window.logout = logout;