import React, { useState } from 'react';
import api from '../utils/api';
import {
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Lock,
  CheckCircle,
  XCircle,
  CalendarRange
} from 'lucide-react';

interface DeleteSummary {
  payments: number;
  reminder_logs: number;
  reports: number;
  customers: number;
}

const DataManagement: React.FC = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ message: string; deleted: DeleteSummary } | null>(null);

  const validateRange = (): string => {
    if (!fromDate || !toDate) return 'Please select both a From Date and a To Date.';
    if (new Date(fromDate) > new Date(toDate)) return 'From Date cannot be after To Date.';
    if (!confirmAll) return 'Please confirm you want to delete all application data in this range.';
    return '';
  };

  const openPasswordModal = () => {
    setError('');
    setSuccess(null);
    const validationError = validateRange();
    if (validationError) {
      setError(validationError);
      return;
    }
    setPassword('');
    setShowPasswordModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!password) {
      setError('Password is required to confirm deletion.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/api/data-management/delete-range', {
        fromDate,
        toDate,
        password
      });

      setSuccess({ message: response.data.message, deleted: response.data.deleted });
      setShowPasswordModal(false);
      setPassword('');
      setConfirmAll(false);
      setFromDate('');
      setToDate('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display flex items-center gap-3">
          <ShieldAlert className="text-rose-600" size={30} />
          Data Management
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Permanently remove application data within a chosen date range. This action cannot be undone.
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl text-sm space-y-2">
          <div className="flex items-center space-x-2 font-semibold">
            <CheckCircle size={18} />
            <span>{success.message}</span>
          </div>
          <ul className="text-xs text-emerald-700 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <li className="bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
              Customers (with ledger): <strong>{success.deleted.customers}</strong>
            </li>
            <li className="bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
              Payments: <strong>{success.deleted.payments}</strong>
            </li>
            <li className="bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
              Reminder Logs: <strong>{success.deleted.reminder_logs}</strong>
            </li>
            <li className="bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
              Reports: <strong>{success.deleted.reports}</strong>
            </li>
          </ul>
        </div>
      )}

      {/* Error Alert */}
      {error && !showPasswordModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center space-x-2">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <p className="text-xs text-amber-800 leading-relaxed">
            Deleting data here is <strong>permanent and irreversible</strong>. Customers created in the
            selected range will be removed along with their full ledger history (payments and reminder
            logs), and any standalone payments, reminder logs, or generated reports dated within the
            range will also be deleted. You will be asked to re-enter your login password before anything
            is removed.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
            <CalendarRange size={18} className="text-slate-400" />
            Select Date Range
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            All application data dated within this range (inclusive) will be targeted for deletion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 rounded-xl outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-700 rounded-xl outline-none text-sm"
            />
          </div>
        </div>

        <label className="flex items-start space-x-3 bg-rose-50 border border-rose-200 rounded-xl p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmAll}
            onChange={(e) => setConfirmAll(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-rose-600"
          />
          <span className="text-xs text-rose-800 leading-relaxed">
            <strong>Delete All Application Data</strong> within the selected date range — customers,
            ledger entries, payments, reminders, and reports. I understand this cannot be undone.
          </span>
        </label>

        <button
          onClick={openPasswordModal}
          className="w-full flex items-center justify-center space-x-2 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
        >
          <Trash2 size={18} />
          <span>Delete Data in Range</span>
        </button>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 space-y-5">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-rose-100 text-rose-600 p-3 rounded-2xl">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Confirm Permanent Deletion</h3>
              <p className="text-xs text-slate-500">
                Re-enter your login password to permanently delete all application data from{' '}
                <strong>{fromDate}</strong> to <strong>{toDate}</strong>.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center space-x-2">
                <XCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-slate-800 rounded-xl outline-none text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmDelete()}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setError('');
                }}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="flex-1 flex items-center justify-center space-x-2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{submitting ? 'Deleting...' : 'Confirm & Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
