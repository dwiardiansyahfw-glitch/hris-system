// ============================================
// supabase-client.js - Supabase Client Setup
// ============================================

let _supabase = null;

// Initialize Supabase Client
function initSupabase() {
    if (_supabase) return _supabase;
    
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase library not loaded!');
        return null;
    }
    
    _supabase = supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );
    
    console.log('✅ Supabase client initialized');
    return _supabase;
}

// Get Supabase Client Instance
function getSupabase() {
    if (!_supabase) {
        return initSupabase();
    }
    return _supabase;
}

// ============================================
// Session & User Helper Functions
// ============================================

// Get current session
async function getCurrentSession() {
    try {
        const { data: { session }, error } = await getSupabase().auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        return session;
    } catch (err) {
        console.error('Session error:', err);
        return null;
    }
}

// Get current user
async function getCurrentUser() {
    const session = await getCurrentSession();
    return session?.user || null;
}

// Get user data from public.users table
async function getCurrentUserData() {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const { data, error } = await getSupabase()
        .from('users')
        .select(`
            id,
            email,
            is_active,
            role_id,
            roles (
                id,
                role_name
            )
        `)
        .eq('id', user.id)
        .single();
    
    if (error) {
        console.error('Error getting user data:', error);
        return null;
    }
    
    return data;
}

// Get user role from database
async function getCurrentUserRole() {
    const userData = await getCurrentUserData();
    return userData?.roles?.role_name || null;
}

// Check if user is admin (super_admin or hr_admin)
async function isAdmin() {
    const role = await getCurrentUserRole();
    return role === ROLES.SUPER_ADMIN || role === ROLES.HR_ADMIN;
}

// Check if user is super admin
async function isSuperAdmin() {
    const role = await getCurrentUserRole();
    return role === ROLES.SUPER_ADMIN;
}

// Get employee data for current user
async function getCurrentEmployee() {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const { data, error } = await getSupabase()
        .from('employees')
        .select(`
            *,
            department:departments(id, dept_name, dept_code),
            position:positions(id, position_name),
            shift:shifts(id, shift_name)
        `)
        .eq('user_id', user.id)
        .single();
    
    if (error) {
        console.error('Error getting employee data:', error);
        return null;
    }
    
    return data;
}

// ============================================
// Auth State Listener
// ============================================

function onAuthStateChange(callback) {
    return getSupabase().auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        callback(event, session);
    });
}

// ============================================
// Utility Functions
// ============================================

// Format date to Indonesian format
function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Format date to short format (DD/MM/YYYY)
function formatDateShort(dateString) {
    if (!dateString) return '-';
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Format time (HH:MM)
function formatTime(timeString) {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
}

// Format currency to IDR
function formatCurrency(amount) {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Show loading spinner
function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = `
            <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span class="ml-2 text-gray-600">Loading...</span>
            </div>
        `;
    }
}

// Show error message
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }
}

// Show success toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                    type === 'error' ? 'bg-red-500' : 
                    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    
    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

console.log('✅ Supabase client module loaded');