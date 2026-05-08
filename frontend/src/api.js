/**
 * API fetch wrapper that includes X-Tenant-ID header for super_admin tenant switching
 * Use this instead of fetch() for all API calls
 */
export function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const selectedTenantId = localStorage.getItem('selectedTenantId');
  
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (selectedTenantId && selectedTenantId !== 'null') {
    headers['X-Tenant-ID'] = selectedTenantId;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

export default apiFetch;
