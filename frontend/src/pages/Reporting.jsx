function Reporting() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reporting</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Report Placeholder */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Invoices</span>
              <span className="font-semibold">45</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Spend</span>
              <span className="font-semibold">$12,450.75</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average per Invoice</span>
              <span className="font-semibold">$276.68</span>
            </div>
          </div>
          <button className="mt-4 text-sm text-blue-600 hover:text-blue-800">
            View Detailed Report →
          </button>
        </div>

        {/* Cost Analysis Placeholder */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h2>
          <p className="text-gray-500 text-sm mb-4">
            Analyze your recipe costs, labor, and overhead.
          </p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Generate Cost Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default Reporting;
