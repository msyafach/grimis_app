// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom'; // Menggunakan Navigate untuk pengalihan
import { useAuth } from '../context/AuthContext';
import { showToast } from '@/utils/toast';

const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
    const { user, loading } = useAuth(); // Mengambil user dan loading dari context
    
    // Menggabungkan requiredRole dan requiredRoles (untuk backward compatibility)
    const roles = requiredRoles || (requiredRole ? requiredRole : null);

    // Jika data pengguna belum siap (loading), jangan render apapun dulu
    if (loading) {
        return <div>Loading...</div>; // Bisa diganti dengan spinner atau loading indicator
    }

    // Jika pengguna belum login, arahkan ke halaman login
    if (!user) {
        return <Navigate to="/authentication/login" />;
    }

    // Jika role tidak sesuai dengan yang dibutuhkan, arahkan ke halaman utama dengan pesan toast
    if (roles && !roles.includes(user.role)) {
        console.log(`Access denied for ${user.role}. Required roles:`, roles);
        // Tampilkan toast notification dan redirect ke halaman utama
        setTimeout(() => {
            showToast("error", "Anda tidak memiliki akses ke halaman ini");
        }, 100);
        return <Navigate to="/" />;
    }

    // Jika role sesuai, tampilkan konten yang diminta
    return children;
};

export default ProtectedRoute;
