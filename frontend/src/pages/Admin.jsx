function Admin() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Settings</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Labor Rates</h2>
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500">Role</th>
              <th className="text-left text-sm font-medium text-gray-500">Hourly Rate</th>
              <th className="text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-2">Prep Cook</td>
              <td className="py-2">$15.00</td>
              <td className="py-2">
                <button className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
              </td>
            </tr>
            <tr>
              <td className="py-2">Line Cook</td>
              <td className="py-2">$18.00</td>
              <td className="py-2">
                <button className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
              </td>
            </tr>
            <tr>
              <td className="py-2">Sous Chef</td>
              <td className="py-2">$22.00</td>
              <td className="py-2">
                <button className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Fixed Costs</h2>
        <p className="text-gray-500 text-sm mb-4">Manage overhead costs allocated to recipes.</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Add Fixed Cost
        </button>
      </div>
    </div>
  );
}

export default Admin;
