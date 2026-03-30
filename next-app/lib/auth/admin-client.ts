'use client';

export async function fetchAdmin(endpoint: string, options: RequestInit = {}) {
    // Get stored auth
    const storedAuth = localStorage.getItem('adminAuth');
    if (!storedAuth) {
        throw new Error('No admin credentials found');
    }

    const { token, credentials } = JSON.parse(storedAuth);

    // Merge headers
    const headers = {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        'Authorization': `Basic ${credentials}`,
        ...options.headers,
    };

    const response = await fetch(endpoint, {
        ...options,
        headers,
    });

    if (response.status === 401 || response.status === 403) {
        // Auth failed, maybe expired or revoked
        // Optional: Trigger logout callback or event
        // For now, let the caller handle it or throw
        throw new Error('Unauthorized');
    }

    return response;
}
