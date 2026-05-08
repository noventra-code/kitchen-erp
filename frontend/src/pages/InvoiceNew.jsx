import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InvoiceForm from '../components/InvoiceForm';
import apiFetch from '../api';

const InvoiceNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState(null);
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

  // Get mode from URL params
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode') || 'manual';

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('http://localhost:3000/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice_number: formData.invoice_number,
          vendor_name: formData.vendor_name,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          subtotal: formData.subtotal,
          tax_amount: formData.tax_amount,
          total_amount: formData.total_amount,
          line_items: formData.line_items
        })
      });

      if (response.ok) {
        const savedInvoice = await response.json();
        setNotification({
          type: 'success',
          message: 'Invoice saved successfully!'
        });
        // Navigate to the invoice view page to see the imported invoice
        setTimeout(() => {
          navigate(`/invoices/${savedInvoice.id}`);
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorModal({
          show: true,
          message: errorData.error || `Failed to save invoice (HTTP ${response.status})`
        });
      }
    } catch (error) {
      console.error('Create invoice error:', error);
      setErrorModal({
        show: true,
        message: 'Network error: Failed to save invoice. Please try again.'
      });
    }
  };

  const closeErrorModal = () => {
    setErrorModal({ show: false, message: '' });
  };

  return (
    <div>
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
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Error</h3>
            </div>
            <p className="text-gray-700 mb-6">{errorModal.message}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeErrorModal}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold p-6 pb-0">{mode === 'import' ? 'Import New Invoice' : 'Create New Invoice'}</h1>
      <InvoiceForm onSubmit={handleSubmit} submitText="Save Invoice" mode={mode} />
    </div>
  );
};

export default InvoiceNew;
