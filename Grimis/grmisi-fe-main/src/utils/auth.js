// Fungsi untuk memeriksa apakah pengguna sudah login
export const isLoggedIn = () => {
    const token = localStorage.getItem('access_token');
    return token !== null;
};

// Fungsi untuk mendapatkan role pengguna dari token (bisa disesuaikan dengan data JWT)
export const getUserRole = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decode token
    return decodedToken?.role; // Sesuaikan dengan cara role disimpan dalam token
};

// Fungsi untuk memverifikasi apakah pengguna memiliki peran yang sesuai
export const hasRole = (role) => {
    const userRole = getUserRole();
    return userRole === role;
};

// Fungsi untuk logout pengguna
export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('last_activity');
    window.location.href = '/authentication/login'; // Redirect ke halaman login
};

// Session timeout helper functions

// Initialize session activity timestamp (call this on login)
export const initSessionActivity = () => {
    localStorage.setItem('last_activity', Date.now().toString());
};

// Update last activity timestamp (call this on user activity)
export const updateSessionActivity = () => {
    if (localStorage.getItem('access_token')) {
        localStorage.setItem('last_activity', Date.now().toString());
    }
};

// Get last activity timestamp
export const getLastActivity = () => {
    const lastActivity = localStorage.getItem('last_activity');
    return lastActivity ? parseInt(lastActivity, 10) : null;
};

// Check if session has expired (timeout: 5 minutes = 300000ms)
export const isSessionExpired = (timeoutMs = 300000) => {
    const lastActivity = getLastActivity();
    if (!lastActivity) return false;
    return Date.now() - lastActivity >= timeoutMs;
};

// Check and clear session expired flag (used to show message on login page)
export const checkSessionExpired = () => {
    const expired = localStorage.getItem('session_expired');
    if (expired) {
        localStorage.removeItem('session_expired');
        return true;
    }
    return false;
};
