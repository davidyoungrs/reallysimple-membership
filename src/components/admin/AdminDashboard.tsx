import { Loader2, Users, CreditCard, MousePointer, Eye } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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

export function AdminDashboard() {
    const { getToken } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const token = await getToken();
                const res = await fetch('/api/admin/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to fetch stats');
                const data = await res.json();
                setStats(data);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
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
                Error loading stats: {error}
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-2">Platform overview and health check.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.users.toLocaleString()}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <CreditCard className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-500">Active Cards</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.activeCards.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ {stats?.totalCards}</span></p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Eye className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.views.toLocaleString()}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <MousePointer className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-500">Total Clicks</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.clicks.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* User Growth Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">User Growth (30 Days)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.charts?.users || []}>
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
                            <BarChart data={stats?.charts?.views || []}>
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
        </div>
    );
}
