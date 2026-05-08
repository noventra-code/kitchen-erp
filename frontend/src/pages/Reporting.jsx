import { useState, useEffect } from 'react';

function Reporting() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);

      // If user has tenant_id, use it
      if (parsedUser.tenant_id) {
        setSelectedTenantId(parsedUser.tenant_id);
      } else if (parsedUser.role === 'super_admin') {
        // For super_admin, check if a tenant was previously selected
        const savedTenantId = localStorage.getItem('selectedTenantId');
        if (savedTenantId) {
          setSelectedTenantId(savedTenantId);
        }
        // Fetch list of tenants
        fetchTenants();
      }
    }
    fetchSummary();
  }, []);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('http://localhost:3000/api/master/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Get tenant_id
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      let tenantId = selectedTenantId || user?.tenant_id;

      // Build URL with tenant_id if available
      let url = 'http://localhost:3000/api/invoices/summary';
      if (tenantId) {
        url += `?tenant_id=${tenantId}`;
      }

      const response = await apiFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invoice summary');
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantChange = (e) => {
    const newTenantId = e.target.value;
    setSelectedTenantId(newTenantId);
    localStorage.setItem('selectedTenantId', newTenantId);
    // Refetch summary with new tenant
    setTimeout(() => fetchSummary(), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading report data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reporting</h1>

      {/* Tenant Selector for Super Admin */}
      {user?.role === 'super_admin' && tenants.length > 0 && (
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Tenant for Reports
          </label>
          <select
            value={selectedTenantId || ''}
            onChange={handleTenantChange}
            className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a Tenant --</option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price List Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Price List Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Price Lists</span>
              <span className="font-semibold">{summary?.total_invoices || 0}</span>
            </div>
          </div>
          <button
            onClick={fetchSummary}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh Data →
          </button>
        </div>

        {/* Item Pricing Analysis */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing Analysis</h2>
          <p className="text-gray-500 text-sm mb-4">
            Analyze vendor pricing across different price lists to find the best deals.
          </p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Compare Prices
          </button>
        </div>
      </div>
    </div>
  );
}

export default Reporting;
