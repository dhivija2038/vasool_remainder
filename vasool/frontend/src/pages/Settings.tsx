import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Settings as SettingsIcon, 
  Building, 
  Scale, 
  Bell, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface FineRule {
  days: number;
  amount: number;
}

interface ReminderRules {
  sevenDaysBefore: boolean;
  threeDaysBefore: boolean;
  oneDayBefore: boolean;
  onDueDate: boolean;
  overdue: boolean;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('business'); // business, fine, reminder
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  // Fine rules state
  const [fineRules, setFineRules] = useState<FineRule[]>([]);
  const [newDays, setNewDays] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Reminder rules state
  const [reminderRules, setReminderRules] = useState<ReminderRules>({
    sevenDaysBefore: false,
    threeDaysBefore: false,
    oneDayBefore: false,
    onDueDate: false,
    overdue: false
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/settings');
      const data = response.data;
      
      setBusinessName(data.business_name || '');
      setOwnerName(data.owner_name || '');
      setBusinessPhone(data.business_phone || '');
      setBusinessEmail(data.business_email || '');
      setBusinessAddress(data.business_address || '');
      setUpiId(data.upi_id || '');
      setWhatsappNumber(data.whatsapp_number || '');
      
      setFineRules(Array.isArray(data.fine_rules) ? data.fine_rules : []);
      
      if (data.reminder_rules) {
        setReminderRules({
          sevenDaysBefore: !!data.reminder_rules.sevenDaysBefore,
          threeDaysBefore: !!data.reminder_rules.threeDaysBefore,
          oneDayBefore: !!data.reminder_rules.oneDayBefore,
          onDueDate: !!data.reminder_rules.onDueDate,
          overdue: !!data.reminder_rules.overdue
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Could not retrieve settings details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle fine rule add
  const handleAddFineRule = () => {
    if (!newDays || !newAmount) return;
    const days = parseInt(newDays);
    const amount = parseFloat(newAmount);

    if (isNaN(days) || isNaN(amount) || days <= 0 || amount <= 0) {
      alert('Please enter valid positive numbers.');
      return;
    }

    if (fineRules.some(r => r.days === days)) {
      alert('A rule for this number of overdue days already exists.');
      return;
    }

    setFineRules(prev => [...prev, { days, amount }].sort((a, b) => a.days - b.days));
    setNewDays('');
    setNewAmount('');
  };

  // Handle fine rule delete
  const handleDeleteFineRule = (days: number) => {
    setFineRules(prev => prev.filter(r => r.days !== days));
  };

  // Handle save action
  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.put('/api/settings', {
        business_name: businessName,
        owner_name: ownerName,
        business_phone: businessPhone,
        business_email: businessEmail,
        business_address: businessAddress,
        upi_id: upiId,
        whatsapp_number: whatsappNumber,
        fine_rules: fineRules,
        reminder_rules: reminderRules
      });
      setSuccess('Settings updated successfully!');
      
      // Update local storage username displays if owner name changed
      const savedUserStr = localStorage.getItem('vasool_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        savedUser.owner_name = ownerName;
        localStorage.setItem('vasool_user', JSON.stringify(savedUser));
      }
      
      // Trigger a light reload of auth data context if user details updated
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to update settings parameters.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-24 flex flex-col items-center justify-center space-y-3 min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Extracting settings profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure shop credentials, WhatsApp layouts, and automatic fine schedules.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 font-medium transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save size={18} />
          )}
          <span>Save Settings</span>
        </button>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Side: Navigation Tabs */}
        <div className="md:col-span-3 flex flex-row md:flex-col gap-2 border-b md:border-b-0 border-slate-200 pb-2 md:pb-0 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('business')}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'business' 
                ? 'bg-indigo-50 text-indigo-700 border-l-0 md:border-l-4 border-indigo-650' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            <Building size={16} />
            <span>Business Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('fine')}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'fine' 
                ? 'bg-indigo-50 text-indigo-700 border-l-0 md:border-l-4 border-indigo-650' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            <Scale size={16} />
            <span>Fine Rules</span>
          </button>
          <button
            onClick={() => setActiveTab('reminder')}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'reminder' 
                ? 'bg-indigo-50 text-indigo-700 border-l-0 md:border-l-4 border-indigo-650' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            <Bell size={16} />
            <span>Reminder Rules</span>
          </button>
        </div>

        {/* Right Side: Tab Contents */}
        <div className="md:col-span-9 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8 min-h-[50vh]">
          {/* TAB 1: BUSINESS PROFILE */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display">Business Profile Details</h3>
                <p className="text-slate-400 text-xs mt-0.5">Details printed on PDF statements and invoice letters.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Business / Shop Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter store name"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Enter owner name"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Business Phone</label>
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="E.g. +91 98765 43210"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Business Email</label>
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="shop@email.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">WhatsApp Number (For Alerts)</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="WhatsApp phone number"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">UPI ID (For Payments)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="merchant@upi"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Business Address</label>
                  <textarea
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Enter full physical address"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINE RULES */}
          {activeTab === 'fine' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display">Overdue Fine Rules</h3>
                <p className="text-slate-400 text-xs mt-0.5">Apply automatic penalty charges based on duration overdue. Fines calculate automatically on ledger bills.</p>
              </div>

              {/* Dynamic Add Row */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">If Overdue Days &gt;=</label>
                  <input
                    type="number"
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                    placeholder="E.g. 5"
                    className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Apply Fine Amount (INR)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="E.g. 150"
                    className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 text-slate-700 placeholder-slate-400 rounded-xl outline-none text-xs"
                  />
                </div>
                <button
                  onClick={handleAddFineRule}
                  className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold w-full sm:w-auto shadow-sm"
                >
                  <Plus size={14} />
                  <span>Add Rule</span>
                </button>
              </div>

              {/* Fine Rules table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm font-sans">
                  <thead className="bg-slate-50/70 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-5">Overdue Threshold</th>
                      <th className="py-3 px-5">Fine Penalty Charged</th>
                      <th className="py-3 px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {fineRules.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">No active fine penalties configured. Dues are interest free.</td>
                      </tr>
                    ) : (
                      fineRules.map((rule, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="py-3.5 px-5 font-semibold text-slate-700 text-xs">
                            {rule.days} or more Days Overdue
                          </td>
                          <td className="py-3.5 px-5 text-rose-600 font-bold text-xs">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rule.amount)}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => handleDeleteFineRule(rule.days)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                              title="Delete Rule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REMINDER RULES */}
          {activeTab === 'reminder' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-display">Reminder Schedules</h3>
                <p className="text-slate-400 text-xs mt-0.5">Determine reminder schedules. Check notifications intervals to include in pre-fill WhatsApp selections.</p>
              </div>

              <div className="space-y-4">
                {/* 7 Days before */}
                <label className="flex items-center space-x-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reminderRules.sevenDaysBefore}
                    onChange={(e) => setReminderRules(prev => ({ ...prev, sevenDaysBefore: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">7 Days Before Due Date</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Alert customer a week in advance to plan payments.</p>
                  </div>
                </label>

                {/* 3 Days before */}
                <label className="flex items-center space-x-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reminderRules.threeDaysBefore}
                    onChange={(e) => setReminderRules(prev => ({ ...prev, threeDaysBefore: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">3 Days Before Due Date</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Alert customer for upcoming settlements.</p>
                  </div>
                </label>

                {/* 1 Day before */}
                <label className="flex items-center space-x-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reminderRules.oneDayBefore}
                    onChange={(e) => setReminderRules(prev => ({ ...prev, oneDayBefore: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">1 Day Before Due Date</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Alert customer for next-day payments.</p>
                  </div>
                </label>

                {/* Due Date */}
                <label className="flex items-center space-x-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reminderRules.onDueDate}
                    onChange={(e) => setReminderRules(prev => ({ ...prev, onDueDate: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">On Due Date</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Alert customer on the exact payment date.</p>
                  </div>
                </label>

                {/* Overdue */}
                <label className="flex items-center space-x-3 p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reminderRules.overdue}
                    onChange={(e) => setReminderRules(prev => ({ ...prev, overdue: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">After Due Date (Overdue Alert)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Alert customer that their account has penalty charges and is overdue.</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
