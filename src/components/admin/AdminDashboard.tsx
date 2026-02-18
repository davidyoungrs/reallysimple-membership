import { Loader2, Users, CreditCard, MousePointer, Eye, Activity, Globe } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

interface AdminStats {
    users: number;
    totalCards: number;
    activeCards: number;
    views: number;
    clicks: number;
    charts?: {
        users: { date: string; count: number }[];
        views: { date: string; count: number }[];
    };
}

interface AnalyticsData {
    recentUsers: any[];
    recentViews: any[];
    heatmapData: { lat: string; lng: string; count: number }[];
}

export function AdminDashboard() {
    const { getToken } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

    useEffect(() => {
        async function fetchData() {
            try {
                const token = await getToken();

                // Fetch Stats
                const statsRes = await fetch('/api/admin?resource=stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!statsRes.ok) throw new Error('Failed to fetch stats');
                const statsData = await statsRes.json();
                setStats(statsData);

                // Fetch Analytics
                const analyticsRes = await fetch('/api/admin?resource=global_analytics', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (analyticsRes.ok) {
                    const analyticsData = await analyticsRes.json();
                    setAnalytics(analyticsData);
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [getToken]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                Error loading dashboard: {error}
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-2">Platform overview and health check.</p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-8">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analytics'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Global Analytics
                </button>
            </div>

            {activeTab === 'overview' && stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.users.toLocaleString()}</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-purple-50 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Active Cards</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeCards.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ {stats.totalCards}</span></p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <Eye className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.views.toLocaleString()}</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <MousePointer className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Total Clicks</h3>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.clicks.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* User Growth Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">User Growth (30 Days)</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.charts?.users || []}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(str) => {
                                                const date = new Date(str);
                                                return `${date.getMonth() + 1}/${date.getDate()}`;
                                            }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Views Traffic Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Traffic Volume (30 Days)</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.charts?.views || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(str) => {
                                                const date = new Date(str);
                                                return `${date.getMonth() + 1}/${date.getDate()}`;
                                            }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'analytics' && analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Live Feed */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Signups</h4>
                                    <div className="space-y-3">
                                        {analytics.recentUsers.map((user: any) => (
                                            <div key={user.id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs">
                                                        {user.email?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 truncate max-w-[120px]">{user.email}</p>
                                                        <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {analytics.recentUsers.length === 0 && (
                                            <p className="text-sm text-gray-500">No recent signups.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Views</h4>
                                    <div className="space-y-3">
                                        {analytics.recentViews.map((view: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div>
                                                    <p className="font-medium text-gray-900">{view.cardName}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span>{view.city}, {view.country}</span>
                                                        <span>•</span>
                                                        <span>{new Date(view.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                                {view.flag && <span className="text-lg" title={view.country}>{/* Flag placeholder if feasible, for now just country code maybe? */}{/* view.flag */}</span>}
                                            </div>
                                        ))}
                                        {analytics.recentViews.length === 0 && (
                                            <p className="text-sm text-gray-500">No recent views.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Globe/Map */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[600px] flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <Globe className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900">Global Heatmap</h3>
                            </div>
                            <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 z-0 relative">
                                <MapContainer
                                    center={[20, 0]}
                                    zoom={2}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={false}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {analytics.heatmapData.map((point: any, i: number) => {
                                        if (!point.lat || !point.lng) return null;
                                        return (
                                            <CircleMarker
                                                key={i}
                                                center={[parseFloat(point.lat), parseFloat(point.lng)]}
                                                radius={Math.min(20, 5 + (point.count * 2))} // Dynamic radius based on count
                                                fillColor="#2563eb"
                                                color="#2563eb"
                                                weight={1}
                                                opacity={0.8}
                                                fillOpacity={0.4}
                                            >
                                                <Popup>
                                                    <div className="text-xs font-semibold">
                                                        views: {point.count}
                                                    </div>
                                                </Popup>
                                            </CircleMarker>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
