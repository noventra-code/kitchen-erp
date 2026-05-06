import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

function ExamplePage() {
  const [items, setItems] = useState([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ]);
  
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    itemId: null,
    itemName: ''
  });

  const handleDeleteClick = (id, name) => {
    // Open confirmation dialog instead of using confirm()
    setDeleteConfirm({
      isOpen: true,
      itemId: id,
      itemName: name
    });
  };

  const handleDeleteConfirm = async () => {
    const { itemId } = deleteConfirm;
    
    try {
      // Replace with your actual API call
      // await axios.delete(`/api/items/${itemId}`);
      
      // For demo, just remove from state
      setItems(items.filter(item => item.id !== itemId));
      
      // Close dialog
      setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' });
      
      // Optional: Show success message
      console.log('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      // Handle error (show error message)
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Items List</h1>
      
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
            <span className="text-lg">{item.name}</span>
            <button
              onClick={() => handleDeleteClick(item.id, item.name)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteConfirm.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDestructive={true}
      />
    </div>
  );
}

export default ExamplePage;
