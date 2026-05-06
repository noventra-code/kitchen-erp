import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification, RibbonNotification } from '../components/NotificationSystem';

const SAMPLE_CSV_FORMAT = `item_name,category,prep_time,cook_time,servings,ingredient_name,quantity,portion
Chocolate Cake,Desserts,15,30,8,Flour,2,cup
Chocolate Cake,Desserts,15,30,8,Sugar,1,cup
Chocolate Cake,Desserts,15,30,8,Eggs,3,unit
Caesar Salad,Salads,10,0,2,Romaine Lettuce,1,head
Caesar Salad,Salads,10,0,2,Croutons,0.5,cup`;

function RecipeCsvImport() {
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useNotification();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv extension)');
      return;
    }

    // Validate file size (max 10MB for CSV)
    if (file.size > 10 * 1024 * 1024) {
      setError('CSV file size exceeds 10MB limit');
      return;
    }

    setCsvFile(file);
    setError('');

    // Read file for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      // Show first 5 lines as preview
      const lines = text.split('\n').slice(0, 5).join('\n');
      setPreview(lines);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvFile) {
      setError('Please select a CSV file first');
      return;
    }

    // Here you would send the CSV to backend for processing
    setNotification({
      type: 'success',
      message: `CSV file "${csvFile.name}" ready for import! (Would send to backend in production)`
    });
    
    // Simulate successful import
    setTimeout(() => {
      setNotification({
        type: 'success',
        message: 'CSV import completed successfully!'
      });
      setTimeout(() => {
        navigate('/recipes');
      }, 1500);
    }, 500);
  };

  return (
    <div className="p-6">
      <RibbonNotification notification={notification} onClose={() => setNotification(null)} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recipe CSV Import</h1>
        <button
          onClick={() => navigate('/recipes')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Back to Recipes
        </button>
      </div>

      {/* Format Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-blue-900 mb-4">Here is the format</h2>
        <p className="text-blue-800 mb-4">Your CSV file should have the following columns:</p>
        <div className="bg-white p-4 rounded border border-blue-200 overflow-x-auto">
          <code className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Column format (in order):</div>
            <div>item_name - Name of the recipe (required)</div>
            <div>category - Recipe category (e.g., Desserts, Main Course) (required)</div>
            <div>prep_time - Prep time in minutes (optional, numeric)</div>
            <div>cook_time - Cook time in minutes (optional, numeric)</div>
            <div>servings - Number of servings (optional, numeric)</div>
            <div>ingredient_name - Name of the ingredient (required)</div>
            <div>quantity - Amount of ingredient (numeric, required)</div>
            <div>portion - Unit of measurement (tsp, tbsp, cup, pint, quart, gallon, oz, lb) (required)</div>
          </code>
        </div>
        
        <h3 className="text-md font-medium text-blue-900 mt-6 mb-2">Sample CSV Format:</h3>
        <pre className="bg-white p-4 rounded border border-blue-200 overflow-x-auto text-sm">
          {SAMPLE_CSV_FORMAT}
        </pre>
      </div>

      {/* Upload Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload CSV File</h2>
        
        <div className="mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
        )}

        {csvFile && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">Selected file: <span className="font-medium">{csvFile.name}</span> ({(csvFile.size / 1024).toFixed(2)} KB)</p>
          </div>
        )}

        {preview && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 lines):</h3>
            <pre className="bg-gray-50 p-3 rounded border text-sm overflow-x-auto">{preview}</pre>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!csvFile}
          className={`px-4 py-2 rounded-md text-white ${csvFile ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          Import CSV
        </button>
      </div>
    </div>
  );
}

export default RecipeCsvImport;
