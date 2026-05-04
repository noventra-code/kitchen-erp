import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Recipes() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-6xl mb-4">🍳</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Under Construction</h1>
      <p className="text-gray-600">The Recipes page is currently being built.</p>
      <Link 
        to="/dashboard" 
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

export default Recipes;
