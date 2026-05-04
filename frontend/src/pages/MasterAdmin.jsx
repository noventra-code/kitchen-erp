function MasterAdmin() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Master Admin</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          ⚠️ This page is only accessible to Super Administrators.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tenant Management</h2>
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500">Tenant Name</th>
              <th className="text-left text-sm font-medium text-gray-500">Database</th>
              <th className="text-left text-sm font-medium text-gray-500">Created</th>
              <th className="text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-2">Demo Kitchen</td>
              <td className="py-2 text-sm text-gray-500">tenant_demo_kitchen</td>
              <td className="py-2 text-sm text-gray-500">2024-01-15</td>
              <td className="py-2">
                <button className="text-sm text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                <button className="text-sm text-red-600 hover:text-red-800">Suspend</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create New Tenant
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Master Recipe Library</h2>
        <p className="text-gray-500 text-sm mb-4">Manage the global recipe library accessible to all tenants.</p>
        <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Add Master Recipe
        </button>
      </div>
    </div>
  );
}

export default MasterAdmin;
