import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  Clock, 
  CalendarDays,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Link } from 'react-router-dom';

interface Stats {
  totalCustomers: number;
  outstandingAmount: number;
  collectedToday: number;
  collectedThisMonth: number;
  dueToday: number;
  upcoming7Days: number;
  overdueCustomers: number;
}

interface ChartData {
  statusDistribution: Array<{ status: string; count: number; total_due: string }>;
  upcomingDuesTimeline: Array<{ due_date: string; total_due: string }>;
  recentCustomers: Array<any>;
  overdueCustomers: Array<any>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, chartsRes] = await Promise.all([
          api.get('/api/dashboard/stats'),
          api.get('/api/dashboard/charts')
        ]);
        setStats(statsRes.data);
        setCharts(chartsRes.data);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError('Could not retrieve dashboard details. Make sure the database is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Fetching analytics dashboard...</p>
      </div>
    );
  }

  if (error || !stats || !charts) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center space-x-2">
        <AlertCircle size={20} />
        <span>{error || 'Error loading dashboard.'}</span>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Pie chart data prep
  const COLORS = {
    Paid: '#10b981',      // Emerald
    Partial: '#6366f1',   // Indigo
    Overdue: '#f43f5e',   // Rose
    Upcoming: '#0ea5e9'   // Sky
  };

  const pieData = charts.statusDistribution.map(item => ({
    name: item.status,
    value: Number(item.count),
    totalDue: Number(item.total_due || 0)
  }));

  // Bar chart timeline prep
  const barData = charts.upcomingDuesTimeline.map(item => {
    const dateObj = new Date(item.due_date);
    const dayMonth = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return {
      date: dayMonth,
      'Due Amount': Number(item.total_due)
    };
  });

  const cards = [
    { title: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'bg-blue-500/10 text-blue-600 border-blue-100' },
    { title: 'Outstanding Due', value: formatCurrency(stats.outstandingAmount), icon: DollarSign, color: 'bg-rose-500/10 text-rose-600 border-rose-100' },
    { title: 'Collected Today', value: formatCurrency(stats.collectedToday), icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-100' },
    { title: 'Collected This Month', value: formatCurrency(stats.collectedThisMonth), icon: TrendingUp, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-100' },
    { title: 'Due Today', value: formatCurrency(stats.dueToday), icon: Calendar, color: 'bg-amber-500/10 text-amber-600 border-amber-100' },
    { title: 'Upcoming (7 Days)', value: formatCurrency(stats.upcoming7Days), icon: CalendarDays, color: 'bg-sky-500/10 text-sky-600 border-sky-100' },
    { title: 'Overdue Customers', value: stats.overdueCustomers, icon: Clock, color: 'bg-red-500/10 text-red-600 border-red-100' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time statistics of due collections and ledger accounts.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between"
          >
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-800 font-display">{card.value}</h3>
            </div>
            <div className={`p-3.5 rounded-xl border ${card.color}`}>
              <card.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Due Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 font-display mb-4">Upcoming Due Amount (7-Day Forecast)</h3>
          <div className="h-72 w-full">
            {barData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No upcoming dues scheduled for the next 7 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Due']}
                  />
                  <Bar dataKey="Due Amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Due Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 font-display mb-4">Due Status Breakdown</h3>
          <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-slate-400 text-sm">No customer status logs found.</div>
            ) : (
              <>
                <div className="h-full w-full sm:w-[60%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        formatter={(value, name, props) => [`${value} Customers (${formatCurrency(props.payload.totalDue)} outstanding)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col space-y-2 mt-4 sm:mt-0 sm:pl-4 self-center w-full sm:w-[40%] text-xs">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100/50">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] || '#94a3b8' }}
                        />
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-slate-500 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Overdue Customers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-slate-800 font-display">Critical Overdue Accounts</h3>
            <Link to="/customers?status=Overdue" className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center space-x-1">
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            {charts.overdueCustomers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No overdue accounts detected. Great!</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Due Date</th>
                    <th className="pb-3 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {charts.overdueCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-semibold text-slate-700">{c.customer_name}</td>
                      <td className="py-3.5 text-slate-500 text-xs">{new Date(c.due_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-3.5 text-rose-600 font-bold text-right">{formatCurrency(Number(c.remaining_due))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Customers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-slate-800 font-display">Recent Onboarded Customers</h3>
            <Link to="/customers" className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center space-x-1">
              <span>Manage Customers</span>
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            {charts.recentCustomers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No customers onboarded yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {charts.recentCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-semibold text-slate-700">{c.customer_name}</td>
                      <td className="py-3.5 text-slate-500 text-xs">{c.product_name || 'N/A'}</td>
                      <td className="py-3.5 text-slate-800 font-bold text-right">{formatCurrency(Number(c.total_amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
