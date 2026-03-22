/**
 * Permission-based menu filtering utility
 *
 * This file provides utilities for filtering menu items based on user permissions.
 * It maintains backwards compatibility with role-based filtering.
 */

// Map menu paths to required permissions
const MENU_PERMISSION_MAP = {
    // Organisasi menu
    'organisasi': ['view:organization'],
    'organisasi/instansi': ['manage:organization'],
    'organisasi/induk-unit-kerja': ['manage:organization'],
    'pengaturan/kop-surat': ['manage:settings'],

    // Parameters menu
    'parameters': ['view:parameters'],
    'parameters/struktur-organisasi': ['view:organization'],
    'parameters/kategori-risiko': ['view:parameters'],
    'parameters/jenis-penyebab': ['view:parameters'],
    'parameters/konteks-sasaran': ['view:parameters'],
    'parameters/konteks-probis': ['view:parameters'],
    'parameters/kamus-risiko': ['view:risk'],
    'parameters/bagan-risiko': ['view:risk_map'],

    // Kriteria Risiko menu
    'kriteria-risiko': ['manage:parameters'],
    'kriteria-risiko/kemungkinan': ['manage:parameters'],
    'kriteria-risiko/dampak': ['manage:parameters'],

    // Pengelolaan Risiko menu
    'pengelolaan-risiko': ['view:risk'],
    'pengelolaan-risiko/identifikasi-risiko': ['view:identification'],
    'pengelolaan-risiko/monitoring-risiko': ['view:monitoring'],
    'pengelolaan-risiko/pelaporan-risiko': ['view:reporting'],
    'pengelolaan-risiko/proses-akhir-tahun': ['manage:analysis'],

    // Settings Unit Kerja menu
    'settings-unit-kerja': ['view:users'],
    'settings-unit-kerja/manajemen-pengguna': ['manage:users'],
    'settings-unit-kerja/manajemen-group': ['manage:groups'],

    // Approval menu
    'approval': ['view:approvals'],
    'approval/laporan-kejadian': ['approve:proposals'],
    'approval/kamus-risiko': ['approve:risk'],

    // Dashboard
    'dashboards': ['view:dashboard'],
    '/': ['view:dashboard'],
};

// Role-based fallback for backwards compatibility
const ROLE_BASED_MENUS = {
    'SUPER_ADMIN': true, // Has access to everything
    'ADMIN_KLP': {
        allowed: ['organisasi', 'settings-unit-kerja', 'parameters', 'approval'],
        denied: ['pengelolaan-risiko']
    },
    'PEMILIK_RISIKO': {
        allowed: ['dashboards', 'pengelolaan-risiko', 'parameters'],
        denied: []
    },
    'PENGELOLA_RISIKO': {
        allowed: ['dashboards', 'pengelolaan-risiko', 'parameters'],
        denied: []
    },
    'PENGAWAS_INTERN': {
        allowed: ['dashboards', 'pengelolaan-risiko'],
        denied: ['approval', 'settings-unit-kerja', 'organisasi']
    },
    'PEGAWAI': {
        allowed: ['dashboards', 'pengelolaan-risiko'],
        denied: ['approval', 'settings-unit-kerja', 'organisasi']
    },
    'UNIT_MANAJEMEN_RISIKO': {
        allowed: ['dashboards', 'pengelolaan-risiko', 'parameters'],
        denied: []
    }
};

/**
 * Check if user has permission to access a menu
 * @param {string} menuPath - The menu path (e.g., 'parameters/kamus-risiko')
 * @param {Array} userPermissions - Array of user permission strings
 * @param {string} userRole - User's role (for backwards compatibility)
 * @returns {boolean} - True if user can access the menu
 */
export const canAccessMenu = (menuPath, userPermissions, userRole) => {
    // Ensure userPermissions is an array
    const safePermissions = Array.isArray(userPermissions) ? userPermissions : [];

    // If SUPER_ADMIN has permissions (groups assigned), use permission-based check
    // If SUPER_ADMIN has no permissions (no groups), allow everything (fallback)
    if (userRole === 'SUPER_ADMIN' && safePermissions.length > 0) {
        const requiredPermissions = MENU_PERMISSION_MAP[menuPath];

        // If no specific permission required, allow access
        if (!requiredPermissions || !Array.isArray(requiredPermissions)) {
            return true;
        }

        // Check if user has any of the required permissions
        return requiredPermissions.some(perm => safePermissions.includes(perm));
    }

    // SUPER_ADMIN without groups has access to everything
    if (userRole === 'SUPER_ADMIN') {
        return true;
    }

    // If we have permissions (group-based), use them
    if (safePermissions && safePermissions.length > 0) {
        const requiredPermissions = MENU_PERMISSION_MAP[menuPath];

        // If no specific permission required, allow access
        if (!requiredPermissions || !Array.isArray(requiredPermissions)) {
            return true;
        }

        // Check if user has any of the required permissions
        return requiredPermissions.some(perm => safePermissions.includes(perm));
    }

    // Fallback to role-based checking
    const roleConfig = ROLE_BASED_MENUS[userRole];
    if (!roleConfig) {
        return false;
    }

    if (roleConfig === true) {
        return true;
    }

    // Ensure denied and allowed are arrays
    const deniedList = Array.isArray(roleConfig.denied) ? roleConfig.denied : [];
    const allowedList = Array.isArray(roleConfig.allowed) ? roleConfig.allowed : [];

    // Check if menu is in denied list
    if (deniedList.some(denied => menuPath.startsWith(denied))) {
        return false;
    }

    // Check if menu is in allowed list
    return allowedList.some(allowed => menuPath.startsWith(allowed) || menuPath === allowed);
};

/**
 * Filter menu list based on user permissions
 * @param {Array} menuList - The original menu list
 * @param {Array} userPermissions - Array of user permission strings
 * @param {string} userRole - User's role
 * @returns {Array} - Filtered menu list
 */
export const filterMenuByPermissions = (menuList, userPermissions, userRole) => {
    // Ensure userPermissions is an array
    const safePermissions = Array.isArray(userPermissions) ? userPermissions : [];

    return menuList.map(menu => {
        // Check main menu access
        const hasAccess = canAccessMenu(menu.name, safePermissions, userRole);

        if (!hasAccess) {
            return null; // Will be filtered out
        }

        // Create a copy to avoid modifying original
        const newMenu = { ...menu };

        // Filter submenu items
        if (menu.dropdownMenu && Array.isArray(menu.dropdownMenu)) {
            newMenu.dropdownMenu = menu.dropdownMenu.filter(subMenu => {
                const subMenuPath = `${menu.name}/${subMenu.path.split('/').pop()}`.toLowerCase();
                return canAccessMenu(subMenuPath, safePermissions, userRole);
            });
        }

        return newMenu;
    }).filter(menu => menu !== null); // Remove null entries
};
