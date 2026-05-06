import { useState, useEffect, useRef } from 'react';

const PORTION_UNITS = ['tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon', 'oz', 'lb', 'each'];

function ManualRecipeEntry({ recipe, onSave, onClose }) {
  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const nextIngredientId = useRef(Date.now());
  const [ingredients, setIngredients] = useState(() => [
    { id: nextIngredientId.current++, name: '', quantity: '', portion: 'cup' }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [modal, setModal] = useState({ show: false, type: 'error', message: '', onConfirm: null });

  const token = localStorage.getItem('token');

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Pre-fill form if editing an existing recipe
  useEffect(() => {
    if (recipe) {
      setItemName(recipe.name || '');
      setSelectedCategory(recipe.category || '');
      setPrepTime(recipe.prep_time || 0);
      setCookTime(recipe.cook_time || 0);
      setServings(recipe.servings || 0);
      if (recipe.ingredients_json && Array.isArray(recipe.ingredients_json)) {
        setIngredients(recipe.ingredients_json.map((ing) => ({
          id: nextIngredientId.current++,
          name: ing.name || ing.item_name || '',
          quantity: ing.quantity?.toString() || '',
          portion: ing.unit || ing.portion || 'cup'
        })));
      }
    }
  }, [recipe]);

  const addIngredientRow = () => {
    setIngredients(prev => [
      ...prev,
      { id: nextIngredientId.current++, name: '', quantity: '', portion: 'cup' }
    ]);
  };

  const removeIngredientRow = (id) => {
    setModal({
      show: true,
      type: 'confirm',
      message: 'Are you sure you want to remove this ingredient row?',
      onConfirm: () => {
        setIngredients(prev => prev.filter(ing => ing.id !== id));
        setModal({ show: false, type: 'error', message: '', onConfirm: null });
      }
    });
  };

  const updateIngredient = (id, field, value) => {
    setIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const handleSave = async () => {
    if (!itemName.trim()) {
      setModal({
        show: true,
        type: 'error',
        message: 'Please enter an item name.',
        onConfirm: null
      });
      return;
    }
    if (!selectedCategory) {
      setModal({
        show: true,
        type: 'error',
        message: 'Please select a category.',
        onConfirm: null
      });
      return;
    }
    if (ingredients.some(ing => !ing.name || !ing.quantity)) {
      setModal({
        show: true,
        type: 'error',
        message: 'Please fill in all ingredient names and quantities.',
        onConfirm: null
      });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const ingredientsJson = ingredients.map(ing => ({
        name: ing.name,
        quantity: parseFloat(ing.quantity),
        unit: ing.portion
      }));

      const url = recipe ? `http://localhost:3000/api/recipes/${recipe.id}` : 'http://localhost:3000/api/recipes';
      const method = recipe ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: itemName.trim(),
          category: selectedCategory,
          description: '',
          prep_time: prepTime,
          cook_time: cookTime,
          servings: servings,
          ingredients_json: ingredientsJson,
          instructions: []
        })
      });

      if (!response.ok) throw new Error('Failed to save recipe');

      const savedRecipe = await response.json();
      console.log('Recipe saved:', savedRecipe);
      
      setNotification({
        type: 'success',
        message: 'Recipe saved successfully!'
      });
      
      setTimeout(() => {
        onSave();
      }, 1500);
    } catch (err) {
      setError(err.message);
      setModal({
        show: true,
        type: 'error',
        message: `Error saving recipe: ${err.message}`,
        onConfirm: null
      });
    } finally {
      setSaving(false);
    }
  };

  const [prepTime, setPrepTime] = useState(0);
  const [cookTime, setCookTime] = useState(0);
  const [servings, setServings] = useState(0);

  const closeModal = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    setModal({ show: false, type: 'error', message: '', onConfirm: null });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Ribbon Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-60 p-3 rounded-lg shadow-lg flex items-center justify-between ${
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

      {/* Error/Confirm Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
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

      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{recipe ? 'Edit Recipe' : 'Manual Recipe Entry'}</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Item Name</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter recipe name"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Item Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Category</option>
              <option value="Desserts">Desserts</option>
              <option value="Main Course">Main Course</option>
              <option value="Appetizers">Appetizers</option>
              <option value="Beverages">Beverages</option>
              <option value="Soups & Salads">Soups & Salads</option>
              <option value="Bread & Pastries">Bread & Pastries</option>
            </select>
          </div>

          {/* Prep Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Prep Time (minutes)</label>
            <input
              type="number"
              min="0"
              value={prepTime}
              onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., 15"
            />
          </div>

          {/* Cook Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Cook Time (minutes)</label>
            <input
              type="number"
              min="0"
              value={cookTime}
              onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., 30"
            />
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Servings</label>
            <input
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., 4"
            />
          </div>

          {/* Ingredients Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">Ingredients</h3>
              <button
                type="button"
                onClick={addIngredientRow}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                + Add Ingredient
              </button>
            </div>
            
            <div className="space-y-2">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(ingredient.id, 'quantity', e.target.value)}
                    className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="0"
                    step="0.1"
                  />
                  <select
                    value={ingredient.portion}
                    onChange={(e) => updateIngredient(ingredient.id, 'portion', e.target.value)}
                    className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {PORTION_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(ingredient.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManualRecipeEntry;
