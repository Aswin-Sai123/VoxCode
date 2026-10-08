import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                const res = await api.get('/auth/me');
                setUser({ ...res.data, role: jwtDecode(token).role });
            } catch (error) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setUser(null);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (role, email, password) => {
        const endpoint = role === 'COMPANY' ? '/auth/company/login' : '/auth/candidate/login';
        const res = await api.post(endpoint, { email, password });
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        await checkAuth();
    };

    const register = async (role, name, email, password) => {
        const endpoint = role === 'COMPANY' ? '/auth/company/register' : '/auth/candidate/register';
        await api.post(endpoint, { name, email, password });
    };

    const logout = async () => {
        const token = localStorage.getItem('refreshToken');
        if (token) {
            try {
                await api.post('/auth/logout', { token });
            } catch (error) {
                console.error('Logout error', error);
            }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
