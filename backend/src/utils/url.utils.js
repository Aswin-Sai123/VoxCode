/**
 * URL normalization and resolution utilities for VoxCode.
 * Prevents ERR_INVALID_REDIRECT issues caused by missing protocols,
 * trailing slashes, or missing environment variables on platforms like Render.
 */

export const normalizeUrl = (url, fallback = '') => {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return fallback.replace(/\/+$/, '');
    }

    let clean = url.trim();

    // If schema is missing, add proper protocol
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        if (clean.includes('localhost') || clean.includes('127.0.0.1')) {
            clean = `http://${clean}`;
        } else {
            clean = `https://${clean}`;
        }
    }

    // Strip trailing slashes
    return clean.replace(/\/+$/, '');
};

/**
 * Returns the sanitized frontend base URL (guaranteed valid http/https without trailing slash).
 */
export const getFrontendUrl = () => {
    return normalizeUrl(process.env.FRONTEND_URL, 'http://localhost:5173');
};

/**
 * Returns the sanitized backend base URL.
 * Automatically checks RENDER_EXTERNAL_URL if running on Render.
 */
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

/**
 * Returns the exact Google OAuth callback URL.
 */
export const getGoogleCallbackUrl = () => {
    if (process.env.GOOGLE_CALLBACK_URL && process.env.GOOGLE_CALLBACK_URL.trim()) {
        return normalizeUrl(process.env.GOOGLE_CALLBACK_URL);
    }
    return `${getBackendUrl()}/api/auth/google/callback`;
};
