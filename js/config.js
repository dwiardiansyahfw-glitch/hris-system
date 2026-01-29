// ============================================
// config.js - Supabase Configuration
// ============================================

const SUPABASE_CONFIG = {
    // ⚠️ GANTI dengan URL project Supabase kamu
    // Contoh: 'https://abcdefghijk.supabase.co'
    url: 'https://cqheisrbylhkpfxjiaiu.supabase.co',
    
    // ⚠️ GANTI dengan anon key dari Supabase Dashboard
    // Settings → API → Project API keys → anon public
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxaGVpc3JieWxoa3BmeGppYWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NjI2NTksImV4cCI6MjA4NTEzODY1OX0.7Jj7VnRwckhgc8aIjvUCPuEDiRwK1l4VEMWIgwdptXw'
};

// App Configuration
const APP_CONFIG = {
    appName: 'HRIS System',
    companyName: 'Your Company Name',  // ⚠️ Ganti nama perusahaan
    version: '1.0.0',
    defaultPageSize: 10,
    dateFormat: 'id-ID',
    currency: 'IDR'
};

// Role Constants
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    HR_ADMIN: 'hr_admin',
    MANAGER: 'manager'
};

// Leave Type Constants
const LEAVE_TYPES = {
    ANNUAL: 'ANNUAL',
    MARRY: 'MARRY', 
    BIRTH: 'BIRTH',
    PATERNITY: 'PATERNITY',
    MOURN: 'MOURN'
};

// Employment Status
const EMPLOYMENT_STATUS = {
    KONTRAK: 'Kontrak',
    TETAP: 'Tetap',
    PROBATION: 'Probation',
    RESIGNED: 'Resigned'
};

// Gender Options
const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'];

// Marital Status Options  
const MARITAL_STATUS_OPTIONS = ['Belum Menikah', 'Menikah', 'Cerai Hidup', 'Cerai Mati'];

// PTKP Status Options
const PTKP_OPTIONS = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3', 'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3'];

// Attendance Status
const ATTENDANCE_STATUS = {
    PRESENT: 'Present',
    LATE: 'Late',
    ABSENT: 'Absent',
    LEAVE: 'Leave',
    HOLIDAY: 'Holiday'
};

// Leave Request Status
const LEAVE_REQUEST_STATUS = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled'
};

console.log('✅ Config loaded');