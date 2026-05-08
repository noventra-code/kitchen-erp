import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNotification, useModal, RibbonNotification, Modal } from '../components/NotificationSystem';

// Stable ID generator for ingredients list
function useStableId() {
  const ref = useRef(0);
  return () => ref.current++;
}

function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState(['Uncategorized']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useNotification();
  const { modal, showError, showConfirm, closeModal, hideModal } = useModal();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    category: 'Uncategorized'
  });
  
  const [ingredients, setIngredients] = useState([{ id: 0, name: '', quantity: '', unit: 'oz' }]);
  const [instructions, setInstructions] = useState([{ id: 0, step: '' }]);
  
  const getNextId = useStableId();
  
  const token = localStorage.getItem('token');

  // Fetch recipes and categories
  const fetchData = async (category = selectedCategory) => {
    try {
      setLoading(true);
      setError(null);

      // Build URL with category filter
      let url = 'http://localhost:3000/api/recipes';
      if (category && category !== 'all') {
        url += `?category=${encodeURIComponent(category)}`;
      }

      // Fetch recipes
      const recipesRes = await apiFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        setRecipes(recipesData);
      } else {
        const errorData = await recipesRes.json();
        setError(errorData.error || 'Failed to load recipes');
      }

      // Fetch categories
      const catRes = await apiFetch('http://localhost:3000/api/recipe-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.length > 0) {
          setCategories(catData);
        }
      }
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when category changes
  useEffect(() => {
    if (token) {
      fetchData(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setError('No authentication token found. Please log in again.');
      setLoading(false);
    }
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      prep_time: '',
      cook_time: '',
      servings: '',
      category: 'Uncategorized'
    });
    setIngredients([{ id: getNextId(), name: '', quantity: '', unit: 'oz' }]);
    setInstructions([{ id: getNextId(), step: '' }]);
    setEditingId(null);
    setSaveError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    
    if (!formData.name || !formData.description) {
      showError('Please fill in name and description');
      return;
    }

    // Validate ingredients
    const validIngredients = ingredients.filter(ing => ing.name.trim() !== '');
    if (validIngredients.length === 0) {
      showError('Please add at least one ingredient');
      return;
    }

    // Validate instructions
    const validInstructions = instructions.filter(inst => String(inst.step).trim() !== '');
    if (validInstructions.length === 0) {
      showError('Please add at least one instruction step');
      return;
    }

    try {
      const url = editingId 
        ? `http://localhost:3000/api/recipes/${editingId}`
        : 'http://localhost:3000/api/recipes';
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        name: formData.name,
        description: formData.description,
        prep_time: formData.prep_time ? parseInt(formData.prep_time) : null,
        cook_time: formData.cook_time ? parseInt(formData.cook_time) : null,
        servings: formData.servings ? parseInt(formData.servings) : null,
        category: formData.category,
        ingredients_json: validIngredients.map(({ name, quantity, unit }) => ({
          name,
          quantity: parseFloat(quantity) || 0,
          unit
        })),
        instructions: validInstructions.map(({ step }) => String(step))
      };

      const res = await apiFetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setNotification({
          type: 'success',
          message: editingId ? 'Recipe updated successfully!' : 'Recipe created successfully!'
        });
        await fetchData();
        resetForm();
        setShowForm(false);
      } else {
        const errorMsg = await res.json();
        showError(errorMsg.error || 'Failed to save recipe');
      }
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const handleEdit = (recipe) => {
    setEditingId(recipe.id);
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      prep_time: recipe.prep_time?.toString() || '',
      cook_time: recipe.cook_time?.toString() || '',
      servings: recipe.servings?.toString() || '',
      category: recipe.category || 'Uncategorized'
    });

    // Parse ingredients from JSONB
    let recipeIngredients = [{ id: getNextId(), name: '', quantity: '', unit: 'oz' }];
    try {
      const ing = typeof recipe.ingredients_json === 'string' 
        ? JSON.parse(recipe.ingredients_json) 
        : (recipe.ingredients_json || []);
      if (ing.length > 0) {
        recipeIngredients = ing.map((i, idx) => ({
          id: getNextId() + idx,
          name: i.name || '',
          quantity: i.quantity?.toString() || '',
          unit: i.unit || 'oz'
        }));
      }
    } catch (e) {
      console.error('Error parsing ingredients:', e);
    }
    setIngredients(recipeIngredients);

    // Parse instructions from JSONB
    let recipeInstructions = [{ id: getNextId() + 100, step: '' }];
    try {
      const inst = typeof recipe.instructions === 'string'
        ? JSON.parse(recipe.instructions)
        : (recipe.instructions || []);
      if (inst.length > 0) {
        recipeInstructions = inst.map((step, idx) => ({
          id: getNextId() + 100 + idx,
          step: typeof step === 'string' ? step : (step.step ? String(step.step) : String(step || ''))
        }));
      }
    } catch (e) {
      console.error('Error parsing instructions:', e);
    }
    setInstructions(recipeInstructions);

    setShowForm(true);
  };

  const handleDelete = (id) => {
    showConfirm('Are you sure you want to delete this recipe?', async () => {
      try {
        const res = await apiFetch(`http://localhost:3000/api/recipes/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchData();
          hideModal();
        }
      } catch (err) {
        showError('Error: ' + err.message);
      }
    });
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { id: getNextId(), name: '', quantity: '', unit: 'oz' }]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id, field, value) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const addInstruction = () => {
    setInstructions([...instructions, { id: getNextId(), step: '' }]);
  };

  const removeInstruction = (id) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter(inst => inst.id !== id));
    }
  };

  const updateInstruction = (id, value) => {
    setInstructions(instructions.map(inst => 
      inst.id === id ? { ...inst, step: value } : inst
    ));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <RibbonNotification notification={notification} onClose={() => setNotification(null)} />
      <Modal modal={modal} onClose={closeModal} onCancel={hideModal} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Add Recipe'}
        </button>
      </div>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {saveError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">Save Error: {saveError}</div>}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Recipes</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by recipe name..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recipe Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Recipe' : 'Add New Recipe'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Margherita Pizza"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the recipe"
                rows="2"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                <input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({...formData, prep_time: e.target.value})}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (min)</label>
                <input
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({...formData, cook_time: e.target.value})}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({...formData, servings: e.target.value})}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Ingredients</label>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Ingredient
                </button>
              </div>
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                    className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">L</option>
                    <option value="each">each</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                  </select>
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(ing.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Instructions</label>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Step
                </button>
              </div>
              {instructions.map((inst, idx) => (
                <div key={inst.id} className="flex gap-2 mb-2">
                  <span className="text-sm text-gray-500 mt-2">{idx + 1}.</span>
                  <textarea
                    value={inst.step}
                    onChange={(e) => updateInstruction(inst.id, e.target.value)}
                    placeholder="Describe this step"
                    rows="2"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  {instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(inst.id)}
                      className="text-red-600 hover:text-red-800 text-sm mt-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {editingId ? 'Update Recipe' : 'Save Recipe'}
            </button>
          </form>
        </div>
      )}

      {/* Recipe List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Prep Time</th>
              <th className="p-3 text-left">Cook Time</th>
              <th className="p-3 text-left">Servings</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes
              .filter(recipe => 
                searchTerm === '' || 
                recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(recipe => (
              <tr key={recipe.id} className="border-t">
                <td className="p-3">{recipe.name}</td>
                <td className="p-3">{recipe.category || 'Uncategorized'}</td>
                <td className="p-3">{recipe.prep_time || '-'} min</td>
                <td className="p-3">{recipe.cook_time || '-'} min</td>
                <td className="p-3">{recipe.servings || '-'}</td>
                <td className="p-3">
                  <button
                    onClick={() => handleEdit(recipe)}
                    className="text-blue-500 hover:text-blue-700 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {recipes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No recipes found. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

export default Recipes;
