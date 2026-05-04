import { useState } from 'react';
import { Link } from 'react-router-dom';

function Recipes() {
  const [masterRecipes] = useState([
    { id: 1, name: 'Classic Margherita Pizza', prep_time: 30, cook_time: 15, description: 'A simple and delicious Neapolitan-style pizza' },
    { id: 2, name: 'Caesar Salad', prep_time: 15, cook_time: 0, description: 'Fresh romaine with homemade dressing' },
    { id: 3, name: 'Grilled Salmon', prep_time: 10, cook_time: 20, description: 'Perfectly grilled salmon with herbs' },
  ]);

  const [myRecipes] = useState([
    { id: 1, name: 'My Margherita Pizza (Modified)', prep_time: 35, cook_time: 12, description: 'Modified version with extra basil' },
  ]);

  const handleClone = (id) => {
    alert(`Cloning recipe ${id} to your kitchen...`);
    // Will call backend API
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + Add New Recipe
        </button>
      </div>

      {/* My Recipes Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">My Kitchen</h2>
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
                <button className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                <button className="text-sm text-red-600 hover:text-red-800">Delete</button>
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
}

export default Recipes;
