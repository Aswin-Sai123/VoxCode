import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle token refresh (basic version)
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        
        // If 401 Unauthorized and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');
                
                const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { token: refreshToken });
                localStorage.setItem('accessToken', res.data.data.accessToken);
                
                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, log out
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
