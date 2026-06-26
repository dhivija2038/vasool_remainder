import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  DollarSign, 
  AlertCircle, 
  Phone, 
  Mail, 
  Calendar,
  X,
  CreditCard,
  BookOpen
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

interface Customer {
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
}

const Customers: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Customer Modal state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    mobile_number: '',
    email: '',
    product_name: '',
    product_category: '',
    purchase_date: new Date().toISOString().split('T')[0],
    due_date: '',
    total_amount: '',
    amount_paid: '0'
  });

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [selectedCustomerRemaining, setSelectedCustomerRemaining] = useState(0);
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    remarks: ''
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/customers', {
        params: {
          search,
          status: statusFilter,
          sortBy,
          order: sortOrder
        }
      });
      setCustomers(response.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch customers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, sortBy, sortOrder]);

  // Handle open modal for new customer
  const handleAddClick = () => {
    setEditingCustomer(null);
    setCustomerForm({
      customer_name: '',
      mobile_number: '',
      email: '',
      product_name: '',
      product_category: '',
      purchase_date: new Date().toISOString().split('T')[0],
      due_date: '',
      total_amount: '',
      amount_paid: '0'
    });
    setIsCustomerModalOpen(true);
  };

  // Handle open modal for editing
  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      customer_name: customer.customer_name,
      mobile_number: customer.mobile_number,
      email: customer.email || '',
      product_name: customer.product_name || '',
      product_category: customer.product_category || '',
      purchase_date: customer.purchase_date ? customer.purchase_date.split('T')[0] : '',
      due_date: customer.due_date ? customer.due_date.split('T')[0] : '',
      total_amount: customer.total_amount,
      amount_paid: customer.amount_paid
    });
    setIsCustomerModalOpen(true);
  };

  // Handle customer form submits
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/api/customers/${editingCustomer.id}`, customerForm);
      } else {
        await api.post('/api/customers', customerForm);
      }
      setIsCustomerModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error saving customer details');
    }
  };

  // Handle delete customer
  const handleDeleteClick = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"? All payment records will be permanently removed.`)) {
      try {
        await api.delete(`/api/customers/${id}`);
        fetchCustomers();
      } catch (err: any) {
        console.error(err);
        alert('Error deleting customer.');
      }
    }
  };

  // Handle open modal for payment
  const handlePaymentClick = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.customer_name);
    setSelectedCustomerRemaining(Number(customer.remaining_due));
    setPaymentForm({
      payment_amount: '',
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      remarks: ''
    });
    setIsPaymentModalOpen(true);
  };

  // Handle payment form submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    const amt = Number(paymentForm.payment_amount);
    if (amt <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }
    if (amt > selectedCustomerRemaining) {
      if (!window.confirm(`The payment amount (${amt}) is greater than the customer's outstanding balance (${selectedCustomerRemaining}). Proceed anyway?`)) {
        return;
      }
    }

    try {
      await api.post('/api/payments', {
        customer_id: selectedCustomerId,
        ...paymentForm
      });
      setIsPaymentModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error recording payment.');
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      case 'Partial':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Partial</span>;
      case 'Overdue':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">Overdue</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">Upcoming</span>;
    }
  };

  // Auto-calculated remaining due in client UI form
  const computedRemaining = Math.max(0, Number(customerForm.total_amount || 0) - Number(customerForm.amount_paid || 0));

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage shop customer accounts, total dues, and payment records.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 font-medium transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus size={18} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filters & Search section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, product name..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none transition-all text-sm"
          />
        </div>

        {/* Filter status & Sort */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm w-full sm:w-auto">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-600 outline-none text-sm font-medium w-full"
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-600 outline-none text-sm font-medium w-full"
            >
              <option value="created_at">Date Created</option>
              <option value="customer_name">Name</option>
              <option value="due_date">Due Date</option>
              <option value="remaining_due">Remaining Due</option>
              <option value="total_amount">Total Amount</option>
            </select>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
          >
            {sortOrder.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Customer List table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">Filtering accounts...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            No customers found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/70 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Contact info</th>
                  <th className="py-4 px-6">Product details</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-6 text-right">Total</th>
                  <th className="py-4 px-6 text-right">Outstanding</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Name */}
                    <td className="py-4.5 px-6 font-semibold text-slate-800 font-display">
                      {customer.customer_name}
                    </td>

                    {/* Contact */}
                    <td className="py-4.5 px-6">
                      <div className="flex flex-col space-y-0.5 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Phone size={12} className="shrink-0" />
                          <span>{customer.mobile_number}</span>
                        </span>
                        {customer.email && (
                          <span className="flex items-center space-x-1">
                            <Mail size={12} className="shrink-0" />
                            <span>{customer.email}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Product */}
                    <td className="py-4.5 px-6">
                      <div className="flex flex-col space-y-0.5">
                        <span className="font-semibold text-slate-700 text-xs">{customer.product_name || 'N/A'}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded w-max font-medium">
                          {customer.product_category || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-4.5 px-6 text-slate-500 text-xs">
                      <span className="flex items-center space-x-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{customer.due_date ? new Date(customer.due_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-4.5 px-6 font-bold text-slate-800 text-right text-xs">
                      {formatCurrency(customer.total_amount)}
                    </td>

                    {/* Outstanding */}
                    <td className="py-4.5 px-6 text-right">
                      <span className={`font-extrabold text-sm ${Number(customer.remaining_due) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(customer.remaining_due)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4.5 px-6 text-center">
                      {getStatusBadge(customer.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4.5 px-6 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Quick Payment */}
                        {Number(customer.remaining_due) > 0 && (
                          <button
                            onClick={() => handlePaymentClick(customer)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                            title="Record Payment"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        {/* Ledger Link */}
                        <Link
                          to={`/ledger?customerId=${customer.id}`}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                          title="View Ledger & Statement"
                        >
                          <BookOpen size={16} />
                        </Link>
                        {/* Edit */}
                        <button
                          onClick={() => handleEditClick(customer)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                          title="Edit Details"
                        >
                          <Edit2 size={15} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteClick(customer.id, customer.customer_name)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          title="Delete Account"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Create/Edit Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/55">
              <div>
                <h3 className="text-xl font-bold text-slate-800 font-display">
                  {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
                </h3>
                <p className="text-slate-500 text-xs mt-1">Enter purchase agreements and setup outstanding payments details.</p>
              </div>
              <button 
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCustomerSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.customer_name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerForm.mobile_number}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                    placeholder="E.g. +91 9876543210"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="customer@email.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Product Category</label>
                  <input
                    type="text"
                    value={customerForm.product_category}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, product_category: e.target.value }))}
                    placeholder="E.g. Electronics, Furniture"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Product Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Product Name</label>
                  <input
                    type="text"
                    value={customerForm.product_name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="E.g. Sony Bravia 55' Smart TV"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Purchase Date</label>
                  <input
                    type="date"
                    value={customerForm.purchase_date}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, purchase_date: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Due Date</label>
                  <input
                    type="date"
                    value={customerForm.due_date}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Total Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Amount *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={customerForm.total_amount}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, total_amount: e.target.value }))}
                    placeholder="E.g. 25000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm"
                  />
                </div>

                {/* Amount Paid (initial setup) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {editingCustomer ? 'Amount Paid (ReadOnly)' : 'Amount Paid (Initial payment)'}
                  </label>
                  <input
                    type="number"
                    required
                    disabled={!!editingCustomer}
                    min="0"
                    value={customerForm.amount_paid}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                    placeholder="E.g. 5000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Automatic Calculated Balance Notification Card */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-4.5 rounded-2xl flex items-center justify-between text-indigo-900">
                <div className="flex items-center space-x-3">
                  <AlertCircle size={20} className="text-indigo-500" />
                  <div>
                    <h4 className="text-sm font-bold font-display">Calculated Outstanding Due</h4>
                    <p className="text-[11px] text-indigo-600/80">Auto calculates on billing changes.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-lg tracking-tight text-indigo-700">
                    {formatCurrency(computedRemaining)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/10 transition-colors"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/55">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display">Record Due Payment</h3>
                <p className="text-slate-500 text-xs mt-0.5">Customer: <span className="font-bold text-slate-700">{selectedCustomerName}</span></p>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              {/* Info panel */}
              <div className="flex justify-between items-center bg-rose-50/50 border border-rose-100 p-3.5 rounded-xl text-rose-900 text-xs">
                <span className="font-medium">Total Outstanding Balance:</span>
                <span className="font-bold">{formatCurrency(selectedCustomerRemaining)}</span>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Amount *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_amount: e.target.value }))}
                  placeholder="Enter amount collected"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm font-semibold"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 rounded-xl outline-none text-sm font-semibold"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Credit/Debit Card</option>
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 rounded-xl outline-none text-sm"
                />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reference / Transaction ID</label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="E.g. UPI transaction hash, check number"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Remarks</label>
                <textarea
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Add payment notes"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-sm resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/10 transition-colors flex items-center space-x-2"
                >
                  <CreditCard size={16} />
                  <span>Submit Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
