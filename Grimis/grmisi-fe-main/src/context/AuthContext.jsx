// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../config/apiConfig'; // Mengimpor API config yang berisi endpoint

const API_BASE_URL = "http://localhost:8000";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Menyimpan data pengguna
    const [permissions, setPermissions] = useState([]); // Menyimpan permissions user
    const [loading, setLoading] = useState(true); // Status loading untuk menunggu pengambilan data

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchUserData(token); // Mengambil data pengguna jika token ada
        } else {
            setLoading(false); // Jika tidak ada token, data tidak akan diambil
        }
    }, []);

    // Mengambil data pengguna setelah login
    const fetchUserData = async (token) => {
        try {
            const response = await axios.get(API_ENDPOINTS.getCurrentUser, {
                headers: {
                    Authorization: `Bearer ${token}`, // Menyertakan token di header
                },
            });
            const data = response.data;
            setUser(data); // Menyimpan data pengguna di state

            // Fetch user permissions
            if (data?.id) {
                await fetchUserPermissions(token, data.id);
            }

            setLoading(false); // Status loading selesai
        } catch (error) {
            console.error('Error fetching user data:', error);
            setLoading(false); // Menghentikan status loading jika gagal
        }
    };

    // Fetch user permissions from backend
    const fetchUserPermissions = async (token, userId) => {
        try {
            const response = await axios.get(API_ENDPOINTS.getUserPermissions(userId), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setPermissions(response.data || []);
        } catch (error) {
            console.error('Error fetching user permissions:', error);
            // Fallback: derive permissions from role (backwards compatibility)
            setPermissions(derivePermissionsFromRole(data?.role));
        }
    };

    // Derive permissions from role for backwards compatibility
    const derivePermissionsFromRole = (role) => {
        const rolePermissions = {
            'SUPER_ADMIN': ['all'],
            'ADMIN_KLP': ['view:dashboard', 'view:risk_map', 'view:organization', 'manage:users', 'view:users', 'create:users', 'edit:users', 'view:parameters', 'manage:parameters', 'view:risk', 'manage:risk', 'approve:risk', 'approve:proposals', 'view:approvals', 'view:identification', 'manage:identification', 'view:analysis', 'manage:analysis', 'view:evaluation', 'manage:evaluation', 'verify:evaluation', 'view:monitoring', 'view:reporting', 'view:groups', 'manage:groups'],
            'UNIT_MANAJEMEN_RISIKO': ['view:dashboard', 'view:risk_map', 'view:organization', 'view:parameters', 'view:risk', 'manage:risk', 'view:identification', 'manage:identification', 'create:identification', 'edit:identification', 'view:analysis', 'manage:analysis', 'create:analysis', 'edit:analysis', 'view:evaluation', 'manage:evaluation', 'create:evaluation', 'edit:evaluation', 'view:monitoring', 'manage:monitoring', 'view:reporting', 'manage:reporting'],
            'PEMILIK_RISIKO': ['view:dashboard', 'view:risk_map', 'view:parameters', 'propose:parameters', 'view:risk', 'propose:risk', 'view:identification', 'create:identification', 'edit:identification', 'view:analysis', 'view:evaluation', 'create:evaluation', 'edit:evaluation', 'view:monitoring', 'create:monitoring', 'view:approvals'],
            'PENGELOLA_RISIKO': ['view:dashboard', 'view:risk_map', 'view:parameters', 'propose:parameters', 'view:risk', 'propose:risk', 'view:identification', 'create:identification', 'edit:identification', 'view:analysis', 'view:evaluation', 'create:evaluation', 'edit:evaluation', 'view:monitoring', 'create:monitoring', 'view:approvals'],
            'PENGAWAS_INTERN': ['view:dashboard', 'view:risk_map', 'view:identification', 'view:analysis', 'view:evaluation', 'view:monitoring'],
            'PEGAWAI': ['view:dashboard', 'view:risk_map', 'view:identification', 'view:analysis', 'view:evaluation', 'view:monitoring'],
        };
        return rolePermissions[role] || [];
    };

    const login = (userData) => {
        setUser(userData); // Menyimpan data pengguna di state setelah login
        setLoading(false); // Status loading selesai
    };

    const logout = () => {
        localStorage.removeItem('access_token'); // Menghapus token dari localStorage
        setUser(null); // Menghapus data pengguna dari state
        setPermissions([]); // Reset permissions
        setLoading(false); // Menghentikan status loading
    };

    return (
        <AuthContext.Provider value={{ user, permissions, loading, login, logout }}>
            {children} {/* Menyediakan konteks untuk komponen lain */}
        </AuthContext.Provider>
    );
};

export const useAuth = () => React.useContext(AuthContext); // Hook untuk mengakses konteks
