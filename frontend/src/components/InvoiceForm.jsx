import React, { useState, useEffect, useRef } from 'react';
import ProcessingModal from './ProcessingModal';
import apiFetch from '../api';

const InvoiceForm = ({ initialData = {}, onSubmit, submitText = 'Create Invoice', mode = 'manual' }) => {
  // Format invoice_date to YYYY-MM-DD for the date input
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
      return date.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const [formData, setFormData] = useState({
    invoice_number: initialData.invoice_number || '',
    vendor_name: initialData.vendor_name || '',
    invoice_date: formatDate(initialData.invoice_date),
    subtotal: initialData.subtotal || 0,
    tax_amount: initialData.tax_amount || 0,
    total_amount: initialData.total_amount || 0,
    line_items: initialData.line_items || []
  });

  const [file, setFile] = useState(null);
  const [notification, setNotification] = useState(null);
  const [savedLineItems, setSavedLineItems] = useState([]);
  const [ocrText, setOcrText] = useState('');
  const previewRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
  const [importComplete, setImportComplete] = useState(false);
  const fileInputRef = useRef(null);

  // Sorting functions
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'none';
    }
    setSortConfig({ key, direction });
  };

  const getSortedItems = (items) => {
    const { key, direction } = sortConfig;
    if (direction === 'none' || !key) return items;
    
    return [...items].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];
      
      if (key === 'quantity' || key === 'unit_price' || key === 'line_total') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '↕';
    if (sortConfig.direction === 'ascending') return '↑';
    if (sortConfig.direction === 'descending') return '↓';
    return '↕';
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const lineTotalSum = formData.line_items.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const tax = parseFloat(formData.tax_amount) || 0;
    const newTotal = lineTotalSum + tax;
    setFormData(prev => ({ ...prev, total_amount: parseFloat(newTotal.toFixed(2)) }));
  }, [formData.line_items, formData.tax_amount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(newLineItems[index].quantity) || 0;
      const price = parseFloat(newLineItems[index].unit_price) || 0;
      newLineItems[index].line_total = parseFloat((qty * price).toFixed(2));
    }
    setFormData({ ...formData, line_items: newLineItems });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0, line_total: 0 }]
    });
    setSavedLineItems([...savedLineItems, false]);
  };

  const removeLineItem = (index) => {
    const newLineItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: newLineItems });
    const newSaved = savedLineItems.filter((_, i) => i !== index);
    setSavedLineItems(newSaved);
  };

  const saveLineItem = (index) => {
    setNotification({ type: 'success', message: `Line item ${index + 1} saved successfully!` });
    setSavedLineItems(prev => {
      const newSaved = [...prev];
      newSaved[index] = true;
      return newSaved;
    });
  };

  const isLineItemComplete = (index) => {
    const item = formData.line_items[index];
    if (!item) return false;
    return item.description.trim() !== '' && item.quantity > 0 && item.unit_price >= 0;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) { setFile(null); return; }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.ms-excel'];
    const isCSV = selectedFile.name.toLowerCase().endsWith('.csv') || validTypes.includes(selectedFile.type);
    if (!isCSV && !validTypes.includes(selectedFile.type)) {
      setNotification({ type: 'error', message: 'Please upload an image file (JPEG, PNG, TIFF, BMP, WebP), PDF, or CSV document.' });
      e.target.value = '';
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const downloadCSVTemplate = () => {
    const csvContent = 'Invoice Number,Vendor Name,Invoice Date,Description,Quantity,Unit Price,Pack Size\n' +
      'INV-2024-001,Sample Vendor,2024-01-15,Ground Beef 80/20,10,45.50,10 lbs\n' +
      'INV-2024-001,Sample Vendor,2024-01-15,Chicken Breast Boneless,5,62.00,5 lbs\n' +
      'INV-2024-001,Sample Vendor,2024-01-15,Pork Shoulder Bone-In,3,38.75,8 lbs\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'invoice_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseBenEKeithInvoice = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
      invoice_number: '', invoice_date: '', order_no: '',
      vendor_name: 'Ben E. Keith', line_items: [], subtotal: 0, tax_amount: 0, total_amount: 0
    };

    // Extract invoice number
    const invMatch = text.match(/Invoice\s+No[\s\S]{0,100}?(\d{8})/i);
    if (invMatch) result.invoice_number = invMatch[1];

    // Extract date
    const dateMatch = text.match(/Date\s+([\d]{1,2}[\/\\-][\d]{1,2}[\/\\-][\d]{4})/i);
    if (dateMatch) {
      const parts = dateMatch[1].split(/[\/\\-]/);
      if (parts.length === 3) {
        result.invoice_date = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
      }
    }

    // Extract order number
    const orderMatch = text.match(/Order\s+No\s+([\d]+)/i);
    if (orderMatch) result.order_no = orderMatch[1];

    // Extract total
    const totalMatch = text.match(/Total\s+Invoice[\s\S]{0,50}?([\d,]+\.\d{2})/i);
    if (totalMatch) result.total_amount = parseFloat(totalMatch[1].replace(',', ''));

    // Extract tax
    const taxMatch = text.match(/Tax\s*\n?\s*([\d,]+\.\d{2})/i);
    if (taxMatch) result.tax_amount = parseFloat(taxMatch[1].replace(',', ''));

    // Parse line items
    for (let line of lines) {
      if (line.match(/Line\s+Location|Section\s+Total|Total\s+Qty|====|COOLER|DRY|FROZEN|Total\s+Invoice|Fuel\s+Charge|CASES\s+PKG|INVOICE|Ship\s+To|--\s*\d+\s+of/i)) {
        continue;
      }

      const parts = line.split('\t').map(p => p.trim()).filter(p => p);
      if (parts.length < 9) continue;
      
      const lineNum = parts[0];
      if (!/^\d+$/.test(lineNum)) continue;
      
      let qty, desc, price, amount, packSize;
      let priceIdx = -1, amountIdx = -1;
      
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].match(/^\d+\.\d{2}$/)) {
          if (amountIdx === -1) {
            amountIdx = i;
          } else if (priceIdx === -1) {
            priceIdx = i;
          }
        }
      }
      
      if (priceIdx === -1 || amountIdx === -1) continue;
      
      price = parseFloat(parts[priceIdx]);
      amount = parseFloat(parts[amountIdx]);
      desc = parts[priceIdx - 1];
      packSize = parts[priceIdx - 2] || '';
      
      let casesValue = parts[2];
      if (casesValue === '*') {
        casesValue = parts[3];
      }
      qty = parseInt(casesValue) || 1;
     
      if (desc && !isNaN(price) && !isNaN(amount) && desc.length > 2) {
        result.line_items.push({
          line_number: lineNum,
          description: desc,
          pack_size: packSize || '',
          quantity: qty,
          unit_price: price,
          line_total: amount,
          package_type: ''
        });
      }
    }

    return result;
  };

  const processInvoiceWithOCR = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStage('uploading');

    try {
      const formDataObj = new FormData();
      formDataObj.append('invoice', file);

      setProcessingProgress(20);
      setProcessingStage('uploading');

      const response = await apiFetch('http://localhost:3000/api/ocr/process', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });

      setProcessingProgress(60);
      setProcessingStage('processing');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }

      const { text, data } = await response.json();
      setOcrText(text || '');

      setProcessingProgress(80);
      setProcessingStage('parsing');

      if (data) {
        setFormData(prev => ({
          ...prev,
          invoice_number: data.invoice_number || prev.invoice_number,
          vendor_name: data.vendor_name || prev.vendor_name,
          invoice_date: data.invoice_date || prev.invoice_date,
          subtotal: data.subtotal || 0,
          tax_amount: data.tax_amount || 0,
          total_amount: data.total_amount || 0,
          line_items: data.line_items.length > 0 ? data.line_items : prev.line_items
        }));
        setNotification({ type: 'success', message: 'CSV invoice processed successfully!' });
      } else {
        const isBenEKeith = text.toLowerCase().includes('ben e. keith') || text.toLowerCase().includes('ben e keith');
        if (isBenEKeith) {
          const parsedData = parseBenEKeithInvoice(text);
          setFormData(prev => ({
            ...prev,
            invoice_number: parsedData.invoice_number || prev.invoice_number,
            vendor_name: parsedData.vendor_name,
            invoice_date: parsedData.invoice_date || prev.invoice_date,
            subtotal: parsedData.subtotal || 0,
            tax_amount: parsedData.tax_amount || 0,
            total_amount: parsedData.total_amount || 0,
            line_items: parsedData.line_items.length > 0 ? parsedData.line_items : prev.line_items
          }));
          setNotification({ type: 'success', message: 'Ben E. Keith invoice processed successfully!' });
        } else {
          const genericData = { invoice_number: '', vendor_name: '', invoice_date: '', subtotal: 0, tax_amount: 0, total_amount: 0, line_items: [] };
          const invMatch = text.match(/invoice\s*#?\s*:?\s*([A-Za-z0-9\\-]+)/i);
          if (invMatch) genericData.invoice_number = invMatch[1];
          const dateMatch = text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
          if (dateMatch) {
            const parts = dateMatch[1].split(/[-\/]/);
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              let year = parts[2];
              if (year.length === 2) year = '20' + year;
              genericData.invoice_date = `${year}-${month}-${day}`;
            }
          }
          const totalMatch = text.match(/total\s*[:\s]*\$?\s*(\d+\.?\d*)/i);
          if (totalMatch) genericData.total_amount = parseFloat(totalMatch[1]);
          setFormData(prev => ({
            ...prev,
            invoice_number: genericData.invoice_number || prev.invoice_number,
            invoice_date: genericData.invoice_date || prev.invoice_date,
            total_amount: genericData.total_amount || prev.total_amount
          }));
          setNotification({ type: 'success', message: 'Invoice processed. Please verify the extracted details below.' });
        }
      }

      setProcessingProgress(100);
      setProcessingStage('complete');
      setImportComplete(true);

      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      setTimeout(() => setIsProcessing(false), 1500);
    } catch (error) {
      console.error('OCR Error:', error);
      setNotification({ type: 'error', message: 'Failed to process invoice: ' + error.message });
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'import' && file) {
      await processInvoiceWithOCR();
    } else {
      onSubmit({
        invoice_number: formData.invoice_number,
        vendor_name: formData.vendor_name,
        invoice_date: formData.invoice_date,
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        total_amount: formData.total_amount,
        line_items: formData.line_items
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-4xl mx-auto">
      <ProcessingModal isOpen={isProcessing} progress={processingProgress} stage={processingStage} onClose={() => setIsProcessing(false)} />

      {notification && (
        <div className={`mb-4 p-3 rounded-lg shadow-lg flex items-center justify-between ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{notification.message}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="text-white hover:text-gray-200">✕</button>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'import' && (
        <div className="mb-6">
          <div className="mb-4">
            <button
              type="button"
              onClick={downloadCSVTemplate}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-2"
            >
              ⬇ Download CSV Template
            </button>
            <p className="text-sm text-gray-600">Use this template to format your CSV file correctly</p>
          </div>
          <div className="mb-4">
            <label className="block mb-2">Upload Invoice File</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/tiff,image/bmp,image/webp,application/pdf,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              onClick={() => fileInputRef.current?.click()}
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer"
            >
              📁 Choose File
            </label>
            {file && <span className="ml-3 text-sm text-gray-600">{file.name}</span>}
          </div>
          <p className="text-sm text-gray-500">Supported formats: JPEG, PNG, TIFF, BMP, WebP, PDF, CSV</p>
          {file && (
            <button type="submit" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Process Invoice
            </button>
          )}
        </div>
      )}

      {/* Manual Entry Form Fields */}
      {mode === 'manual' && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-1">Invoice Number <span className="text-red-500">*</span></label>
            <input type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} required className="border rounded px-3 py-2 w-full" placeholder="Required" />
          </div>
          <div>
            <label className="block mb-1">Vendor Name <span className="text-red-500">*</span></label>
            <input type="text" name="vendor_name" value={formData.vendor_name} onChange={handleChange} required className="border rounded px-3 py-2 w-full" placeholder="Required" />
          </div>
          <div>
            <label className="block mb-1">Invoice Date <span className="text-red-500">*</span></label>
            <input type="date" name="invoice_date" value={formData.invoice_date} onChange={handleChange} required className="border rounded px-3 py-2 w-full" />
          </div>
        </div>
      )}

      {/* Line Items Section - Show if manual mode OR import complete */}
      {(mode === 'manual' || importComplete) && (
        <>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Line Items</h3>
          
          {/* Table styling */}
          <style>{`
            .styled-table {
              border-collapse: collapse;
              margin: 25px 0;
              font-size: 0.9em;
              font-family: sans-serif;
              width: 100%;
              box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
            }
            .styled-table thead tr {
              background-color: #999999;
              color: #ffffff;
              text-align: left;
              font-weight: bold;
            }
            .styled-table th,
            .styled-table td {
              padding: 12px 15px;
            }
            .styled-table tbody tr {
              border-bottom: 1px solid #dddddd;
            }
            .styled-table tbody tr:nth-of-type(even) {
              background-color: #f3f3f3;
            }
            .styled-table tbody tr:last-of-type {
              border-bottom: 2px solid #999999;
            }
            .styled-table tbody tr:hover {
              background-color: #e8e8e8;
            }
            .sortable-header {
              cursor: pointer;
              user-select: none;
            }
            .sortable-header:hover {
              background-color: #777777;
            }
          `}</style>
          
          <table className="styled-table">
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => requestSort('line_number')} style={{width: '60px'}}>Line # {getSortIndicator('line_number')}</th>
                <th className="sortable-header" onClick={() => requestSort('description')}>Description {getSortIndicator('description')}</th>
                <th className="sortable-header" onClick={() => requestSort('quantity')} style={{width: '60px'}}>Cases {getSortIndicator('quantity')}</th>
                <th style={{width: '80px'}}>Pack Size</th>
                <th className="sortable-header" onClick={() => requestSort('unit_price')} style={{width: '70px'}}>Unit Price {getSortIndicator('unit_price')}</th>
                <th style={{width: '80px'}}>Line Total</th>
                <th style={{width: '70px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedItems(formData.line_items).map((item, index) => (
                <tr key={index}>
                  <td><input type="text" value={item.line_number || ''} readOnly className="bg-gray-100 text-xs border-0" style={{width: '60px'}} /></td>
                  <td><input type="text" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} required className="text-xs border-0 w-full" placeholder="Item description (required)" /></td>
                  <td><input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))} required min="0" step="0.001" className="text-xs border-0" style={{width: '60px'}} /></td>
                  <td><input type="text" value={item.pack_size || ''} readOnly className="bg-gray-100 text-xs border-0" style={{width: '80px'}} /></td>
                  <td><input type="number" value={item.unit_price} onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))} required min="0" step="0.01" className="text-xs border-0" style={{width: '70px'}} /></td>
                  <td><input type="number" value={parseFloat(item.line_total || 0).toFixed(2)} readOnly className="bg-gray-100 text-xs border-0" style={{width: '80px'}} /></td>
                  <td style={{width: '70px'}}>
                    <div className="flex gap-1">
                      {isLineItemComplete(index) && !savedLineItems[index] && (
                        <button type="button" onClick={() => saveLineItem(index)} className="text-green-500 hover:text-green-700 text-xs font-medium">✓ Save</button>
                      )}
                      <button type="button" onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 text-xs font-medium">✗ Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button type="button" onClick={addLineItem} className="mt-4 text-blue-500 hover:text-blue-700">+ Add Line Item</button>

          {/* Save Button */}
          <div className="mt-6">
            <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600">
              {submitText}
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default InvoiceForm;
