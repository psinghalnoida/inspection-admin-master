/**
 * API Client for ClaimsMitra Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    getAuthToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('accessToken');
        }
        return null;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = this.getAuthToken();

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        };

        // Remove headers set to undefined (e.g. Content-Type for FormData)
        Object.keys(config.headers).forEach(key => {
            if (config.headers[key] === undefined) delete config.headers[key];
        });

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle 401 - Unauthorized
                if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                    // Session expired — clear storage and redirect to login
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
                throw new ApiError(data.message || 'Request failed', response.status, data);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(error.message || 'Network error', 0, null);
        }
    }

    // HTTP Methods
    get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    getRoute(params) {
        return this.get('/admin/route', params);
    }

    getSurveyorLocation(surveyId) {
        return this.get(`/admin/surveys/${surveyId}/surveyor-location`);
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    postFormData(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': undefined },
        });
    }

    putFormData(endpoint, formData) {
        return this.request(endpoint, {
            method: 'PUT',
            body: formData,
            headers: { 'Content-Type': undefined },
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * Download a survey report.
     *
     * v2 §4.4 — reports left the public /uploads static mount, which now returns
     * 403. They are served by GET /files/reports/:surveyId/:filename behind the
     * Authorization header, which a bare <a href> cannot send. Fetch the bytes,
     * then hand the browser an object URL.
     *
     * Photos and documents are unaffected — they still use the static mount.
     */
    async downloadReport(surveyId, reportFileUrl) {
        const filename = String(reportFileUrl || '').split('/').filter(Boolean).pop();
        if (!filename) throw new ApiError('Report file is unavailable', 0, null);

        const token = this.getAuthToken();
        const res = await fetch(
            `${this.baseUrl}/files/reports/${surveyId}/${encodeURIComponent(filename)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new ApiError(data.message || 'Unable to open this report', res.status, data);
        }

        const objectUrl = URL.createObjectURL(await res.blob());
        // ponytail: anchor+download, not window.open — an async window.open gets
        // eaten by popup blockers.
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    }
}

class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = 'ApiError';
    }
}

// Singleton instance
const api = new ApiClient();

export { api, ApiError };
export default api;
