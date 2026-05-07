import { useState, useEffect, useRef } from 'react';

function TenantSelector() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        
        // Load selected tenant from localStorage
        const savedTenant = localStorage.getItem('selectedTenantId');
        if (savedTenant) {
          setSelectedTenant(savedTenant);
        } else if (parsedUser.tenant_id) {
          setSelectedTenant(parsedUser.tenant_id);
        }
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && (user.role === 'super_admin' || user.role === 'tenant_admin')) {
      fetchTenants();
    }
  }, [user]);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/master/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  const handleTenantSelect = (tenantId) => {
    setSelectedTenant(tenantId);
    localStorage.setItem('selectedTenantId', tenantId);
    setIsOpen(false);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { tenantId } }));
  };

  if (!user || (user.role !== 'super_admin' && user.role !== 'tenant_admin')) {
    return null;
  }

  const currentTenant = tenants.find(t => t.id === selectedTenant) || 
                        tenants.find(t => t.id === user.tenant_id);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none flex items-center space-x-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span>{currentTenant ? currentTenant.name : 'Select Tenant'}</span>
        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase">Switch Tenant</p>
          </div>
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleTenantSelect(tenant.id)}
              className={`block w-full text-left px-4 py-2 text-sm ${
                selectedTenant === tenant.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{tenant.name}</span>
                {selectedTenant === tenant.id && (
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {tenant.subdomain && (
                <p className="text-xs text-gray-500">{tenant.subdomain}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TenantSelector;
