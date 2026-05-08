import { useState, useEffect } from 'react';
import { useNotification, useModal, RibbonNotification, Modal } from '../components/NotificationSystem';
import apiFetch from '../api';

function Admin() {
  const [laborRates, setLaborRates] = useState([]);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [notification, setNotification] = useNotification();
  const { modal, showError, showConfirm, closeModal, hideModal } = useModal();
  
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    role: '',
    hourly_rate: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    name: '',
    contact_first_name: '',
    contact_last_name: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    contact_email: '',
    contact_phone: ''
  });

  const token = localStorage.getItem('token');

  // Fetch labor rates and tenant settings
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch labor rates
      const ratesRes = await apiFetch('http://localhost:3000/api/labor-rates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setLaborRates(ratesData);
      } else {
        const errorData = await ratesRes.json();
        setError(errorData.error || 'Failed to load labor rates');
      }

      // Fetch tenant settings
      const settingsRes = await apiFetch('http://localhost:3000/api/tenant-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setTenantSettings(settingsData);
        setSettingsForm({
          name: settingsData.name || '',
          contact_first_name: settingsData.contact_first_name || '',
          contact_last_name: settingsData.contact_last_name || '',
          address_street: settingsData.address_street || '',
          address_city: settingsData.address_city || '',
          address_state: settingsData.address_state || '',
          address_zip: settingsData.address_zip || '',
          contact_email: settingsData.contact_email || '',
          contact_phone: settingsData.contact_phone || ''
        });
      } else {
        const errorData = await settingsRes.json();
        setError(errorData.error || 'Failed to load tenant settings');
      }
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setError('No authentication token found. Please log in again.');
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    
    if (!formData.role || !formData.hourly_rate) {
      showError('Please fill in all fields');
      return;
    }

    try {
      const url = editingId 
        ? `http://localhost:3000/api/labor-rates/${editingId}`
        : 'http://localhost:3000/api/labor-rates';
      
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: formData.role,
          hourly_rate: parseFloat(formData.hourly_rate)
        })
      });
      
      if (res.ok) {
        await fetchData();
        setEditingId(null);
        setFormData({ role: '', hourly_rate: '' });
        setNotification({
          type: 'success',
          message: editingId ? 'Labor rate updated successfully!' : 'Labor rate added successfully!'
        });
      } else {
        const errorMsg = await res.json();
        setSaveError(errorMsg.error || 'Failed to save labor rate');
      }
    } catch (err) {
      setSaveError(err.message);
    }
  };

  const handleEdit = (rate) => {
    setEditingId(rate.id);
    setFormData({
      role: rate.role,
      hourly_rate: rate.hourly_rate.toString()
    });
  };

  const handleDelete = (id) => {
    showConfirm('Are you sure you want to delete this labor rate?', async () => {
      try {
        const res = await apiFetch(`http://localhost:3000/api/labor-rates/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchData();
          hideModal();
          setNotification({
            type: 'success',
            message: 'Labor rate deleted successfully!'
          });
        }
      } catch (err) {
        showError('Error: ' + err.message);
      }
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ role: '', hourly_rate: '' });
    setSaveError(null);
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsForm({...settingsForm, [name]: value });
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);

    try {
      const res = await apiFetch('http://localhost:3000/api/tenant-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsForm)
      });

      if (res.ok) {
        const updated = await res.json();
        setTenantSettings(updated);
        setNotification({
          type: 'success',
          message: 'Settings saved successfully!'
        });
      } else {
        const errorMsg = await res.json();
        setSaveError(errorMsg.error || 'Failed to save settings');
      }
    } catch (err) {
      setSaveError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <RibbonNotification notification={notification} onClose={() => setNotification(null)} />
      <Modal modal={modal} onClose={closeModal} onCancel={hideModal} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tenant Admin</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {saveError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">Save Error: {saveError}</div>}

      {/* Labor Rates Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {editingId ? 'Edit Labor Rate' : 'Labor Rates'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                placeholder="e.g., Prep Cook"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Labor Rates List */}
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500">Role</th>
              <th className="text-left text-sm font-medium text-gray-500">Hourly Rate</th>
              <th className="text-center text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {laborRates.map((rate) => (
              <tr key={rate.id}>
                <td className="py-2 text-sm text-gray-900">{rate.role}</td>
                <td className="py-2 text-sm text-gray-900">${parseFloat(rate.hourly_rate || 0).toFixed(2)}</td>
                <td className="py-2 text-center">
                  <button
                    onClick={() => handleEdit(rate)}
                    className="text-sm text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rate.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {laborRates.length === 0 && (
              <tr>
                <td colSpan="3" className="py-4 text-center text-gray-500">No labor rates added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tenant Settings Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Settings</h2>
        <form onSubmit={handleSettingsSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Name</label>
              <input
                type="text"
                name="name"
                value={settingsForm.name}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact First Name</label>
              <input
                type="text"
                name="contact_first_name"
                value={settingsForm.contact_first_name}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Last Name</label>
              <input
                type="text"
                name="contact_last_name"
                value={settingsForm.contact_last_name}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                name="contact_email"
                value={settingsForm.contact_email}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="text"
                name="contact_phone"
                value={settingsForm.contact_phone}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                name="address_street"
                value={settingsForm.address_street}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="address_city"
                value={settingsForm.address_city}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="address_state"
                value={settingsForm.address_state}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                name="address_zip"
                value={settingsForm.address_zip}
                onChange={handleSettingsChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}

export default Admin;
