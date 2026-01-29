// ============================================
// auth.js - Authentication Module
// ============================================

const Auth = {
    // Login with email and password
    async login(email, password) {
        try {
            const { data, error } = await getSupabase().auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Check if user exists in public.users table
            const userRole = await getCurrentUserRole();
            if (!userRole) {
                await this.logout();
                throw new Error('User tidak terdaftar dalam sistem. Hubungi administrator.');
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    async logout() {
        try {
            const { error } = await getSupabase().auth.signOut();
            if (error) throw error;
            
            // Redirect to login page
            window.location.href = '/index.html';
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Check if user is authenticated
    async isAuthenticated() {
        const session = await getCurrentSession();
        return session !== null;
    },
    
    // Protect page - redirect if not authenticated
    async protectPage() {
        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
            window.location.href = '/index.html';
            return false;
        }
        return true;
    },
    
    // Protect admin page - redirect if not admin
    async protectAdminPage() {
        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
            window.location.href = '/index.html';
            return false;
        }
        
        const admin = await isAdmin();
        if (!admin) {
            alert('Anda tidak memiliki akses ke halaman ini.');
            window.location.href = '/pages/dashboard.html';
            return false;
        }
        return true;
    },
    
    // Get user info for display
    async getUserInfo() {
        const user = await getCurrentUser();
        if (!user) return null;
        
        const { data, error } = await getSupabase()
            .from('users')
            .select(`
                email,
                roles(role_name),
                employees(full_name, employee_id, department:departments(dept_name))
            `)
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error('Error getting user info:', error);
            return null;
        }
        
        return {
            email: data.email,
            role: data.roles?.role_name,
            name: data.employees?.full_name || data.email,
            employeeId: data.employees?.employee_id,
            department: data.employees?.department?.dept_name
        };
    }
};