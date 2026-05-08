import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification, RibbonNotification } from '../components/NotificationSystem';
import ConfirmationModal from '../components/ConfirmationModal';
import AddInvoiceModal from '../components/AddInvoiceModal';
import apiFetch from '../api';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ vendor_name: '' });
  const [notification, setNotification] = useNotification();
  const [deleteInvoiceId, setDeleteInvoiceId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await apiFetch(`http://localhost:3000/api/invoices?${queryParams}`);
      const data = await response.json();
      setInvoices(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const newFilters = { ...filters, [e.target.name]: e.target.value };
    setFilters(newFilters);
    // Auto-filter: fetch invoices whenever the filter changes
    const queryParams = new URLSearchParams(newFilters).toString();
    apiFetch(`http://localhost:3000/api/invoices?${queryParams}`)
      .then(res => res.json())
      .then(data => setInvoices(data))
      .catch(err => console.error('Error fetching invoices:', err));
  };

  const handleDeleteClick = (id) => {
    setDeleteInvoiceId(id);
  };

  const confirmDelete = async () => {
    if (!deleteInvoiceId) return;

    try {
      const res = await apiFetch(`http://localhost:3000/api/invoices/${deleteInvoiceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Invoice deleted successfully!' });
        fetchInvoices();
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error deleting invoice: ' + error.message });
    } finally {
      setDeleteInvoiceId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteInvoiceId(null);
  };

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div className="p-6">
      <RibbonNotification notification={notification} onClose={() => setNotification(null)} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Invoice
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          name="vendor_name"
          placeholder="Filter by vendor..."
          value={filters.vendor_name}
          onChange={handleFilterChange}
          className="border rounded px-3 py-2 w-full md:w-1/3"
        />
      </div>

      <table className="w-full border-collapse border" style={{minWidth: '1200px'}}>
        <thead>
          <tr className="bg-gray-400 text-white">
            <th className="border p-2 text-left">Invoice #</th>
            <th className="border p-2 text-left">Vendor</th>
            <th className="border p-2 text-left">Date</th>
            <th className="border p-2 text-left">Total</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(invoice => (
            <tr key={invoice.id} className="hover:bg-gray-50">
              <td className="border p-2">{invoice.invoice_number}</td>
              <td className="border p-2">{invoice.vendor_name}</td>
              <td className="border p-2">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
              <td className="border p-2">${(parseFloat(invoice.total_amount) || 0).toFixed(2)}</td>
              <td className="border p-2">
                <Link to={`/invoices/${invoice.id}`} className="text-blue-500 hover:underline mr-2">
                  View
                </Link>
                <Link to={`/invoices/${invoice.id}/edit`} className="text-green-500 hover:underline mr-2">
                  Edit
                </Link>
                <button 
                  onClick={() => handleDeleteClick(invoice.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No invoices found. <Link to="/invoices/new" className="text-blue-500">Create one now</Link>
        </div>
      )}

      {/* Add Invoice Modal */}
      <AddInvoiceModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteInvoiceId !== null}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDestructive={true}
      />
    </div>
  );
};

export default InvoiceList;
