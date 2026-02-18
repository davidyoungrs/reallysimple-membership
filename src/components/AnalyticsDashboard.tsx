import { useState, useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Loader2,
    TrendingUp,
    MousePointerClick,
    Eye,
    Calendar,
    Download,
    FileDown,
    ChevronDown,
    Map as MapIcon,
    Globe,
    Smartphone,
    Zap,
    Linkedin,
    Twitter,
    Github,
    Mail,
    Phone,
    Instagram,
    Youtube,
    ExternalLink,
    MessageCircle,
    Send,
    Monitor,
    Tablet,
    QrCode,
    Tv
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import i18n from '../i18n';
import { exportToCSV, exportToJSON } from '../utils/analyticsExport';
import {
    TikTok,
    Pinterest,
    Spotify,
    SoundCloud,
    Bandcamp,
    BandLab,
    Tidal,
    Deezer,
    Pandora,
    IHeartRadio,
    AmazonMusic
} from './BrandIcons';

// Social Icon Mapping
const iconMap: Record<string, any> = {
    linkedin: Linkedin,
    twitter: Twitter,
    github: Github,
    website: Globe,
    email: Mail,
    phone: Phone,
    instagram: Instagram,
    youtube: Youtube,
    tiktok: TikTok,
    pinterest: Pinterest,
    spotify: Spotify,
    soundcloud: SoundCloud,
    bandcamp: Bandcamp,
    bandlab: BandLab,
    tidal: Tidal,
    deezer: Deezer,
    pandora: Pandora,
    iheartradio: IHeartRadio,
    amazonmusic: AmazonMusic,
    whatsapp: MessageCircle,
    telegram: Send,
    vimeo: Tv,
    vcard: SaveIcon,
    wallet: WalletIcon,
    qr: QrCode,
    direct: MousePointerClick,
    mobile: Smartphone,
    tablet: Tablet,
    desktop: Monitor
};

// Simple wrapper for vcard/wallet icons since they aren't in lucide-react standard names I imported
function SaveIcon(props: any) { return <Download {...props} />; }
function WalletIcon(props: any) { return <Smartphone {...props} />; }

// Brand Colors Mapping
const platformColors: Record<string, string> = {
    linkedin: '#0A66C2',
    twitter: '#000000',
    github: '#181717',
    instagram: '#E4405F',
    youtube: '#FF0000',
    tiktok: '#000000',
    whatsapp: '#25D366',
    telegram: '#24A1DE',
    facebook: '#1877F2',
    spotify: '#1DB954',
    soundcloud: '#FF3300',
    pinterest: '#BD081C',
    vimeo: '#1AB7EA',
    email: '#EA4335',
    phone: '#34A853',
    website: '#3B82F6',
    vcard: '#F59E0B',
    wallet: '#000000',
    qr: '#F59E0B',
    direct: '#10B981',
    mobile: '#3B82F6',
    tablet: '#8B5CF6',
    desktop: '#94A3B8'
};

function SocialIcon({ platform, className = "w-4 h-4" }: { platform: string; className?: string }) {
    const Icon = iconMap[platform.toLowerCase()] || ExternalLink;
    const color = platformColors[platform.toLowerCase()] || '#6B7280';
    return <Icon className={className} style={{ color }} />;
}

// Fix for default marker icons in Leaflet + Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AnalyticsData {
    totalViews: number;
    totalClicks: number;
    ctr: number;
    dailyStats: Array<{
        date: string;
        fullDate: string;
        views: number;
        clicks: number;
    }>;
    clickBreakdown: Array<{
        platform: string;
        type: string;
        count: number;
    }>;
    mediaImpressions?: Array<{
        type: string;
        count: number;
    }>;
    geoStats?: Array<{
        city: string | null;
        region: string | null;
        country: string | null;
        latitude: number | null;
        longitude: number | null;
        viewedAt: string;
    }>;
    deviceStats?: Array<{
        type: string;
        count: number;
    }>;
    sourceStats?: Array<{
        source: string;
        count: number;
    }>;
}

interface AnalyticsDashboardProps {
    slug?: string;
    cardId?: number;
    onClose?: () => void;
}

export function AnalyticsDashboard({ slug, cardId, onClose }: AnalyticsDashboardProps) {
    const { t } = useTranslation();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [rangeOption, setRangeOption] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { getToken } = useAuth();

    useEffect(() => {
        if (!slug && !cardId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (slug) params.append('slug', slug);
                if (cardId) params.append('cardId', cardId.toString());

                // Calculate dates
                let start: Date;
                let end = new Date(); // Default end is now

                if (rangeOption === 'custom') {
                    if (!customStart || !customEnd) return; // Don't fetch if incomplete
                    start = new Date(customStart);
                    end = new Date(customEnd);
                } else {
                    start = new Date();
                    const days = parseInt(rangeOption); // '7d' -> 7
                    start.setDate(start.getDate() - days);
                }

                params.append('startDate', start.toISOString());
                params.append('endDate', end.toISOString());

                const token = await getToken();
                const res = await fetch(`/api/analytics?${params.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const jsonData = await res.json();

                // Extract media impressions for the data object
                const mediaImpressions = (jsonData.clickBreakdown || [])
                    .filter((item: any) => item.type === 'media')
                    .map((item: any) => ({
                        type: formatPlatformName(item.platform),
                        count: item.count
                    }));

                setData({
                    ...jsonData,
                    mediaImpressions
                });
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Error loading data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, cardId, rangeOption, customStart, customEnd]);

    const formatPlatformName = (platform: string) => {
        if (!platform) return t('Unknown');

        // Handle URLs
        if (platform.startsWith('http')) {
            try {
                const hostname = new URL(platform).hostname.replace(/^www\./, '');
                return hostname;
            } catch {
                return t('External Link');
            }
        }

        const map: Record<string, string> = {
            instagram: 'Instagram',
            linkedin: 'LinkedIn',
            tiktok: 'TikTok',
            youtube: 'YouTube',
            github: 'GitHub',
            twitter: 'X (Twitter)',
            facebook: 'Facebook',
            website: t('Website'),
            email: t('Email'),
            phone: t('Phone'),
            vcard: t('Save Contact'),
            wallet: t('Wallet Pass'),
            whatsapp: 'WhatsApp',
            telegram: 'Telegram',
            spotify: 'Spotify',
            soundcloud: 'SoundCloud',
            pinterest: 'Pinterest',
            vimeo: 'Vimeo'
        };
        // Use translation map if available, otherwise just capitalize
        return map[platform.toLowerCase()] || platform.charAt(0).toUpperCase() + platform.slice(1);
    };

    // Helper to format date based on current language
    const formatDate = (value: any) => {
        if (!value) return '';
        const dateString = typeof value === 'string' ? value : String(value);

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric' }).format(date);
        } catch (e) {
            return dateString;
        }
    };

    // Helper to get current range text for export
    const getRangeText = () => {
        if (rangeOption === 'custom') {
            return `${customStart} to ${customEnd}`;
        }
        return t(`Last ${rangeOption.replace('d', '')} Days`) || rangeOption;
    };

    const handleExport = (format: 'csv' | 'json') => {
        if (!data) return;
        setExporting(true);

        const exportData = {
            cardName: slug || cardId?.toString() || 'Business Card',
            dateRange: getRangeText(),
            ...data
        };

        try {
            if (format === 'csv') {
                exportToCSV(exportData);
            } else {
                exportToJSON(exportData);
            }
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
            setShowExportMenu(false);
        }
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-500">{t('Loading analytics...')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-96">
                <p className="text-red-500 mb-4">{t('Error')}: {error}</p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    {t('Close')}
                </button>
            </div>
        );
    }

    if (!data) return null;

    // Prepare chart data with formatted labels
    const chartData = data.clickBreakdown.map(item => ({
        ...item,
        platformLabel: formatPlatformName(item.platform)
    }));

    // Custom Tick for Y-Axis to show ONLY icons
    const CustomYAxisTick = (props: any) => {
        const { x, y, payload } = props;
        const platform = data.clickBreakdown[payload.index]?.platform || '';

        return (
            <g transform={`translate(${x},${y})`}>
                <foreignObject x={-40} y={-12} width={30} height={30}>
                    <div className="flex items-center justify-end">
                        <SocialIcon platform={platform} className="w-6 h-6" />
                    </div>
                </foreignObject>
            </g>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-5xl w-full mx-auto relative">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('Analytics Dashboard')}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('Performance for')} <span className="font-medium text-gray-700">/{slug || cardId}</span>
                    </p>
                </div>

                {/* Date Controls */}
                <div className="flex items-center gap-2">
                    <div className="text-gray-400">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <select
                        value={rangeOption}
                        onChange={(e) => setRangeOption(e.target.value as any)}
                        className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="7d">{t('Last 7 Days')}</option>
                        <option value="30d">{t('Last 30 Days')}</option>
                        <option value="90d">{t('Last 90 Days')}</option>
                        <option value="custom">{t('Custom Range')}</option>
                    </select>

                    {/* Export Dropdown */}
                    <div className="relative ml-2">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span className="hidden sm:inline">{t('Export')}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showExportMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowExportMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20">
                                    <button
                                        onClick={() => handleExport('csv')}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
                                    >
                                        <FileDown className="w-4 h-4 text-gray-500" />
                                        {t('Export as CSV')}
                                    </button>
                                    <button
                                        onClick={() => handleExport('json')}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
                                    >
                                        <FileDown className="w-4 h-4 text-gray-500" />
                                        {t('Export as JSON')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {rangeOption === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                            />
                        </div>
                    )}
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[80vh]">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Eye className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium text-blue-800">{t('Total Views')}</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{data.totalViews}</p>
                    </div>

                    <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                                <MousePointerClick className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium text-violet-800">{t('Total Clicks')}</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{data.totalClicks}</p>
                    </div>

                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium text-emerald-800">{t('Click Through Rate')}</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{data.ctr}%</p>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Traffic Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('Traffic Overview')}</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="fullDate"
                                        tickFormatter={formatDate}
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        labelFormatter={formatDate}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="views"
                                        name={t('Page Views') || "Page Views"}
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="clicks"
                                        name={t('Interactions') || "Interactions"}
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Geographic Distribution Map */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-500" />
                                {t('Geographic Distribution')}
                            </h3>
                            <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                {data.geoStats?.length || 0} {t('Recent Locations')}
                            </span>
                        </div>

                        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-100 relative z-0">
                            {data.geoStats && data.geoStats.length > 0 ? (
                                <MapContainer
                                    center={[20, 0]}
                                    zoom={2}
                                    scrollWheelZoom={false}
                                    className="h-full w-full"
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {data.geoStats.map((stat, idx) => (
                                        stat.latitude && stat.longitude && (
                                            <Marker key={idx} position={[stat.latitude, stat.longitude]}>
                                                <Popup>
                                                    <div className="p-1">
                                                        <div className="font-bold text-gray-900 mb-1">
                                                            {stat.city ? `${stat.city}, ` : ''}
                                                            {stat.country || t('Unknown Location')}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                                                            <span>{new Date(stat.viewedAt).toLocaleDateString(i18n.language, { dateStyle: 'medium' })}</span>
                                                            <span className="font-medium text-blue-600">
                                                                {new Date(stat.viewedAt).toLocaleTimeString(i18n.language, { timeStyle: 'short' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        )
                                    ))}
                                </MapContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                    <MapIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p>{t('No location data available for this range')}</p>
                                    <p className="text-xs mt-1">{t('Only views from the last 100 card accesses are shown')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Device & Source Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-1 lg:col-span-2">
                        {/* Device Types */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-purple-500" />
                                {t('Device Distribution')}
                            </h3>
                            <div className="h-64">
                                {data.deviceStats && data.deviceStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.deviceStats}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="count"
                                                nameKey="type"
                                            >
                                                {data.deviceStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={
                                                        entry.type === 'mobile' ? '#3B82F6' :
                                                            entry.type === 'tablet' ? '#8B5CF6' :
                                                                '#94A3B8'
                                                    } />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(val: any, name: any) => [val, t(`device.${name}`) || name]}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend
                                                formatter={(value) => (
                                                    <span className="inline-flex items-center justify-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                        <SocialIcon platform={value} className="w-5 h-5" />
                                                    </span>
                                                )}
                                                verticalAlign="bottom"
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        {t('No device data')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Traffic Sources */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                {t('Traffic Sources')}
                            </h3>
                            <div className="h-64">
                                {data.sourceStats && data.sourceStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={data.sourceStats}
                                            layout="vertical"
                                            margin={{ left: 20, right: 30, top: 0, bottom: 0 }}
                                        >
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="source"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={(props) => {
                                                    const { x, y, payload } = props;
                                                    const source = payload.value;
                                                    return (
                                                        <g transform={`translate(${x},${y})`}>
                                                            <foreignObject x={-40} y={-10} width={30} height={20}>
                                                                <div className="flex items-center justify-end">
                                                                    <SocialIcon platform={source} className="w-5 h-5" />
                                                                </div>
                                                            </foreignObject>
                                                        </g>
                                                    );
                                                }}
                                                width={40}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                formatter={(val: any, _name: any, props: any) => [val, t(`source.${props.payload.source}`) || props.payload.source]}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar
                                                dataKey="count"
                                                radius={[0, 4, 4, 0]}
                                                barSize={32}
                                            >
                                                {data.sourceStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={
                                                        entry.source === 'qr' ? '#F59E0B' :
                                                            entry.source === 'direct' ? '#10B981' :
                                                                '#3B82F6'
                                                    } />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        {t('No source data')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Engagement Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('Top Interactions')}</h3>
                        {data.clickBreakdown.length > 0 ? (
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData.slice(0, 5)}
                                        layout="vertical"
                                        margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="platformLabel"
                                            type="category"
                                            tick={<CustomYAxisTick />}
                                            tickLine={false}
                                            axisLine={false}
                                            width={40}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#F3F4F6' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar
                                            dataKey="count"
                                            name={t('Clicks') || "Clicks"}
                                            fill="#10B981"
                                            radius={[0, 4, 4, 0]}
                                            barSize={32}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <MousePointerClick className="w-8 h-8 mb-2 opacity-50" />
                                <p>{t('No interactions yet')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {data.clickBreakdown.length > 5 && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500">
                            {t('And more interaction types', { count: data.clickBreakdown.length - 5 })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
