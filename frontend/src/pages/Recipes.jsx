import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Recipes() {
  const [masterRecipes, setMasterRecipes] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prep_time: 30,
    cook_time: 15,
    servings: 4,
    ingredients_json: '[]',
    instructions: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRecipes();
    fetchMasterRecipes();
  }, []);

  const fetchMasterRecipes = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/master-recipes');
      const data = await response.json();
      setMasterRecipes(data);
    } catch (err) {
      console.error('Error fetching master recipes:', err);
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/recipes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMyRecipes(data);
    } catch (err) {
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (masterRecipeId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/recipes/clone/${masterRecipeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        fetchRecipes();
        alert('Recipe cloned successfully!');
      }
    } catch (err) {
      alert('Failed to clone recipe');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingRecipe 
        ? `http://localhost:3000/api/recipes/${editingRecipe.id}`
        : 'http://localhost:3000/api/recipes';
      
      const method = editingRecipe ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchRecipes();
        setShowAddModal(false);
        setEditingRecipe(null);
        setFormData({
          name: '', description: '', prep_time: 30, cook_time: 15,
          servings: 4, ingredients_json: '[]', instructions: ''
        });
      }
    } catch (err) {
      alert('Failed to save recipe');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await fetch(`http://localhost:3000/api/recipes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRecipes();
    } catch (err) {
      alert('Failed to delete recipe');
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
        <button 
          onClick={() => { setShowAddModal(true); setEditingRecipe(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add New Recipe
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {/* My Recipes Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">My Kitchen</h2>
        {myRecipes.length === 0 ? (
          <p className="text-gray-500">No recipes yet. Clone from marketplace or add your own!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
                <div className="flex items-center mt-3 text-sm text-gray-500">
                  <span>Prep: {recipe.prep_time}m</span>
                  <span className="mx-2">|</span>
                  <span>Cook: {recipe.cook_time}m</span>
                </div>
                <div className="mt-3 flex space-x-2">
                  <button 
                    onClick={() => { setEditingRecipe(recipe); setFormData(recipe); setShowAddModal(true); }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(recipe.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Marketplace Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recipe Marketplace</h2>
        <p className="text-sm text-gray-600 mb-4">Browse master recipes and clone them to your kitchen to customize.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {masterRecipes.map((recipe) => (
            <div key={recipe.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
              <div className="flex items-center mt-3 text-sm text-gray-500">
                <span>Prep: {recipe.prep_time}m</span>
                <span className="mx-2">|</span>
                <span>Cook: {recipe.cook_time}m</span>
              </div>
              <button
                onClick={() => handleClone(recipe.id)}
                className="mt-3 w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Clone to My Kitchen
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prep Time (min)</label>
                    <input
                      type="number"
                      value={formData.prep_time}
                      onChange={(e) => setFormData({...formData, prep_time: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cook Time (min)</label>
                    <input
                      type="number"
                      value={formData.cook_time}
                      onChange={(e) => setFormData({...formData, cook_time: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Servings</label>
                    <input
                      type="number"
                      value={formData.servings}
                      onChange={(e) => setFormData({...formData, servings: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instructions</label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="4"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingRecipe(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRecipe ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recipes;
