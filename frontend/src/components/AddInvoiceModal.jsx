import React from 'react';
import { useNavigate } from 'react-router-dom';

const AddInvoiceModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleManual = () => {
    onClose();
    navigate('/invoices/new?mode=manual');
  };

  const handleImport = () => {
    onClose();
    navigate('/invoices/new?mode=import');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Add New Invoice</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">Choose how you would like to add an invoice:</p>
        
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleManual}
            className="w-full p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-left"
          >
            <div className="flex items-center">
              <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">Create New Invoice</h3>
                <p className="text-sm text-gray-500">Enter invoice details by hand</p>
              </div>
            </div>
          </button>
          
          <button
            type="button"
            onClick={handleImport}
            className="w-full p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors text-left"
          >
            <div className="flex items-center">
              <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">Import New Invoice</h3>
                <p className="text-sm text-gray-500">Upload a PDF invoice or CSV file</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddInvoiceModal;
