/**
 * Authentication utilities
 */

import api from './api';

export const AUTH_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
};

/**
 * Login admin user
 */
export async function login(email, password) {
    const response = await api.post('/auth/admin/login', { email, password });

    if (response.success && response.data) {
        const { user, tokens } = response.data;

        // Store tokens and user data
        localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, tokens.accessToken);
        localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user));

        return { user, tokens };
    }

    throw new Error(response.message || 'Login failed');
}

/**
 * Logout user
 */
export async function logout() {
    try {
        await api.post('/auth/admin/logout', {});
    } catch (error) {
        console.log('Logout API error (ignored):', error);
    } finally {
        // Clear local storage
        localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(AUTH_KEYS.USER);

        // Redirect to login
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }
}

/**
 * Get current user from storage
 */
export function getCurrentUser() {
    if (typeof window === 'undefined') return null;

    const userStr = localStorage.getItem(AUTH_KEYS.USER);
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
}

/**
 * Refresh access token
 */
export async function refreshToken() {
    const refreshToken = localStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
        throw new Error('No refresh token');
    }

    const response = await api.post('/auth/admin/refresh-token', {
        refresh_token: refreshToken
    });

    if (response.success && response.data?.tokens) {
        localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, response.data.tokens.accessToken);
        localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, response.data.tokens.refreshToken);
        return response.data.tokens;
    }

    throw new Error('Failed to refresh token');
}
