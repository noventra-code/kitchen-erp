import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotification, RibbonNotification, useModal, Modal } from '../components/NotificationSystem';

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useNotification();
  const { modal, showError, showConfirm, closeModal, hideModal } = useModal();

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/invoices/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        showError('Invoice not found');
        setTimeout(() => navigate('/invoices'), 2000);
      }
    } catch (error) {
      showError('Error fetching invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Invoice deleted successfully!' });
        hideModal();
        setTimeout(() => navigate('/invoices'), 1500);
      }
    } catch (error) {
      showError('Error deleting invoice: ' + error.message);
    }
  };

  if (loading) return <div className="p-6">Loading invoice...</div>;
  if (!invoice) return <div className="p-6">Invoice not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <RibbonNotification notification={notification} onClose={() => setNotification(null)} />
      <Modal modal={modal} onClose={closeModal} onCancel={hideModal} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
        <div className="space-x-3">
          <Link 
            to={`/invoices/${id}/edit`}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Edit
          </Link>
          <button
            onClick={() => navigate('/invoices')}
            className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Vendor</span>
            <p className="text-lg font-medium">{invoice.vendor_name}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Invoice Number</span>
            <p className="text-lg font-medium">{invoice.invoice_number}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Invoice Date</span>
            <p className="text-lg">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Line Items</h2>
        {invoice.line_items && invoice.line_items.length > 0 ? (
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-left">Quantity</th>
                <th className="border p-2 text-left">Unit Price</th>
                <th className="border p-2 text-left">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border p-2">{item.description || 'N/A'}</td>
                  <td className="border p-2">{item.quantity}</td>
                  <td className="border p-2">${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                  <td className="border p-2">${parseFloat(item.line_total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No line items found.</p>
        )}
      </div>

      {/* Totals */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Totals</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span>${parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax:</span>
            <span>${parseFloat(invoice.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span>${parseFloat(invoice.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            showConfirm(
              'Are you sure you want to delete this invoice? This action cannot be undone.',
              handleDelete
            );
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Delete Invoice
        </button>
      </div>
    </div>
  );
};

export default InvoiceView;
