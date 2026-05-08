import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import InvoiceForm from '../components/InvoiceForm';
import { useNotification, RibbonNotification } from '../components/NotificationSystem';
import apiFetch from '../api';

const InvoiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useNotification();

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`http://localhost:3000/api/invoices/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        setNotification({ type: 'error', message: 'Invoice not found' });
        setTimeout(() => navigate('/invoices'), 2000);
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error fetching invoice: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`http://localhost:3000/api/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice_number: formData.invoice_number,
          vendor_name: formData.vendor_name,
          invoice_date: formData.invoice_date,
          status: formData.status,
          subtotal: formData.subtotal,
          tax_amount: formData.tax_amount,
          total_amount: formData.total_amount,
          line_items: formData.line_items
        })
      });
      
      if (response.ok) {
        setNotification({ type: 'success', message: 'Invoice updated successfully!' });
        setTimeout(() => navigate(`/invoices/${id}`), 1500);
      } else {
        const errorData = await response.json();
        setNotification({ type: 'error', message: errorData.error || 'Failed to update invoice' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error updating invoice: ' + error.message });
    }
  };

  if (loading) return <div className="p-6">Loading invoice...</div>;
  if (!invoice) return <div className="p-6">Invoice not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <RibbonNotification notification={notification} onClose={() => setNotification(null)} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Invoice {invoice.invoice_number}</h1>
        <Link 
          to={`/invoices/${id}`}
          className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      <InvoiceForm 
        initialData={invoice} 
        onSubmit={handleSave}
        submitText="Update Invoice"
      />
    </div>
  );
};

export default InvoiceEdit;
