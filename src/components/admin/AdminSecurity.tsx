import { useState, useEffect } from 'react';
import { Shield, Activity, Lock, CheckCircle, RefreshCw } from 'lucide-react';

export function AdminSecurity() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        // Placeholder for future API integration
        // async function fetchSecurityStats() {
        //     const token = await getToken();
        //     // fetch...
        // }

        // Mock data for now
        setTimeout(() => {
            setStats({
                status: 'secure',
                lastAudit: new Date().toISOString(),
                activeSessions: 12,
                failedLoginAttempts: 0
            });
        }, 800);
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Security & Monitoring</h1>
                    <p className="text-gray-500 mt-2">System security status and API monitoring.</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

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
                    <h2 className="text-lg font-bold text-gray-900">Recent Security Events</h2>
                </div>
                <div className="p-12 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No security incidents reported in the last 24 hours.</p>
                </div>
            </div>
        </div>
    );
}
