import { Loader2, Users, CreditCard, MousePointer, Eye, Activity, Globe, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
    topCards?: { cardId: number; views: number; cardName: string; slug: string }[];
    heatmapData: { lat: string; lng: string; count: number }[];
    deviceStats?: { name: string; value: number }[];
    browserStats?: { name: string; value: number }[];
    sourceStats?: { name: string; value: number }[];
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

    const Skeleton = ({ className }: { className: string }) => (
        <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`}></div>
    );

    return (
        <div className="pb-12">
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

            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {loading ? (
                            <>
                                <Skeleton className="h-32" />
                                <Skeleton className="h-32" />
                                <Skeleton className="h-32" />
                                <Skeleton className="h-32" />
                            </>
                        ) : stats && (
                            <>
                                <Link to="/admin/users" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all hover:shadow-md group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                            <Users className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.users.toLocaleString()}</p>
                                </Link>

                                <Link to="/admin/cards" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-purple-200 transition-all hover:shadow-md group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                                            <CreditCard className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-500">Active Cards</h3>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeCards.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ {stats.totalCards}</span></p>
                                </Link>

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
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* User Growth Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                User Growth (30 Days)
                            </h3>
                            <div className="h-64 w-full">
                                {loading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : stats?.charts ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.charts.users}>
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
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                                )}
                            </div>
                        </div>

                        {/* Views Traffic Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-orange-600" />
                                Traffic Volume (30 Days)
                            </h3>
                            <div className="h-64 w-full">
                                {loading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : stats?.charts ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.charts.views}>
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
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'analytics' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Traffic Sources */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                Traffic Sources
                            </h3>
                            <div className="flex-1 min-h-[300px]">
                                {loading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : analytics?.sourceStats ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.sourceStats}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analytics.sourceStats.map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 font-medium">No source data</div>
                                )}
                            </div>
                        </div>

                        {/* Top Cards Leaderboard */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                Top Performing Cards (30D)
                            </h3>
                            <div className="space-y-4">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                                ) : analytics?.topCards?.length ? (
                                    analytics.topCards.map((card, idx) => (
                                        <div key={card.cardId} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{card.cardName}</p>
                                                    <p className="text-sm text-gray-500">/{card.slug}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-gray-900">{card.views.toLocaleString()}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Views</p>
                                                </div>
                                                <Link to={`/admin/cards?q=${card.slug}`} className="p-2 bg-gray-100 rounded-lg text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <p className="text-gray-400 font-medium">No performance data yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Map */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <Globe className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900">Global Heatmap</h3>
                            </div>
                            <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 z-0 relative">
                                {loading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : (
                                    <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        {analytics?.heatmapData.map((point: any, i: number) => {
                                            if (!point.lat || !point.lng) return null;
                                            return (
                                                <CircleMarker
                                                    key={i}
                                                    center={[parseFloat(point.lat), parseFloat(point.lng)]}
                                                    radius={Math.min(25, 6 + (point.count * 1.5))}
                                                    fillColor="#2563eb"
                                                    color="#1d4ed8"
                                                    weight={1}
                                                    opacity={0.8}
                                                    fillOpacity={0.4}
                                                >
                                                    <Popup>
                                                        <div className="p-1">
                                                            <p className="text-sm font-bold">{point.count} views</p>
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            );
                                        })}
                                    </MapContainer>
                                )}
                            </div>
                        </div>

                        {/* Sidebar: Activity & Tiers */}
                        <div className="space-y-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-emerald-600" />
                                        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        Live
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {loading ? (
                                        Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                                    ) : analytics?.recentViews.map((view: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm text-xl">
                                                {view.country === 'US' ? '🇺🇸' : view.country === 'GB' ? '🇬🇧' : view.country === 'DE' ? '🇩🇪' : view.country === 'FR' ? '🇫🇷' : '🌍'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    New view on <span className="text-blue-600 font-bold">{view.cardName}</span>
                                                </p>
                                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                                    <span>{view.city}, {view.country}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span>{new Date(view.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {!loading && !analytics?.recentViews.length && (
                                        <div className="py-12 text-center text-gray-400">No recent activity detected</div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Device Dist.</h4>
                                    <div className="h-32">
                                        {loading ? (
                                            <Skeleton className="h-full w-full" />
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={analytics?.deviceStats || []} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value">
                                                        {(analytics?.deviceStats || []).map((_entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ fontSize: '10px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Top Signups</h4>
                                    <div className="space-y-2">
                                        {loading ? (
                                            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                                        ) : analytics?.recentUsers.map((user: any) => (
                                            <div key={user.id} className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                    {(user.email || 'U')[0].toUpperCase()}
                                                </div>
                                                <span className="text-[11px] font-medium text-gray-600 truncate">{user.email}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
