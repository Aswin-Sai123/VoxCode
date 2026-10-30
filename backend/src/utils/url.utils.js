export const normalizeUrl = (url, fallback = '') => {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return fallback.replace(/\/+$/, '');
    }

    let clean = url.trim();

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        if (clean.includes('localhost') || clean.includes('127.0.0.1')) {
            clean = `http://${clean}`;
        } else {
            clean = `https://${clean}`;
        }
    }

    return clean.replace(/\/+$/, '');
};

export const getFrontendUrl = () => {
    return normalizeUrl(process.env.FRONTEND_URL, 'http://localhost:5173');
};

export const getBackendUrl = () => {
    if (process.env.BACKEND_URL) {
        return normalizeUrl(process.env.BACKEND_URL);
    }
    if (process.env.RENDER_EXTERNAL_URL) {
        return normalizeUrl(process.env.RENDER_EXTERNAL_URL);
    }
    if (process.env.NODE_ENV === 'production') {
        return 'https://voxcode-backend.onrender.com';
    }
    return 'http://localhost:5000';
};

export const getGoogleCallbackUrl = () => {
    if (process.env.GOOGLE_CALLBACK_URL && process.env.GOOGLE_CALLBACK_URL.trim()) {
        return normalizeUrl(process.env.GOOGLE_CALLBACK_URL);
    }
    return `${getBackendUrl()}/api/auth/google/callback`;
};