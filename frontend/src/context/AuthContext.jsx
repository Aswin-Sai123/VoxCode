import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                const res = await api.get('/auth/me');
                if (res.data.success) {
                    setUser(res.data.data);
                }
            } catch (error) {
                console.error("Auth check failed", error);
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
        
        if (res.data.success) {
            localStorage.setItem('accessToken', res.data.data.accessToken);
            localStorage.setItem('refreshToken', res.data.data.refreshToken);
            await checkAuth();
            return true;
        }
        return false;
    };

    const register = async (role, name, email, password) => {
        const endpoint = role === 'COMPANY' ? '/auth/company/register' : '/auth/candidate/register';
        const res = await api.post(endpoint, { name, email, password });
        return res.data.success;
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
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
