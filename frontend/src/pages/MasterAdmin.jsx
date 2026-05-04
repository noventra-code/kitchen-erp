import { useState, useEffect } from 'react';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// Phone number formatter: (XXX) XXX-XXXX
function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function MasterAdmin() {
  const [tenants, setTenants] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tenant modal
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [tenantForm, setTenantForm] = useState({
    name: '',
    contact_first_name: '',
    contact_last_name: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    contact_email: '',
    contact_phone: '',
    status: 'active'
  });
  
  // Admin modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminTenantFilter, setAdminTenantFilter] = useState('');
  const [adminForm, setAdminForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    tenant_ids: []
  });
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    fetchTenants();
    fetchAdmins();
  }, []);
  
  const fetchTenants = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/master/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAdmins = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/master/tenant-admins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load admins');
    }
  };
  
  const handleTenantSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingTenant 
        ? `http://localhost:3000/api/master/tenants/${editingTenant.id}`
        : 'http://localhost:3000/api/master/tenants';
      const method = editingTenant ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tenantForm)
      });
      
      if (res.ok) {
        const newTenant = await res.json();
        fetchTenants();
        setShowTenantModal(false);
        setEditingTenant(null);
        setTenantForm({
          name: '',
          contact_first_name: '',
          contact_last_name: '',
          address_street: '',
          address_city: '',
          address_state: '',
          address_zip: '',
          contact_email: '',
          contact_phone: '',
          status: 'active'
        });
        // Automatically open admin modal with blank fields
        setAdminForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          password: '',
          confirm_password: '',
          tenant_ids: []
        });
        setShowAdminModal(true);
      }
    } catch (err) {
      alert('Failed to save tenant');
    }
  };
  
  const handleEditTenant = (tenant) => {
    setEditingTenant(tenant);
    setTenantForm({
      name: tenant.name,
      contact_first_name: tenant.contact_first_name || '',
      contact_last_name: tenant.contact_last_name || '',
      address_street: tenant.address_street || '',
      address_city: tenant.address_city || '',
      address_state: tenant.address_state || '',
      address_zip: tenant.address_zip || '',
      contact_email: tenant.contact_email || '',
      contact_phone: tenant.contact_phone || '',
      status: tenant.status || 'active'
    });
    setShowTenantModal(true);
  };
  
  const handleDeleteTenant = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/master/tenants/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTenants();
        setDeleteConfirm(null);
      }
    } catch (err) {
      alert('Failed to delete tenant');
    }
  };
  
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (adminForm.password !== adminForm.confirm_password) {
      alert('Passwords do not match');
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/api/master/tenant-admins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: adminForm.first_name,
          last_name: adminForm.last_name,
          email: adminForm.email,
          phone: adminForm.phone,
          password: adminForm.password,
          tenant_ids: adminForm.tenant_ids
        })
      });
      if (res.ok) {
        fetchAdmins();
        setShowAdminModal(false);
        setAdminForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          password: '',
          confirm_password: '',
          tenant_ids: []
        });
      }
    } catch (err) {
      alert('Failed to create admin');
    }
  };
  
  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.contact_email && t.contact_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Master Admin</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      
      {/* Tenants Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Tenant Management</h2>
          <button 
            onClick={() => {
              setEditingTenant(null);
              setTenantForm({
                name: '',
                contact_first_name: '',
                contact_last_name: '',
                address_street: '',
                address_city: '',
                address_state: '',
                address_zip: '',
                contact_email: '',
                contact_phone: '',
                status: 'active'
              });
              setShowTenantModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create New Tenant
          </button>
        </div>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter tenants by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Tenants Table */}
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500">Company Name</th>
              <th className="text-left text-sm font-medium text-gray-500">Contact Email</th>
              <th className="text-left text-sm font-medium text-gray-500">Database</th>
              <th className="text-left text-sm font-medium text-gray-500">Status</th>
              <th className="text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTenants.map(tenant => (
              <tr key={tenant.id}>
                <td className="py-2">{tenant.name}</td>
                <td className="py-2 text-sm text-gray-500">{tenant.contact_email || 'N/A'}</td>
                <td className="py-2 text-sm text-gray-500">{tenant.db_name}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {tenant.status}
                  </span>
                </td>
                <td className="py-2">
                  <button 
                    onClick={() => handleEditTenant(tenant)}
                    className="text-sm text-blue-600 hover:text-blue-800 mr-2"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(tenant.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Tenant Modal */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingTenant ? 'Edit Tenant' : 'Create New Tenant'}</h2>
            <form onSubmit={handleTenantSubmit}>
              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input
                    type="text"
                    required
                    value={tenantForm.name}
                    onChange={(e) => setTenantForm({...tenantForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                {/* Contact Info - Side by side layout */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600">First Name</label>
                      <input
                        type="text"
                        value={tenantForm.contact_first_name}
                        onChange={(e) => setTenantForm({...tenantForm, contact_first_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Last Name</label>
                      <input
                        type="text"
                        value={tenantForm.contact_last_name}
                        onChange={(e) => setTenantForm({...tenantForm, contact_last_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600">Street Address</label>
                      <input
                        type="text"
                        value={tenantForm.address_street}
                        onChange={(e) => setTenantForm({...tenantForm, address_street: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">City</label>
                      <input
                        type="text"
                        value={tenantForm.address_city}
                        onChange={(e) => setTenantForm({...tenantForm, address_city: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">State</label>
                      <select
                        value={tenantForm.address_state}
                        onChange={(e) => setTenantForm({...tenantForm, address_state: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select State</option>
                        {US_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Zip Code</label>
                      <input
                        type="text"
                        value={tenantForm.address_zip}
                        onChange={(e) => setTenantForm({...tenantForm, address_zip: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Email Address</label>
                      <input
                        type="email"
                        value={tenantForm.contact_email}
                        onChange={(e) => setTenantForm({...tenantForm, contact_email: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Phone Number</label>
                      <input
                        type="tel"
                        value={tenantForm.contact_phone}
                        onChange={(e) => setTenantForm({...tenantForm, contact_phone: formatPhoneNumber(e.target.value)})}
                        placeholder="(123) 456-7890"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={tenantForm.status}
                    onChange={(e) => setTenantForm({...tenantForm, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTenantModal(false);
                    setEditingTenant(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingTenant ? 'Update Tenant' : 'Submit Tenant Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Create Tenant Admin</h2>
            <form onSubmit={handleAdminSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      value={adminForm.first_name}
                      onChange={(e) => setAdminForm({...adminForm, first_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      required
                      value={adminForm.last_name}
                      onChange={(e) => setAdminForm({...adminForm, last_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({...adminForm, phone: formatPhoneNumber(e.target.value)})}
                    placeholder="(123) 456-7890"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      required
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={adminForm.confirm_password}
                      onChange={(e) => setAdminForm({...adminForm, confirm_password: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Tenants</label>
                  <input
                    type="text"
                    placeholder="Filter tenants..."
                    value={adminTenantFilter}
                    onChange={(e) => setAdminTenantFilter(e.target.value)}
                    className="mb-2 px-3 py-2 border border-gray-300 rounded-md w-48 text-sm"
                  />
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {tenants.filter(t => 
                      t.name.toLowerCase().includes(adminTenantFilter.toLowerCase()) ||
                      (t.contact_email && t.contact_email.toLowerCase().includes(adminTenantFilter.toLowerCase()))
                    ).map(tenant => (
                      <label key={tenant.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={adminForm.tenant_ids.includes(tenant.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAdminForm({...adminForm, tenant_ids: [...adminForm.tenant_ids, tenant.id]});
                            } else {
                              setAdminForm({...adminForm, tenant_ids: adminForm.tenant_ids.filter(id => id !== tenant.id)});
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{tenant.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this tenant? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTenant(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterAdmin;
