import { useTranslation } from 'react-i18next';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { TrendingUp, Eye, MousePointerClick } from 'lucide-react';

interface ChartData {
    date: string;
    fullDate: string;
    views: number;
    clicks: number;
}

interface DashboardChartsProps {
    data: ChartData[];
    totalViews: number;
    totalClicks: number;
    isLoading: boolean;
}

export function DashboardCharts({ data, totalViews, totalClicks, isLoading }: DashboardChartsProps) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse" />
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Metric Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2 opacity-80">
                            <Eye className="w-5 h-5" />
                            <span className="text-sm font-medium">{t('Total Views')}</span>
                        </div>
                        <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="absolute -bottom-2 -right-2 w-24 h-24 opacity-10" />
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg shadow-emerald-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2 opacity-80">
                            <MousePointerClick className="w-5 h-5" />
                            <span className="text-sm font-medium">{t('Total Clicks')}</span>
                        </div>
                        <p className="text-3xl font-bold">{totalClicks.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="absolute -bottom-2 -right-2 w-24 h-24 opacity-10" />
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    {t('Performance Over Time')}
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="views"
                                name={t('Views') || "Views"}
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorViews)"
                            />
                            <Area
                                type="monotone"
                                dataKey="clicks"
                                name={t('Clicks') || "Clicks"}
                                stroke="#10B981"
                                strokeWidth={2}
                                fillOpacity={0}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
