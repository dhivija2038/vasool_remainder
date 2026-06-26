import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  BookOpen, 
  Search, 
  User, 
  Phone, 
  Calendar, 
  ShoppingBag, 
  FileCheck, 
  Clock, 
  Trash2, 
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface CustomerSummary {
  id: number;
  customer_name: string;
  mobile_number: string;
  remaining_due: string;
  status: string;
}

interface Payment {
  id: number;
  customer_id: number;
  payment_amount: string;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  remarks: string | null;
}

interface LedgerData {
  customer: {
    id: number;
    customer_name: string;
    mobile_number: string;
    email: string | null;
    product_name: string | null;
    product_category: string | null;
    purchase_date: string | null;
    due_date: string | null;
    total_amount: string;
    amount_paid: string;
    remaining_due: string;
    status: string;
  };
  payments: Payment[];
  fine: number;
  daysOverdue: number;
  finalPayable: number;
}

const Ledger: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId');

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialCustomerId ? Number(initialCustomerId) : null
  );
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Load customer list
  const fetchCustomerList = async () => {
    try {
      setLoadingList(true);
      const response = await api.get('/api/customers');
      setCustomers(response.data);
    } catch (err) {
      console.error('Failed to load customer list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  // Load ledger for selected customer
  const fetchLedger = async (id: number) => {
    try {
      setLoadingLedger(true);
      const response = await api.get(`/api/reports/ledger/${id}`);
      setLedger(response.data);
    } catch (err) {
      console.error('Failed to load ledger details:', err);
      setLedger(null);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchCustomerList();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchLedger(selectedId);
      // Sync query parameter
      setSearchParams({ customerId: String(selectedId) });
    } else {
      setLedger(null);
    }
  }, [selectedId]);

  // Handle delete payment
  const handleDeletePayment = async (paymentId: number, amount: string) => {
    if (!selectedId) return;
    if (window.confirm(`Are you sure you want to delete payment record of ${formatCurrency(amount)}? This will increase the customer's outstanding balance.`)) {
      try {
        await api.delete(`/api/payments/${paymentId}`);
        fetchLedger(selectedId);
        fetchCustomerList(); // Refresh outstanding totals in left list
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete payment.');
      }
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c => 
    c.customer_name.toLowerCase().includes(search.toLowerCase()) || 
    c.mobile_number.includes(search)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Ledger Statements</h1>
        <p className="text-slate-500 text-sm mt-1">Audit customer purchase logs, payments history, overdue fines, and net balances.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Searchable Customer List */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[70vh]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loadingList ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No customers found.</div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedId === cust.id;
                const outAmt = Number(cust.remaining_due);
                return (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedId(cust.id)}
                    className={`w-full text-left p-4 flex items-center justify-between transition-all duration-150 ${
                      isSelected ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : 'hover:bg-slate-50/55'
                    }`}
                  >
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm font-display">{cust.customer_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{cust.mobile_number}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${outAmt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(outAmt)}
                      </span>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">{cust.status}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Selected Customer Ledger */}
        <div className="lg:col-span-8">
          {loadingLedger ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-20 flex flex-col items-center justify-center space-y-3 h-[70vh]">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm font-medium">Extracting ledger history...</p>
            </div>
          ) : !ledger ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-16 flex flex-col items-center justify-center text-center h-[70vh] border-dashed border-2">
              <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-4">
                <BookOpen size={40} />
              </div>
              <h3 className="text-slate-800 font-bold text-base font-display">No Customer Selected</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xs">Select a customer from the left-hand panel to view purchase agreements, payment records, and net statements.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Profile & Financial Summary Card */}
              <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-[-40%] right-[-10%] w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-800">
                  <div>
                    <h3 className="text-2xl font-bold font-display text-white">{ledger.customer.customer_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-slate-400 text-xs">
                      <span className="flex items-center space-x-1">
                        <Phone size={12} />
                        <span>{ledger.customer.mobile_number}</span>
                      </span>
                      {ledger.customer.email && (
                        <span>• {ledger.customer.email}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    ledger.customer.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-300' :
                    ledger.customer.status === 'Partial' ? 'bg-indigo-500/20 text-indigo-300' :
                    ledger.customer.status === 'Overdue' ? 'bg-rose-500/20 text-rose-300' : 'bg-sky-500/20 text-sky-300'
                  }`}>
                    {ledger.customer.status}
                  </span>
                </div>

                {/* Purchase details */}
                <div className="py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400">Product Bought</p>
                    <p className="font-semibold text-slate-100 mt-1">{ledger.customer.product_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Category</p>
                    <p className="font-semibold text-slate-100 mt-1">{ledger.customer.product_category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Purchase Date</p>
                    <p className="font-semibold text-slate-100 mt-1">
                      {ledger.customer.purchase_date ? new Date(ledger.customer.purchase_date).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Due Date</p>
                    <p className="font-semibold text-slate-100 mt-1">
                      {ledger.customer.due_date ? new Date(ledger.customer.due_date).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Calculations grid */}
                <div className="pt-5 border-t border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 bg-slate-950/30 rounded-2xl border border-slate-800">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">Total Cost</p>
                    <p className="text-sm font-bold text-slate-200 mt-1">{formatCurrency(ledger.customer.total_amount)}</p>
                  </div>
                  <div className="p-3 bg-slate-950/30 rounded-2xl border border-slate-800">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">Paid to Date</p>
                    <p className="text-sm font-bold text-emerald-400 mt-1">{formatCurrency(ledger.customer.amount_paid)}</p>
                  </div>
                  <div className="p-3 bg-slate-950/30 rounded-2xl border border-slate-800">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">Net Outstanding</p>
                    <p className="text-sm font-bold text-rose-400 mt-1">{formatCurrency(ledger.customer.remaining_due)}</p>
                  </div>
                  <div className="p-3 bg-slate-950/30 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Overdue Fine</p>
                      {ledger.daysOverdue > 0 && (
                        <span className="text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-bold">{ledger.daysOverdue}d</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-amber-400 mt-1">{formatCurrency(ledger.fine)}</p>
                  </div>
                  <div className="p-3 bg-indigo-650 rounded-2xl col-span-2 md:col-span-1 shadow-lg shadow-indigo-650/15">
                    <p className="text-indigo-200 text-[10px] uppercase font-semibold">Final Payable</p>
                    <p className="text-base font-extrabold text-white mt-0.5">{formatCurrency(ledger.finalPayable)}</p>
                  </div>
                </div>
              </div>

              {/* Warnings / Fine messages */}
              {ledger.daysOverdue > 0 && ledger.fine > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-start space-x-3 text-xs">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Overdue Fine Applied</h4>
                    <p className="text-amber-700/90 mt-0.5">This customer is {ledger.daysOverdue} days overdue. An overdue fine of {formatCurrency(ledger.fine)} has been automatically appended to the outstanding balance based on active settings.</p>
                  </div>
                </div>
              )}

              {/* Transaction Ledger Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/45">
                  <h4 className="font-bold text-slate-800 font-display text-sm">Account Transaction Ledger</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Chronological summary of buy agreements and payment receipts.</p>
                </div>

                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/30 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Type / Ref</th>
                      <th className="py-3 px-5">Remarks</th>
                      <th className="py-3 px-5 text-right">Debit (+)</th>
                      <th className="py-3 px-5 text-right">Credit (-)</th>
                      <th className="py-3 px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {/* 1. Purchase Record */}
                    {ledger.customer.purchase_date && (
                      <tr className="hover:bg-slate-55/35">
                        <td className="py-3.5 px-5 text-xs text-slate-500">
                          {new Date(ledger.customer.purchase_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="flex items-center space-x-1 text-slate-700 font-semibold text-xs">
                            <ShoppingBag size={13} className="text-indigo-500 shrink-0" />
                            <span>Purchase</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 text-xs">
                          {ledger.customer.product_name} ({ledger.customer.product_category})
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-800 font-semibold text-xs">
                          {formatCurrency(ledger.customer.total_amount)}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-400">-</td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="text-[10px] text-slate-400 italic">Locked</span>
                        </td>
                      </tr>
                    )}

                    {/* 2. Payment Records */}
                    {ledger.payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">No payments recorded.</td>
                      </tr>
                    ) : (
                      ledger.payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-55/35">
                          <td className="py-3.5 px-5 text-xs text-slate-500">
                            {new Date(pay.payment_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex flex-col">
                              <span className="flex items-center space-x-1 text-slate-700 font-semibold text-xs">
                                <FileCheck size={13} className="text-emerald-500 shrink-0" />
                                <span>Recv ({pay.payment_method})</span>
                              </span>
                              {pay.reference_number && (
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {pay.reference_number}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 text-xs truncate max-w-[180px]" title={pay.remarks || ''}>
                            {pay.remarks || 'No remarks'}
                          </td>
                          <td className="py-3.5 px-5 text-right text-slate-400">-</td>
                          <td className="py-3.5 px-5 text-right text-emerald-600 font-bold text-xs">
                            {formatCurrency(pay.payment_amount)}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => handleDeletePayment(pay.id, pay.payment_amount)}
                              disabled={pay.reference_number === 'INITIAL'}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-md transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent"
                              title={pay.reference_number === 'INITIAL' ? 'Cannot delete initial setup record' : 'Delete payment record'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}

                    {/* 3. Overdue Fine Record in ledger */}
                    {ledger.daysOverdue > 0 && ledger.fine > 0 && (
                      <tr className="bg-amber-50/20">
                        <td className="py-3.5 px-5 text-xs text-slate-500">
                          {new Date().toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="flex items-center space-x-1 text-amber-700 font-semibold text-xs">
                            <Clock size={13} className="text-amber-500 shrink-0" />
                            <span>Overdue Fine</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 text-xs">
                          Auto-charged: {ledger.daysOverdue} days late
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-800 font-semibold text-xs">
                          {formatCurrency(ledger.fine)}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-400">-</td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="text-[10px] text-amber-500 font-bold">Billing</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ledger;
