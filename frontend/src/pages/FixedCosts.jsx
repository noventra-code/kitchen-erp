import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification, useModal, RibbonNotification, Modal } from '../components/NotificationSystem';

// Format number with commas for thousands
function formatCurrency(value) {
  return parseFloat(value || 0).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

function FixedCosts() {
  const [fixedCosts, setFixedCosts] = useState([]);
  const [categories, setCategories] = useState(['Rent', 'Utilities', 'Insurance', 'Salaries', 'Equipment', 'Maintenance', 'Other']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [notification, setNotification] = useNotification();
  const { modal, showError, showConfirm, closeModal, hideModal, setModal } = useModal();
  
  const [formData, setFormData] = useState({
    item: '',
    type: 'Rent',
    value: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, itemId: null });
  const [categoryConfirm, setCategoryConfirm] = useState({ isOpen: false, category: null });

  const token = localStorage.getItem('token');

  // Load categories from localStorage on mount
  useEffect(() => {
    const savedCategories = localStorage.getItem('fixedCostCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  // Save categories to localStorage
  useEffect(() => {
    localStorage.setItem('fixedCostCategories', JSON.stringify(categories));
  }, [categories]);

  // Fetch fixed costs from API
  const fetchFixedCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('http://localhost:3000/api/fixed-costs', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFixedCosts(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to load fixed costs');
      }
    } catch (err) {
      setError('Failed to load fixed costs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFixedCosts();
    } else {
      setError('No authentication token found. Please log in again.');
      setLoading(false);
    }
  }, []);

  const calculateTotal = () => {
    return fixedCosts.reduce((sum, cost) => sum + parseFloat(cost.value || 0), 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    
    if (!formData.item || !formData.value) {
      showError('Please fill in all fields');
      return;
    }

    // If "Other" is selected and there's a new category, use that
    let finalType = formData.type;
    if (formData.type === 'Other' && newCategory.trim()) {
      finalType = newCategory.trim();
      if (!categories.includes(finalType)) {
        setCategories([...categories, finalType]);
      }
    }

    try {
      const url = editingId 
        ? `http://localhost:3000/api/fixed-costs/${editingId}`
        : 'http://localhost:3000/api/fixed-costs';
      
      const method = editingId ? 'PUT' : 'POST';
      
      const body = {
        item: formData.item,
        type: finalType,
        value: parseFloat(formData.value)
      };
      
      const res = await apiFetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        await fetchFixedCosts();
        setEditingId(null);
        setFormData({ item: '', type: 'Rent', value: '' });
        setShowNewCategory(false);
        setNewCategory('');
        setNotification({
          type: 'success',
          message: editingId ? 'Fixed cost updated successfully!' : 'Fixed cost added successfully!'
        });
      } else {
        const errorMsg = await res.json();
        showError(errorMsg.error || 'Failed to save fixed cost');
      }
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const handleEdit = (cost) => {
    setEditingId(cost.id);
    setFormData({
      item: cost.item,
      type: cost.type,
      value: cost.value.toString()
    });
    if (!categories.includes(cost.type)) {
      setCategories([...categories, cost.type]);
    }
  };

  const handleDeleteConfirm = async () => {
    const { itemId } = deleteConfirm;
    try {
      const res = await apiFetch(`http://localhost:3000/api/fixed-costs/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFixedCosts();
        setDeleteConfirm({ isOpen: false, itemId: null });
        setNotification({
          type: 'success',
          message: 'Fixed cost deleted successfully!'
        });
      }
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, itemId: null });
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, itemId: id });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ item: '', type: 'Rent', value: '' });
    setShowNewCategory(false);
    setNewCategory('');
    setSaveError(null);
  };

  const handleTypeChange = (e) => {
    const selected = e.target.value;
    if (selected === 'Add New...') {
      setShowNewCategory(true);
      setFormData({...formData, type: 'Other'});
    } else {
      setShowNewCategory(false);
      setFormData({...formData, type: selected});
    }
  };

  const removeCategory = (categoryToRemove) => {
    if (categories.filter(c => c !== 'Other').length === 0) {
      showError('You cannot remove all categories except "Other"');
      return;
    }
    setCategoryConfirm({ isOpen: true, category: categoryToRemove });
  };

  const handleCategoryConfirm = () => {
    const { category } = categoryConfirm;
    setCategories(categories.filter(c => c !== category));
    setCategoryConfirm({ isOpen: false, category: null });
  };

  const handleCategoryCancel = () => {
    setCategoryConfirm({ isOpen: false, category: null });
  };

  const addCategoryDirectly = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      showError('Please enter a category name');
      return;
    }
    if (categories.includes(trimmed)) {
      showError('Category already exists');
      return;
    }
    setCategories([...categories, trimmed]);
    setNewCategory('');
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

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fixed Costs</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {saveError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">Save Error: {saveError}</div>}

      {/* Total Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-700">Total Fixed Costs</h2>
          <div className="text-3xl font-bold text-blue-600">${formatCurrency(calculateTotal())}</div>
        </div>
      </div>

      {/* Enter Fixed Costs Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {editingId ? 'Edit Fixed Cost' : 'Enter Fixed Cost'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
              <input
                type="text"
                value={formData.item}
                onChange={(e) => setFormData({...formData, item: e.target.value})}
                placeholder="e.g., Monthly Rent"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type of Cost</label>
              <div className="flex space-x-2 mb-2">
                <select
                  value={showNewCategory ? 'Other' : formData.type}
                  onChange={handleTypeChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="Add New...">Add New...</option>
                </select>
              </div>
              
              {/* Inline Category Management */}
              {showNewCategory && (
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addCategoryDirectly()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addCategoryDirectly}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              )}
              
              {/* Category List with Remove */}
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.filter(c => c !== 'Other').map(cat => (
                  <span key={cat} className="inline-flex items-center px-2 py-1 bg-gray-100 text-sm rounded">
                    {cat}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="ml-1 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Fixed Cost Items List */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Fixed Cost Items</h2>
        </div>

        {fixedCosts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No fixed costs added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-sm font-medium text-gray-500 pb-2">Item</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-2">Type</th>
                  <th className="text-right text-sm font-medium text-gray-500 pb-2">Value</th>
                  <th className="text-center text-sm font-medium text-gray-500 pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fixedCosts.map(cost => (
                  <tr key={cost.id}>
                    <td className="py-3">{cost.item}</td>
                    <td className="py-3 text-sm text-gray-600">{cost.type}</td>
                    <td className="py-3 text-right font-medium">${formatCurrency(cost.value)}</td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => handleEdit(cost)}
                        className="text-sm text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cost.id)}
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
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Delete Fixed Cost</h3>
            </div>
            <p className="text-gray-700 mb-6">Are you sure you want to delete this fixed cost? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Removal Confirmation Dialog */}
      {categoryConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Remove Category</h3>
            </div>
            <p className="text-gray-700 mb-6">Remove "{categoryConfirm.category}" from dropdown? Existing fixed costs using this category will still show it.</p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCategoryCancel}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCategoryConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FixedCosts;
