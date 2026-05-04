import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function FixedCosts() {
  const [fixedCosts, setFixedCosts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    item: '',
    type: 'Rent',
    value: ''
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fixedCosts');
    if (saved) {
      setFixedCosts(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever fixedCosts changes
  useEffect(() => {
    localStorage.setItem('fixedCosts', JSON.stringify(fixedCosts));
  }, [fixedCosts]);

  const costTypes = ['Rent', 'Utilities', 'Insurance', 'Salaries', 'Equipment', 'Maintenance', 'Other'];

  const calculateTotal = () => {
    return fixedCosts.reduce((sum, cost) => sum + parseFloat(cost.value || 0), 0).toFixed(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.item || !formData.value) {
      alert('Please fill in all fields');
      return;
    }

    if (editingId) {
      // Update existing
      setFixedCosts(fixedCosts.map(cost => 
        cost.id === editingId 
          ? { ...cost, ...formData, value: parseFloat(formData.value) }
          : cost
      ));
      setEditingId(null);
    } else {
      // Add new
      const newCost = {
        id: Date.now(),
        ...formData,
        value: parseFloat(formData.value)
      };
      setFixedCosts([...fixedCosts, newCost]);
    }

    setFormData({ item: '', type: 'Rent', value: '' });
  };

  const handleEdit = (cost) => {
    setEditingId(cost.id);
    setFormData({
      item: cost.item,
      type: cost.type,
      value: cost.value.toString()
    });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this fixed cost?')) {
      setFixedCosts(fixedCosts.filter(cost => cost.id !== id));
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ item: '', type: 'Rent', value: '' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fixed Costs</h1>
      
      {/* Total Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-700">Total Fixed Costs</h2>
          <div className="text-3xl font-bold text-blue-600">${calculateTotal()}</div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Type of Cost</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {costTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
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
        </form>
      </div>

      {/* Fixed Cost Items List */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Fixed Cost Items</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ item: '', type: 'Rent', value: '' });
            }}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
          >
            + Add Fixed Cost
          </button>
        </div>

        {fixedCosts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No fixed costs added yet. Click "+ Add Fixed Cost" to get started.</p>
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
                    <td className="py-3 text-right font-medium">${parseFloat(cost.value).toFixed(2)}</td>
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
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan="2" className="py-3 text-right font-bold">Total:</td>
                  <td className="py-3 text-right font-bold text-blue-600">${calculateTotal()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default FixedCosts;
