const BASE_URL = import.meta.env.VITE_API_URL || 'https://finance-a6j5.onrender.com';

export async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type if sending FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    let response = await fetch(`${BASE_URL}/api${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
        response = await fetch(`${BASE_URL}/api${endpoint}`, { ...options, headers });
      } else {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }

    const isCsv = response.headers.get('content-type')?.includes('text/csv');
    if (isCsv) return response;

    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'An error occurred');
    return data.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function refreshAccessToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, { method: 'POST' });
    const data = await response.json();
    if (data.success && data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}