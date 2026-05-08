import React, { useEffect, useState } from 'react';
import apiFetch from '../api';

const RecipeMappingList = () => {
  const [mappings, setMappings] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [modal, setModal] = useState({ show: false, type: 'error', message: '', onConfirm: null });
  const [formData, setFormData] = useState({
    invoice_vendor: '',
    invoice_item_pattern: '',
    recipe_id: '',
    confidence_score: 1.00
  });

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    fetchMappings();
    fetchRecipes();
  }, []);

  const fetchMappings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('http://localhost:3000/api/recipe-mappings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMappings(data);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('http://localhost:3000/api/recipes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecipes(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('http://localhost:3000/api/recipe-mappings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Mapping created successfully!'
        });
        setFormData({
          invoice_vendor: '',
          invoice_item_pattern: '',
          recipe_id: '',
          confidence_score: 1.00
        });
        setShowForm(false);
        fetchMappings();
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      setModal({
        show: true,
        type: 'error',
        message: 'Error creating mapping. Please try again.',
        onConfirm: null
      });
    }
  };

  const handleDelete = (id) => {
    setModal({
      show: true,
      type: 'confirm',
      message: 'Are you sure you want to delete this mapping?',
      onConfirm: async () => {
        try {
          await apiFetch(`http://localhost:3000/api/recipe-mappings/${id}`, {
            method: 'DELETE'
          });
          setModal({ show: false, type: 'error', message: '', onConfirm: null });
          fetchMappings();
        } catch (error) {
          console.error('Error deleting mapping:', error);
          setModal({
            show: true,
            type: 'error',
            message: 'Error deleting mapping. Please try again.',
            onConfirm: null
          });
        }
      }
    });
  };

  const closeModal = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    setModal({ show: false, type: 'error', message: '', onConfirm: null });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      {/* Ribbon Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg shadow-lg flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-white hover:text-gray-200 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              {modal.type === 'error' ? (
                <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {modal.type === 'error' ? 'Error' : 'Confirm'}
              </h3>
            </div>
            <p className="text-gray-700 mb-6">{modal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setModal({ show: false, type: 'error', message: '', onConfirm: null })}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                {modal.type === 'confirm' ? 'Cancel' : 'Close'}
              </button>
              {modal.type === 'confirm' && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recipe Mappings</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'Add Mapping'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Vendor Name</label>
              <input
                type="text"
                value={formData.invoice_vendor}
                onChange={(e) => setFormData({...formData, invoice_vendor: e.target.value})}
                required
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., US Foods"
              />
            </div>
            <div>
              <label className="block mb-1">Item Pattern</label>
              <input
                type="text"
                value={formData.invoice_item_pattern}
                onChange={(e) => setFormData({...formData, invoice_item_pattern: e.target.value})}
                required
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., *chicken* (wildcard match)"
              />
            </div>
            <div>
              <label className="block mb-1">Recipe</label>
              <select
                value={formData.recipe_id}
                onChange={(e) => setFormData({...formData, recipe_id: e.target.value})}
                required
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Select Recipe</option>
                {recipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1">Confidence Score</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.confidence_score}
                onChange={(e) => setFormData({...formData, confidence_score: parseFloat(e.target.value)})}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
          </div>
          <button type="submit" className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Save Mapping
          </button>
        </form>
      )}

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Vendor</th>
            <th className="border p-2 text-left">Item Pattern</th>
            <th className="border p-2 text-left">Recipe</th>
            <th className="border p-2 text-left">Confidence</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map(mapping => (
            <tr key={mapping.id}>
              <td className="border p-2">{mapping.invoice_vendor}</td>
              <td className="border p-2">{mapping.invoice_item_pattern}</td>
              <td className="border p-2">{recipes.find(r => r.id === mapping.recipe_id)?.name || 'Unknown'}</td>
              <td className="border p-2">{mapping.confidence_score}</td>
              <td className="border p-2">
                <button
                  onClick={() => handleDelete(mapping.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mappings.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No mappings found. Create one to map invoice items to recipes.
        </div>
      )}
    </div>
  );
};

export default RecipeMappingList;
