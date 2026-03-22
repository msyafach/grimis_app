// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showToast } from '@/utils/toast';
import { canAccessMenu, getFeatureName } from '@/utils/permissionMenuFilter';

const ProtectedRoute = ({ children, requiredRole, requiredRoles, menuPath }) => {
    const { user, permissions, loading } = useAuth();
    const location = useLocation();

    // Menggabungkan requiredRole dan requiredRoles (untuk backward compatibility)
    const roles = requiredRoles || (requiredRole ? requiredRole : null);

    // Jika data pengguna belum siap (loading), jangan render apapun dulu
    if (loading) {
        return <div>Loading...</div>;
    }

    // Jika pengguna belum login, arahkan ke halaman login
    if (!user) {
        return <Navigate to="/authentication/login" />;
    }

    // Root users always have access
    if (user.is_root) {
        return children;
    }

    // Determine menu path from location if not provided
    const currentPath = menuPath || location.pathname.slice(1).split('/')[0];
    const featureName = getFeatureName(currentPath);

    // Check permission-based access first (if user has groups with permissions)
    const safePermissions = Array.isArray(permissions) ? permissions : [];

    // If user has permissions from groups, use permission-based check
    if (safePermissions.length > 0) {
        const hasPermission = canAccessMenu(currentPath, safePermissions, user.role, user.is_root);

        if (!hasPermission) {
            // Tampilkan pesan error dengan nama fitur
            setTimeout(() => {
                showToast("error", `Anda tidak memiliki akses ke fitur ${featureName}`);
            }, 100);
            return <Navigate to="/" />;
        }

        return children;
    }

    // Fallback to role-based checking (backwards compatibility)
    if (roles && !roles.includes(user.role)) {
        console.log(`Access denied for ${user.role}. Required roles:`, roles);
        setTimeout(() => {
            showToast("error", `Anda tidak memiliki akses ke fitur ${featureName}`);
        }, 100);
        return <Navigate to="/" />;
    }

    // Jika sesuai, tampilkan konten yang diminta
    return children;
};

export default ProtectedRoute;
