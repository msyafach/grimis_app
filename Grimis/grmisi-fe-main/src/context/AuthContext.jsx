// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../config/apiConfig'; // Mengimpor API config yang berisi endpoint

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Menyimpan data pengguna
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
            setLoading(false); // Status loading selesai
        } catch (error) {
            console.error('Error fetching user data:', error);
            setLoading(false); // Menghentikan status loading jika gagal
        }
    };

    const login = (userData) => {
        setUser(userData); // Menyimpan data pengguna di state setelah login
        setLoading(false); // Status loading selesai
    };

    const logout = () => {
        localStorage.removeItem('access_token'); // Menghapus token dari localStorage
        setUser(null); // Menghapus data pengguna dari state
        setLoading(false); // Menghentikan status loading
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children} {/* Menyediakan konteks untuk komponen lain */}
        </AuthContext.Provider>
    );
};

export const useAuth = () => React.useContext(AuthContext); // Hook untuk mengakses konteks
