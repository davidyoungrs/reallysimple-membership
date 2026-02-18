import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Shield, Activity, Lock, CheckCircle, RefreshCw, AlertOctagon, Timer, FileWarning } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function AdminSecurity() {
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'firewall' | 'performance' | 'sanitization'>('overview');

    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);

    const fetchSecurityStats = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const res = await fetch('/api/admin?resource=security_stats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Failed to fetch security stats');

            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching security stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecurityStats();
        // Poll every 30 seconds
        const interval = setInterval(fetchSecurityStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Shield },
        { id: 'firewall', label: 'Firewall', icon: AlertOctagon },
        { id: 'performance', label: 'Performance', icon: Timer },
        { id: 'sanitization', label: 'Sanitization Log', icon: FileWarning },
    ];

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Security & System Health</h1>
                    <p className="text-gray-500 mt-2">Monitor system security, performance, and automated protections.</p>
                </div>
                <button
                    onClick={fetchSecurityStats}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-8">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">System Status</div>
                                    <div className="text-xl font-bold text-green-600">Secure</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">API Health</div>
                                    <div className="text-xl font-bold text-gray-900">99.9%</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">Active Sessions</div>
                                    <div className="text-xl font-bold text-gray-900">{stats?.activeSessions || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Recent Security Alerts</h2>
                        </div>
                        <div className="p-6">
                            {stats?.blockedIps && stats.blockedIps.length > 0 ? (
                                <div className="space-y-4">
                                    {stats.blockedIps.slice(0, 2).map((ip: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                            <AlertOctagon className="w-5 h-5 text-red-600 mt-0.5" />
                                            <div>
                                                <div className="font-medium text-red-900">IP Blocked: {ip.ip}</div>
                                                <div className="text-sm text-red-700">{ip.reason}</div>
                                                <div className="text-xs text-red-500 mt-1">{new Date(ip.timestamp).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p>No major security incidents reported recently.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'firewall' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Recent IP Blocks</h2>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            {stats?.blockedIps?.length || 0} Blocks (24h)
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">IP Address</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Location</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats?.blockedIps?.map((block: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="py-4 px-6 font-mono text-sm text-gray-600">{block.ip}</td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                {block.reason}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{block.location}</td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{new Date(block.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'performance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">API Response Times</h2>
                        <p className="text-gray-500 text-sm mt-1">Average latency (ms) by endpoint</p>
                    </div>
                    <div className="p-6 h-80">
                        {stats?.apiPerformance && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.apiPerformance} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" unit="ms" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: '#F3F4F6' }}
                                    />
                                    <Bar dataKey="avgTime" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'sanitization' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Input Sanitization Log</h2>
                        <p className="text-gray-500 text-sm mt-1">Automatically cleaned malicious inputs</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Field</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Original Input</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Sanitized Output</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">User</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats?.sanitizationLogs?.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="py-4 px-6 text-sm font-medium text-gray-900">{log.field}</td>
                                        <td className="py-4 px-6">
                                            <code className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 block max-w-[200px] truncate" title={log.input}>
                                                {log.input}
                                            </code>
                                        </td>
                                        <td className="py-4 px-6">
                                            <code className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded border border-green-100 block max-w-[200px] truncate">
                                                {log.output}
                                            </code>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{log.user}</td>
                                        <td className="py-4 px-6 text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
