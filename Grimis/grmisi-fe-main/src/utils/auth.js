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
    window.location.href = '/authentication/login'; // Redirect ke halaman login
};
