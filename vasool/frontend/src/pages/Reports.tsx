import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  FileText, 
  Calendar, 
  Download, 
  ArrowRight, 
  Users, 
  Search, 
  AlertCircle,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CustomerSummary {
  id: number;
  customer_name: string;
  mobile_number: string;
}

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('collection'); // collection, due, overdue, ledger
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    // Default to first day of current month
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Load customer list for ledger dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('/api/customers');
        setCustomers(response.data.map((c: any) => ({
          id: c.id,
          customer_name: c.customer_name,
          mobile_number: c.mobile_number
        })));
      } catch (err) {
        console.error('Failed to load customer list:', err);
      }
    };
    fetchCustomers();
  }, []);

  const handleGenerateReport = async () => {
    setError('');
    setLoading(true);
    setReportData([]);
    setLedgerSummary(null);

    try {
      // Log generation in DB
      await api.post('/api/reports/log', {
        report_type: reportType,
        date_from: dateFrom,
        date_to: dateTo
      });

      if (reportType === 'collection') {
        const res = await api.get('/api/reports/collection', {
          params: { date_from: dateFrom, date_to: dateTo }
        });
        setReportData(res.data);
      } else if (reportType === 'due') {
        const res = await api.get('/api/reports/due', {
          params: { date_from: dateFrom, date_to: dateTo }
        });
        setReportData(res.data);
      } else if (reportType === 'overdue') {
        const res = await api.get('/api/reports/overdue', {
          params: { date_from: dateFrom, date_to: dateTo }
        });
        setReportData(res.data);
      } else if (reportType === 'ledger') {
        if (!selectedCustomerId) {
          setError('Please select a customer to generate their ledger report.');
          setLoading(false);
          return;
        }
        const res = await api.get(`/api/reports/ledger/${selectedCustomerId}`);
        setLedgerSummary(res.data);
        // Map ledger payments to report data
        setReportData(res.data.payments);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error generating report details.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  // ----------------------------------------------------
  // EXPORT CSV
  // ----------------------------------------------------
  const handleExportCSV = () => {
    if (reportData.length === 0 && !ledgerSummary) return;

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `Vasool_${reportType}_Report.csv`;

    if (reportType === 'collection') {
      headers = ['Payment ID', 'Payment Date', 'Customer Name', 'Mobile Number', 'Method', 'Ref No', 'Amount Paid', 'Remarks'];
      rows = reportData.map(item => [
        item.id,
        new Date(item.payment_date).toLocaleDateString('en-IN'),
        item.customer_name,
        item.mobile_number,
        item.payment_method,
        item.reference_number || 'N/A',
        item.payment_amount,
        item.remarks || ''
      ]);
    } else if (reportType === 'due') {
      headers = ['Customer Name', 'Mobile', 'Product bought', 'Due Date', 'Total Amount', 'Paid Amount', 'Remaining Due', 'Status'];
      rows = reportData.map(item => [
        item.customer_name,
        item.mobile_number,
        item.product_name || '',
        new Date(item.due_date).toLocaleDateString('en-IN'),
        item.total_amount,
        item.amount_paid,
        item.remaining_due,
        item.status
      ]);
    } else if (reportType === 'overdue') {
      headers = ['Customer Name', 'Mobile', 'Product bought', 'Due Date', 'Remaining Due', 'Status'];
      rows = reportData.map(item => [
        item.customer_name,
        item.mobile_number,
        item.product_name || '',
        new Date(item.due_date).toLocaleDateString('en-IN'),
        item.remaining_due,
        item.status
      ]);
    } else if (reportType === 'ledger' && ledgerSummary) {
      headers = ['Transaction Date', 'Type', 'Details / Ref', 'Debit (+)', 'Credit (-)'];
      
      // Seed purchase row
      const cust = ledgerSummary.customer;
      rows.push([
        new Date(cust.purchase_date).toLocaleDateString('en-IN'),
        'Purchase Bill',
        `${cust.product_name} (${cust.product_category})`,
        cust.total_amount,
        '0'
      ]);

      // Seed payments rows
      ledgerSummary.payments.forEach((pay: any) => {
        rows.push([
          new Date(pay.payment_date).toLocaleDateString('en-IN'),
          `Receipt (${pay.payment_method})`,
          pay.reference_number || '',
          '0',
          pay.payment_amount
        ]);
      });

      if (ledgerSummary.fine > 0) {
        rows.push([
          new Date().toLocaleDateString('en-IN'),
          'Overdue Fine',
          `Late by ${ledgerSummary.daysOverdue} days`,
          String(ledgerSummary.fine),
          '0'
        ]);
      }
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // EXPORT PDF (jsPDF + AutoTable)
  // ----------------------------------------------------
  const handleExportPDF = () => {
    if (reportData.length === 0 && !ledgerSummary) return;

    const doc = new jsPDF({ orientation: 'portrait' });
    const generatedTime = new Date().toLocaleString('en-IN');

    // Fetch dynamic settings from local storage or default to store names
    const savedUser = localStorage.getItem('vasool_user');
    const ownerName = savedUser ? JSON.parse(savedUser).owner_name : 'Shop Owner';

    // 1. Render Professional Invoice Header
    doc.setFillColor(15, 23, 42); // slate-900 background for top banner
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('VASOOL ENTERPRISES', 15, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 255);
    doc.text(`Shop Statement • Proprietor: ${ownerName}`, 15, 25);

    // Document Info on right
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('STATEMENT OF ACCOUNT', 145, 15, { align: 'left' });
    doc.setFontSize(8);
    doc.setTextColor(190, 190, 190);
    doc.text(`Generated: ${generatedTime}`, 145, 22, { align: 'left' });

    // 2. Report metadata summary
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 38, 180, 15, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    
    const formattedRange = `${new Date(dateFrom).toLocaleDateString('en-IN')} to ${new Date(dateTo).toLocaleDateString('en-IN')}`;
    
    if (reportType === 'collection') {
      doc.text(`Report Type: Collection Summary (Receipts Journal)`, 20, 47);
      doc.text(`Range: ${formattedRange}`, 130, 47);
    } else if (reportType === 'due') {
      doc.text(`Report Type: Outstanding Accounts Receivable`, 20, 47);
      doc.text(`Range: ${formattedRange}`, 130, 47);
    } else if (reportType === 'overdue') {
      doc.text(`Report Type: Delinquent & Overdue Customers`, 20, 47);
      doc.text(`Range: ${formattedRange}`, 130, 47);
    } else if (reportType === 'ledger' && ledgerSummary) {
      doc.text(`Report Type: Ledger Audit Account Statement`, 20, 47);
      doc.text(`Client: ${ledgerSummary.customer.customer_name}`, 130, 47);
    }

    // 3. Draw table using autoTable
    if (reportType === 'collection') {
      const headers = [['Date', 'Receipt ID', 'Customer Name', 'Mobile', 'Method', 'Ref No', 'Amount']];
      const body = reportData.map(item => [
        new Date(item.payment_date).toLocaleDateString('en-IN'),
        `REC-${item.id}`,
        item.customer_name,
        item.mobile_number,
        item.payment_method,
        item.reference_number || '-',
        formatCurrency(item.payment_amount)
      ]);

      const sum = reportData.reduce((acc, curr) => acc + Number(curr.payment_amount), 0);
      body.push(['', '', '', '', '', 'Total Received:', formatCurrency(sum)]);

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        footStyles: { fontStyle: 'bold' }
      });
    } else if (reportType === 'due') {
      const headers = [['Customer Name', 'Mobile', 'Product', 'Due Date', 'Total Cost', 'Paid', 'Outstanding']];
      const body = reportData.map(item => [
        item.customer_name,
        item.mobile_number,
        item.product_name || '-',
        new Date(item.due_date).toLocaleDateString('en-IN'),
        formatCurrency(item.total_amount),
        formatCurrency(item.amount_paid),
        formatCurrency(item.remaining_due)
      ]);

      const totalOutstanding = reportData.reduce((acc, curr) => acc + Number(curr.remaining_due), 0);
      body.push(['', '', '', '', '', 'Total Dues:', formatCurrency(totalOutstanding)]);

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        footStyles: { fontStyle: 'bold' }
      });
    } else if (reportType === 'overdue') {
      const headers = [['Customer Name', 'Mobile', 'Product bought', 'Due Date', 'Outstanding Balance']];
      const body = reportData.map(item => [
        item.customer_name,
        item.mobile_number,
        item.product_name || '-',
        new Date(item.due_date).toLocaleDateString('en-IN'),
        formatCurrency(item.remaining_due)
      ]);

      const totalOverdue = reportData.reduce((acc, curr) => acc + Number(curr.remaining_due), 0);
      body.push(['', '', '', 'Total Overdue:', formatCurrency(totalOverdue)]);

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94] }, // Red header for overdue
        styles: { fontSize: 8 }
      });
    } else if (reportType === 'ledger' && ledgerSummary) {
      // Write customer summary info before autoTable
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 110, 125);
      doc.text(`Mobile: ${ledgerSummary.customer.mobile_number}`, 15, 62);
      doc.text(`Email: ${ledgerSummary.customer.email || 'N/A'}`, 15, 67);
      doc.text(`Product Bought: ${ledgerSummary.customer.product_name || 'N/A'} (${ledgerSummary.customer.product_category || 'N/A'})`, 15, 72);
      doc.text(`Due Date: ${ledgerSummary.customer.due_date ? new Date(ledgerSummary.customer.due_date).toLocaleDateString('en-IN') : 'N/A'}`, 15, 77);

      const headers = [['Transaction Date', 'Journal Event', 'Ref / Memo Details', 'Debit (+)', 'Credit (-)']];
      const body: any[][] = [];

      // Add purchase bill
      body.push([
        new Date(ledgerSummary.customer.purchase_date).toLocaleDateString('en-IN'),
        'Purchase Entry',
        'Initial product cost setup',
        formatCurrency(ledgerSummary.customer.total_amount),
        '-'
      ]);

      // Add individual payments
      ledgerSummary.payments.forEach((pay: any) => {
        body.push([
          new Date(pay.payment_date).toLocaleDateString('en-IN'),
          `Receipt (${pay.payment_method})`,
          pay.reference_number ? `Ref: ${pay.reference_number}` : 'Cash check',
          '-',
          formatCurrency(pay.payment_amount)
        ]);
      });

      // Add fine if exists
      if (ledgerSummary.fine > 0) {
        body.push([
          new Date().toLocaleDateString('en-IN'),
          'Overdue Fine charge',
          `Late by ${ledgerSummary.daysOverdue} days`,
          formatCurrency(ledgerSummary.fine),
          '-'
        ]);
      }

      // Add final balances row
      body.push([
        '', 
        '', 
        'Summary Totals:', 
        formatCurrency(Number(ledgerSummary.customer.total_amount) + Number(ledgerSummary.fine)), 
        formatCurrency(ledgerSummary.customer.amount_paid)
      ]);

      body.push([
        '', 
        '', 
        'Final Balance Due (Payable):', 
        '', 
        formatCurrency(ledgerSummary.finalPayable)
      ]);

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 85,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
      });
    }

    doc.save(`Vasool_${reportType}_Statement.pdf`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Reports & Audits</h1>
        <p className="text-slate-500 text-sm mt-1">Export transaction histories, aging receivables, and collection logs.</p>
      </div>

      {/* Query Filters Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-800 font-display flex items-center space-x-2">
          <FileText size={18} className="text-indigo-600" />
          <span>Select Audit Filter parameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportData([]);
                setLedgerSummary(null);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 rounded-xl outline-none text-xs font-semibold"
            >
              <option value="collection">Collection Report (Receipts Journal)</option>
              <option value="due">Due Report (Outstanding Balances)</option>
              <option value="overdue">Overdue Report (Overdue Accounts)</option>
              <option value="ledger">Ledger Audit Statement</option>
            </select>
          </div>

          {/* Conditional Dropdown for Customer selection */}
          {reportType === 'ledger' ? (
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 rounded-xl outline-none text-xs font-semibold"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer_name} ({c.mobile_number})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              {/* Date From */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 rounded-xl outline-none text-xs"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 rounded-xl outline-none text-xs"
                />
              </div>
            </>
          )}

          {/* Submit button */}
          <button
            onClick={handleGenerateReport}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2"
          >
            <span>Run Query</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Report Data display card */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Running SQL calculations...</p>
        </div>
      ) : reportData.length === 0 && !ledgerSummary ? (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-16 text-center text-slate-400 text-xs">
          Select parameters and click "Run Query" to generate and audit data.
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden space-y-4">
          {/* Table Header controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h4 className="font-bold text-slate-800 font-display text-sm">Generated Statement Result</h4>
              <p className="text-slate-400 text-xs mt-0.5">Found {reportData.length} records in this query.</p>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <FileSpreadsheet size={15} />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto justify-center"
              >
                <Download size={15} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Ledger-specific detail panel */}
          {reportType === 'ledger' && ledgerSummary && (
            <div className="px-6 py-4 bg-indigo-50/45 border-y border-indigo-100/50 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Contact Number:</span>
                <span className="font-bold text-slate-700 block mt-0.5">{ledgerSummary.customer.mobile_number}</span>
              </div>
              <div>
                <span className="text-slate-500">Net Outstanding:</span>
                <span className="font-extrabold text-rose-600 block mt-0.5">{formatCurrency(ledgerSummary.customer.remaining_due)}</span>
              </div>
              <div>
                <span className="text-slate-500">Accumulated Fine:</span>
                <span className="font-bold text-amber-600 block mt-0.5">{formatCurrency(ledgerSummary.fine)} ({ledgerSummary.daysOverdue} days late)</span>
              </div>
              <div>
                <span className="text-slate-500">Final Payable Sum:</span>
                <span className="font-extrabold text-indigo-700 block mt-0.5">{formatCurrency(ledgerSummary.finalPayable)}</span>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto">
            {reportType === 'collection' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">Payment Date</th>
                    <th className="py-3 px-6">Receipt ID</th>
                    <th className="py-3 px-6">Customer Name</th>
                    <th className="py-3 px-6">Mobile Number</th>
                    <th className="py-3 px-6">Method</th>
                    <th className="py-3 px-6">Reference No</th>
                    <th className="py-3 px-6 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-55/35">
                      <td className="py-3 px-6 text-xs text-slate-500">{new Date(item.payment_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-6 font-semibold text-slate-600 text-xs">REC-{item.id}</td>
                      <td className="py-3 px-6 font-semibold text-slate-700 font-display">{item.customer_name}</td>
                      <td className="py-3 px-6 text-slate-500 text-xs">{item.mobile_number}</td>
                      <td className="py-3 px-6 text-slate-600 text-xs">{item.payment_method}</td>
                      <td className="py-3 px-6 text-slate-500 text-xs font-mono">{item.reference_number || '-'}</td>
                      <td className="py-3 px-6 text-right text-emerald-600 font-bold">{formatCurrency(item.payment_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'due' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">Customer Name</th>
                    <th className="py-3 px-6">Mobile Number</th>
                    <th className="py-3 px-6">Product Bought</th>
                    <th className="py-3 px-6">Due Date</th>
                    <th className="py-3 px-6 text-right">Total Cost</th>
                    <th className="py-3 px-6 text-right">Amount Paid</th>
                    <th className="py-3 px-6 text-right">Remaining Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-55/35">
                      <td className="py-3 px-6 font-semibold text-slate-700 font-display">{item.customer_name}</td>
                      <td className="py-3 px-6 text-slate-500 text-xs">{item.mobile_number}</td>
                      <td className="py-3 px-6 text-slate-600 text-xs">{item.product_name || '-'}</td>
                      <td className="py-3 px-6 text-xs text-slate-500">{new Date(item.due_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-6 text-right text-slate-700 font-semibold">{formatCurrency(item.total_amount)}</td>
                      <td className="py-3 px-6 text-right text-emerald-600 font-semibold">{formatCurrency(item.amount_paid)}</td>
                      <td className="py-3 px-6 text-right text-rose-600 font-bold">{formatCurrency(item.remaining_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'overdue' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">Customer Name</th>
                    <th className="py-3 px-6">Mobile Number</th>
                    <th className="py-3 px-6">Product Bought</th>
                    <th className="py-3 px-6">Due Date</th>
                    <th className="py-3 px-6 text-right">Remaining Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-55/35">
                      <td className="py-3 px-6 font-semibold text-slate-700 font-display">{item.customer_name}</td>
                      <td className="py-3 px-6 text-slate-500 text-xs">{item.mobile_number}</td>
                      <td className="py-3 px-6 text-slate-600 text-xs">{item.product_name || '-'}</td>
                      <td className="py-3 px-6 text-xs text-slate-500">{new Date(item.due_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-6 text-right text-rose-600 font-bold">{formatCurrency(item.remaining_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'ledger' && ledgerSummary && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Transaction Event</th>
                    <th className="py-3 px-6">Ref / Memo Notes</th>
                    <th className="py-3 px-6 text-right">Debit (+)</th>
                    <th className="py-3 px-6 text-right">Credit (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* Purchase row */}
                  <tr className="hover:bg-slate-55/35">
                    <td className="py-3 px-6 text-xs text-slate-500">{new Date(ledgerSummary.customer.purchase_date).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-6 font-semibold text-slate-700 text-xs">Purchase Bill</td>
                    <td className="py-3 px-6 text-slate-500 text-xs">{ledgerSummary.customer.product_name} buying contract</td>
                    <td className="py-3 px-6 text-right text-slate-700 font-semibold">{formatCurrency(ledgerSummary.customer.total_amount)}</td>
                    <td className="py-3 px-6 text-right text-slate-400">-</td>
                  </tr>
                  {/* Payments */}
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-55/35">
                      <td className="py-3 px-6 text-xs text-slate-500">{new Date(item.payment_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-6 font-semibold text-slate-700 text-xs">Receipt ({item.payment_method})</td>
                      <td className="py-3 px-6 text-slate-500 text-xs">{item.reference_number ? `Ref: ${item.reference_number}` : 'Receipt verification'}</td>
                      <td className="py-3 px-6 text-right text-slate-400">-</td>
                      <td className="py-3 px-6 text-right text-emerald-600 font-bold">{formatCurrency(item.payment_amount)}</td>
                    </tr>
                  ))}
                  {/* Fine */}
                  {ledgerSummary.fine > 0 && (
                    <tr className="hover:bg-slate-55/35">
                      <td className="py-3 px-6 text-xs text-slate-500">{new Date().toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-6 font-semibold text-amber-700 text-xs">Overdue Fine Charge</td>
                      <td className="py-3 px-6 text-slate-500 text-xs">Late payment by {ledgerSummary.daysOverdue} days</td>
                      <td className="py-3 px-6 text-right text-slate-700 font-semibold">{formatCurrency(ledgerSummary.fine)}</td>
                      <td className="py-3 px-6 text-right text-slate-400">-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
