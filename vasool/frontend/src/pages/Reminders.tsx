import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  BellRing, 
  MessageSquare, 
  Send, 
  Clock, 
  Search, 
  Phone, 
  AlertCircle,
  History,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';

interface CustomerReminder {
  id: number;
  customer_name: string;
  mobile_number: string;
  product_name: string | null;
  due_date: string;
  remaining_due: string;
  status: string;
}

interface ReminderLog {
  id: number;
  customer_id: number;
  customer_name: string;
  mobile_number: string;
  message: string;
  status: string;
  type: string;
  sent_at: string;
}

interface Settings {
  business_name: string;
  owner_name: string;
  business_phone: string;
  upi_id: string;
  whatsapp_number: string;
}

const Reminders: React.FC = () => {
  const [activeTab, setActiveTab] = useState('send'); // send, logs
  const [customers, setCustomers] = useState<CustomerReminder[]>([]);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  
  const [searchSend, setSearchSend] = useState('');
  const [searchLogs, setSearchLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custRes, logsRes, settingsRes] = await Promise.all([
        api.get('/api/customers'),
        api.get('/api/reminders'),
        api.get('/api/settings')
      ]);

      // Only show customers with outstanding balance in the send tab
      const outstanding = custRes.data.filter((c: any) => Number(c.remaining_due) > 0);
      setCustomers(outstanding);
      setLogs(logsRes.data);
      setSettings(settingsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to retrieve reminders data. Check database connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const handleSendReminder = async (customer: CustomerReminder) => {
    if (!settings) {
      alert('Unable to load business settings. Please configure settings first.');
      return;
    }

    const dueDateStr = new Date(customer.due_date).toLocaleDateString('en-IN');
    const remainingDueStr = formatCurrency(customer.remaining_due);

    // Build template message
    const rawMessage = `Hello ${customer.customer_name},\n\nThis is a friendly payment reminder from *${settings.business_name}*.\n\nYou have an outstanding due balance of *${remainingDueStr}* for *${customer.product_name || 'your purchase'}* which was due on *${dueDateStr}*.\n\nKindly complete the payment using UPI ID: *${settings.upi_id}*.\n\nAfter payment, please share the transaction receipt. If you have already paid, please ignore this.\n\nThank you,\n${settings.owner_name}\n${settings.business_phone}`;

    // Clean mobile number (only digits, ensure it has prefix if not present)
    let cleanedPhone = customer.mobile_number.replace(/\D/g, '');
    // If it's a standard Indian 10-digit number without country code, add 91
    if (cleanedPhone.length === 10) {
      cleanedPhone = '91' + cleanedPhone;
    }

    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(rawMessage)}`;

    try {
      // 1. Log in database as Sent
      await api.post('/api/reminders', {
        customer_id: customer.id,
        message: rawMessage,
        status: 'Sent',
        type: 'WhatsApp'
      });

      // 2. Open WhatsApp window
      window.open(whatsappUrl, '_blank');

      // Refresh log data
      const logsRes = await api.get('/api/reminders');
      setLogs(logsRes.data);
    } catch (err: any) {
      console.error('Failed to log reminder event:', err);
      alert('Error recording reminder log.');
    }
  };

  // Filtered send list
  const filteredSend = customers.filter(c => 
    c.customer_name.toLowerCase().includes(searchSend.toLowerCase()) || 
    c.mobile_number.includes(searchSend)
  );

  // Filtered log list
  const filteredLogs = logs.filter(l => 
    l.customer_name.toLowerCase().includes(searchLogs.toLowerCase()) || 
    l.mobile_number.includes(searchLogs) ||
    l.message.toLowerCase().includes(searchLogs.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Reminders Hub</h1>
        <p className="text-slate-500 text-sm mt-1">Configure and send instant WhatsApp billing notifications to delinquent customers.</p>
      </div>

      {/* Tabs Controller */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('send')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'send' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Send size={16} />
          <span>Send Due Reminders</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'logs' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <History size={16} />
          <span>Reminder Logs History</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading reminder sheets...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: SEND REMINDERS */}
          {activeTab === 'send' && (
            <div className="space-y-6">
              {/* Search send */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchSend}
                    onChange={(e) => setSearchSend(e.target.value)}
                    placeholder="Search outstanding accounts..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                {filteredSend.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">No outstanding accounts require notifications.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/70 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-4 px-6">Customer Name</th>
                          <th className="py-4 px-6">Contact Number</th>
                          <th className="py-4 px-6">Product Details</th>
                          <th className="py-4 px-6">Due Date</th>
                          <th className="py-4 px-6 text-right">Outstanding Due</th>
                          <th className="py-4 px-6 text-center">Status</th>
                          <th className="py-4 px-6 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredSend.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/45 transition-colors">
                            <td className="py-4 px-6 font-semibold text-slate-800 font-display">{c.customer_name}</td>
                            <td className="py-4 px-6 text-slate-500 text-xs">
                              <span className="flex items-center space-x-1">
                                <Phone size={12} className="text-slate-400" />
                                <span>{c.mobile_number}</span>
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-600 text-xs font-semibold">{c.product_name || '-'}</td>
                            <td className="py-4 px-6 text-slate-500 text-xs">{new Date(c.due_date).toLocaleDateString('en-IN')}</td>
                            <td className="py-4 px-6 text-right text-rose-600 font-extrabold text-sm">{formatCurrency(c.remaining_due)}</td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' : 'bg-indigo-50 text-indigo-700'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => handleSendReminder(c)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
                              >
                                <MessageSquare size={13} />
                                <span>Send WhatsApp</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REMINDER LOGS HISTORY */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              {/* Search logs */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchLogs}
                    onChange={(e) => setSearchLogs(e.target.value)}
                    placeholder="Search logs message, customer name..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">No historical reminder logs found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap font-sans">
                      <thead className="bg-slate-50/70 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-4 px-6">Timestamp</th>
                          <th className="py-4 px-6">Customer Name</th>
                          <th className="py-4 px-6">Contact Number</th>
                          <th className="py-4 px-6">Type</th>
                          <th className="py-4 px-6">Notification Body</th>
                          <th className="py-4 px-6 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/45 transition-colors">
                            <td className="py-4 px-6 text-xs text-slate-500">
                              {new Date(log.sent_at).toLocaleString('en-IN')}
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-800 font-display">{log.customer_name}</td>
                            <td className="py-4 px-6 text-slate-500 text-xs">{log.mobile_number}</td>
                            <td className="py-4 px-6">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">
                                {log.type}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-600 truncate max-w-sm" title={log.message}>
                              {log.message}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                <CheckCircle size={12} className="shrink-0" />
                                <span>{log.status}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reminders;
