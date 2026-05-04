import { useState } from 'react';

function Admin() {
  const [laborRates, setLaborRates] = useState([
    { id: 1, role: 'Prep Cook', hourly_rate: 15.00 },
    { id: 2, role: 'Line Cook', hourly_rate: 18.00 },
    { id: 3, role: 'Sous Chef', hourly_rate: 22.00 },
    { id: 4, role: 'Head Chef', hourly_rate: 28.00 },
  ]);

  const [fixedCosts, setFixedCosts] = useState([
    { id: 1, name: 'Rent', amount: 5000.00, allocation_type: 'per_month' },
    { id: 2, name: 'Utilities', amount: 800.00, allocation_type: 'per_month' },
    { id: 3, name: 'Insurance', amount: 400.00, allocation_type: 'per_month' },
    { id: 4, name: 'Equipment Depreciation', amount: 200.00, allocation_type: 'per_month' },
  ]);

  const [showAddCost, setShowAddCost] = useState(false);
  const [newCost, setNewCost] = useState({ name: '', amount: '', allocation_type: 'per_month' });

  const handleAddCost = () => {
    if (newCost.name && newCost.amount) {
      setFixedCosts([...fixedCosts, { id: Date.now(), ...newCost, amount: parseFloat(newCost.amount) }]);
      setNewCost({ name: '', amount: '', allocation_type: 'per_month' });
      setShowAddCost(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tenant Admin</h1>
      
      {/* Labor Rates Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Labor Rates</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500">Role</th>
              <th className="text-left text-sm font-medium text-gray-500">Hourly Rate</th>
              <th className="text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {laborRates.map((rate) => (
              <tr key={rate.id}>
                <td className="py-2 text-sm text-gray-900">{rate.role}</td>
                <td className="py-2 text-sm text-gray-900">${rate.hourly_rate.toFixed(2)}</td>
                <td className="py-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fixed Costs Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Fixed Costs (Overhead)</h2>
          <button
            onClick={() => setShowAddCost(!showAddCost)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            {showAddCost ? 'Cancel' : 'Add Fixed Cost'}
          </button>
        </div>

        {showAddCost && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Cost name"
                value={newCost.name}
                onChange={(e) => setNewCost({...newCost, name: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                placeholder="Amount"
                value={newCost.amount}
                onChange={(e) => setNewCost({...newCost, amount: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <select
                value={newCost.allocation_type}
                onChange={(e) => setNewCost({...newCost, allocation_type: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="per_recipe">Per Recipe</option>
                <option value="per_month">Per Month</option>
                <option value="per_service">Per Service</option>
              </select>
            </div>
            <button
              onClick={handleAddCost}
              className="mt-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Save
            </button>
          </div>
        )}

        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500">Name</th>
              <th className="text-left text-sm font-medium text-gray-500">Amount</th>
              <th className="text-left text-sm font-medium text-gray-500">Allocation</th>
              <th className="text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fixedCosts.map((cost) => (
              <tr key={cost.id}>
                <td className="py-2 text-sm text-gray-900">{cost.name}</td>
                <td className="py-2 text-sm text-gray-900">${cost.amount.toFixed(2)}</td>
                <td className="py-2 text-sm text-gray-500">{cost.allocation_type.replace('_', ' ')}</td>
                <td className="py-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                  <button className="text-sm text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tenant Settings Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant Name
            </label>
            <input
              type="text"
              defaultValue="Demo Kitchen"
              className="px-3 py-2 border border-gray-300 rounded text-sm w-full max-w-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Currency
            </label>
            <select className="px-3 py-2 border border-gray-300 rounded text-sm">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default Admin;
