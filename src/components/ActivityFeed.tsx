import { useTranslation } from 'react-i18next';
import { Eye, MousePointerClick, Clock, User } from 'lucide-react';

interface ActivityItem {
    type: 'view' | 'click';
    timestamp: string;
    cardId: number;
    // View details
    city?: string;
    country?: string;
    // Click details
    clickType?: string;
    targetInfo?: string;
    card: {
        name: string;
        slug: string;
    };
}

interface ActivityFeedProps {
    activities: ActivityItem[];
    isLoading: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
    const { t } = useTranslation();

    const getTimeLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('Just now');
        if (diffMins < 60) return `${diffMins}m ${t('ago')}`;
        if (diffHours < 24) return `${diffHours}h ${t('ago')}`;
        return `${diffDays}d ${t('ago')}`;
    };

    const getDetails = (item: ActivityItem) => {
        if (item.type === 'view') {
            const location = [item.city, item.country || t('Unknown')].filter(Boolean).join(', ');
            return location || t('Unknown Location');
        } else {
            // Translate the click type if possible, otherwise capitalize
            const typeLabel = item.clickType ? (t(item.clickType) !== item.clickType ? t(item.clickType) : item.clickType.charAt(0).toUpperCase() + item.clickType.slice(1)) : t('Link');
            return `${typeLabel}: ${item.targetInfo}`;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    {t('Recent Activity')}
                </h3>
            </div>

            <div className="divide-y divide-gray-50 max-h-[304px] overflow-y-auto">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="p-3 animate-pulse flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-100 rounded w-3/4" />
                                <div className="h-2 bg-gray-50 rounded w-1/2" />
                            </div>
                        </div>
                    ))
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center">
                        <User className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">{t('No activity yet')}</p>
                    </div>
                ) : (
                    activities.map((item, idx) => (
                        <div key={idx} className="p-3 hover:bg-gray-50 transition-colors flex gap-3 items-start">
                            <div className={`p-2 rounded-full flex-shrink-0 ${item.type === 'view' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                {item.type === 'view' ? <Eye className="w-4 h-4" /> : <MousePointerClick className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 font-medium truncate">
                                    {item.type === 'view' ? t('New View') : t('Link Clicked')}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {item.card.name} • {getDetails(item)}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
                                    {getTimeLabel(item.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
