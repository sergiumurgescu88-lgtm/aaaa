import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { Project, AnalyticsData } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

const StatCard = ({ label, value, emoji, color, loading }: { label: string, value: string | number, emoji: string, color: string, loading?: boolean }) => (
  <div className="glass-card p-6 flex items-center space-x-4 relative overflow-hidden group">
    <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
      {emoji}
    </div>
    <div className="flex-1">
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="h-8 w-20 bg-white/5 animate-pulse rounded mt-1" />
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
    </div>
    <div className={`absolute -right-4 -bottom-4 w-16 h-16 bg-${color}/5 rounded-full blur-2xl`} />
  </div>
);

const StatusBadge = ({ status, step }: { status: string, step: number }) => {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
        ✅ Published
      </span>
    );
  }
  if (status === 'active' || status === 'step_2' || status === 'step_3' || status === 'step_4' || status === 'step_5' || status === 'step_6' || status === 'step_7' || status === 'step_8' || status === 'step_9') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
        ⏳ Step {step}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-white/40 border border-white/10">
      📝 Draft
    </span>
  );
};

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Table state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!user) return;

    // Real-time projects
    const projectsQuery = query(
      collection(db, 'projects'),
      where('userId', '==', user.id),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projectsData);
      setLoading(false);
    }, (err) => {
      console.error('Projects error:', err);
      setError('Failed to load projects. Please check your connection.');
      setLoading(false);
    });

    // Real-time analytics
    const analyticsQuery = query(
      collection(db, 'analytics'),
      where('userId', '==', user.id),
      orderBy('date', 'asc')
    );

    const unsubscribeAnalytics = onSnapshot(analyticsQuery, (snapshot) => {
      const analyticsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalyticsData));
      setAnalytics(analyticsData);
    }, (err) => {
      console.error('Analytics error:', err);
      // We don't necessarily want to block the whole dashboard if analytics fail
    });

    return () => {
      unsubscribeProjects();
      unsubscribeAnalytics();
    };
  }, [user]);

  // Derived stats
  const stats = useMemo(() => {
    const total = projects.length;
    const published = projects.filter(p => p.status === 'completed').length;
    const inProgress = projects.filter(p => p.status !== 'completed' && p.status !== 'draft').length;
    const reach = analytics.reduce((acc, curr) => acc + curr.views, 0);
    
    return [
      { label: 'Total Projects', value: total, emoji: '📊', color: 'accent' },
      { label: 'Published', value: published, emoji: '✅', color: 'success' },
      { label: 'In Progress', value: inProgress, emoji: '⏳', color: 'accent' },
      { label: 'Total Reach', value: reach >= 1000 ? `${(reach / 1000).toFixed(1)}K` : reach, emoji: '📈', color: 'success' },
    ];
  }, [projects, analytics]);

  // Filtered & Sorted projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesSearch = p.toolData.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || 
          (statusFilter === 'published' && p.status === 'completed') ||
          (statusFilter === 'progress' && p.status !== 'completed' && p.status !== 'draft') ||
          (statusFilter === 'draft' && p.status === 'draft');
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortOrder === 'asc' 
            ? a.toolData.name.localeCompare(b.toolData.name)
            : b.toolData.name.localeCompare(a.toolData.name);
        } else {
          const timeA = a.updatedAt?.toMillis() || 0;
          const timeB = b.updatedAt?.toMillis() || 0;
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }
      });
  }, [projects, search, statusFilter, sortField, sortOrder]);

  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, page]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  // Chart data
  const lineChartData = useMemo(() => {
    // Group by date
    const grouped = analytics.reduce((acc: any, curr) => {
      acc[curr.date] = (acc[curr.date] || 0) + curr.views;
      return acc;
    }, {});
    return Object.entries(grouped).map(([date, views]) => ({ date, views }));
  }, [analytics]);

  const barChartData = useMemo(() => {
    // Group by platform
    const grouped = analytics.reduce((acc: any, curr) => {
      acc[curr.platform] = (acc[curr.platform] || 0) + curr.views;
      return acc;
    }, {});
    return Object.entries(grouped).map(([platform, views]) => ({ platform, views }));
  }, [analytics]);

  const formatRelativeTime = (timestamp: Timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const date = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-white/40 font-medium">Here's what's happening with your content factory.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-3 glass-card hover:bg-white/5 transition-colors relative">
            <span className="text-xl">🔔</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-alert rounded-full" />
          </button>
          <div className="flex items-center space-x-3 glass-card px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs">
              {user?.name?.[0]}
            </div>
            <span className="text-sm font-bold hidden sm:inline">{user?.name}</span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      {error && (
        <div className="p-4 bg-alert/10 border border-alert/20 rounded-xl text-alert text-sm font-medium flex items-center space-x-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <StatCard {...stat} loading={loading} />
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => navigate('/factory')}
          className="bg-accent text-white font-bold px-8 py-4 rounded-xl flex items-center space-x-3 electric-glow hover:scale-105 transition-all active:scale-95"
        >
          <span className="text-xl">🚀</span>
          <span>CREATE NEW CONTENT</span>
        </button>
        <button className="glass-card px-8 py-4 font-bold flex items-center space-x-3 hover:bg-white/5 transition-all">
          <span className="text-xl">📁</span>
          <span>TEMPLATES</span>
        </button>
        <button 
          onClick={() => navigate('/settings')}
          className="glass-card px-8 py-4 font-bold flex items-center space-x-3 hover:bg-white/5 transition-all"
        >
          <span className="text-xl">⚙️</span>
          <span>SETTINGS</span>
        </button>
      </div>

      {/* Projects Table */}
      <section className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <span className="text-xl">📁</span>
            <span>RECENT PROJECTS</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
              <input 
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-accent outline-none transition-all w-full sm:w-64"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-accent outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="progress">In Progress</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-white/40 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => { setSortField('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Project Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => { setSortField('updatedAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  Last Modified {sortField === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={4} className="px-6 py-8">
                      <div className="h-4 bg-white/5 animate-pulse rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-white/40 font-medium">No projects found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-lg">
                          📄
                        </div>
                        <span className="font-bold group-hover:text-accent transition-colors">{project.toolData.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={project.status} step={project.currentStep} />
                    </td>
                    <td className="px-6 py-4 text-sm text-white/40">
                      {formatRelativeTime(project.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/factory/${project.id}`)}
                        className="text-accent font-bold text-sm hover:underline flex items-center justify-end space-x-1 ml-auto"
                      >
                        <span>{project.status === 'completed' ? 'View' : 'Continue'}</span>
                        <span>➡️</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-white/40">
              Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
            </p>
            <div className="flex items-center space-x-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 glass-card disabled:opacity-20 hover:bg-white/5 transition-all"
              >
                ⬅️
              </button>
              <span className="text-sm font-bold px-4">{page} / {totalPages}</span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 glass-card disabled:opacity-20 hover:bg-white/5 transition-all"
              >
                ➡️
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Analytics Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Line Chart: Views */}
        <section className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <span className="text-xl">📈</span>
              <span>VIEWS OVER TIME</span>
            </h3>
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Last 7 Days</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineChartData.length > 0 ? lineChartData : [{date: 'No Data', views: 0}]}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#252545', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#1a73e8', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="views" stroke="#1a73e8" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Bar Chart: Platforms */}
        <section className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <span className="text-xl">📊</span>
              <span>PLATFORM PERFORMANCE</span>
            </h3>
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">By Impressions</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData.length > 0 ? barChartData : [{platform: 'None', views: 0}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="platform" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#252545', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1a73e8' : '#00d084'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};
