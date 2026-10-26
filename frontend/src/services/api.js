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

// Response interceptor to handle token refresh
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        
        // Do not attempt token refresh for login, register, oauth exchange, or refresh itself
        const isAuthRequest = originalRequest?.url?.includes('/auth/login') ||
            originalRequest?.url?.includes('/auth/register') ||
            originalRequest?.url?.includes('/auth/refresh') ||
            originalRequest?.url?.includes('/auth/oauth/exchange');

        // If 401 Unauthorized and not an auth request and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');
                
                const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { token: refreshToken });
                const newAccess = res.data?.data?.accessToken;
                const newRefresh = res.data?.data?.refreshToken;
                
                if (newAccess) {
                    localStorage.setItem('accessToken', newAccess);
                    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                }
                if (newRefresh) {
                    localStorage.setItem('refreshToken', newRefresh);
                }
                
                // Retry original request with new token
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, clear tokens and redirect to login if not already on auth page
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
