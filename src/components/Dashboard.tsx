import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { ArrowLeft, Edit, Trash2, Eye, Plus, LayoutGrid, Settings as SettingsIcon, BarChart2, Users } from 'lucide-react';
import { BusinessCard } from './BusinessCard';
import { ShareMenu } from './ShareMenu';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
// import { ActivityFeed } from './ActivityFeed'; // Ensure this exists or imported if used
import { ActivityFeed } from './ActivityFeed'; // Re-adding in case it was missed, tool requires exact match usually or complete block replacement.
import { DashboardCharts } from './DashboardCharts';
import { ProfileSettings } from './ProfileSettings';
import { WalletPreview } from './WalletBuilder';
import { LeadsManager } from './leads/LeadsManager';

interface Card {
    id: number;
    uid: string;
    slug: string;
    data: any;
    viewCount: number;
    updatedAt: string;
}

interface UserAnalytics {
    totalViews: number;
    totalClicks: number;
    dailyStats: any[];
    recentActivity: any[];
}

export function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useUser();
    const { getToken } = useAuth();
    const [cards, setCards] = useState<Card[]>([]);
    const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
    const [activeTab, setActiveTab] = useState<'cards' | 'leads' | 'settings'>('cards'); // Added 'leads'
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
    const [deleteConfirmCard, setDeleteConfirmCard] = useState<{ id: number; name: string } | null>(null);
    const [analyticsCard, setAnalyticsCard] = useState<Card | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load cards and analytics on mount
    useEffect(() => {
        if (user) {
            loadCards();
            loadUserAnalytics();
        }
    }, [user]);

    const loadCards = async () => {
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch('/api/cards', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCards(data.cards || []);
            }
        } catch (error) {
            console.error('Error loading cards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserAnalytics = async () => {
        setIsAnalyticsLoading(true);
        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch('/api/analytics?scope=user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUserAnalytics(data);
            }
        } catch (error) {
            console.error('Error loading user analytics:', error);
        } finally {
            setIsAnalyticsLoading(false);
        }
    };

    const handleEdit = (card: Card) => {
        navigate('/app', { state: { cardId: card.id } });
    };

    const handleDelete = async (cardId: number) => {
        if (!user) return;

        setIsDeleting(true);
        try {
            const token = await getToken();
            const response = await fetch(`/api/cards?id=${cardId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setCards(cards.filter(c => c.id !== cardId));
                setDeleteConfirmCard(null);
                // Reload analytics as well
                loadUserAnalytics();
            }
        } catch (error) {
            console.error('Error deleting card:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link
                                to="/"
                                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="text-sm font-medium hidden sm:inline">{t('Home')}</span>
                            </Link>

                            <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('cards')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'cards'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    {t('My Cards')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('leads')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'leads'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Users className="w-4 h-4" />
                                    {t('Leads')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'settings'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <SettingsIcon className="w-4 h-4" />
                                    {t('Settings')}
                                </button>
                            </nav>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:block">
                                <LanguageSelector />
                            </div>
                            <Link
                                to="/app"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm font-bold hidden sm:inline">{t('Create New')}</span>
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'settings' ? (
                    <ProfileSettings />
                ) : activeTab === 'leads' ? (
                    <LeadsManager />
                ) : (
                    <>
                        {/* Cards Section */}
                        {/* Dashboard Insights */}
                        {cards.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="lg:col-span-2">
                                    <DashboardCharts
                                        data={userAnalytics?.dailyStats || []}
                                        totalViews={userAnalytics?.totalViews || 0}
                                        totalClicks={userAnalytics?.totalClicks || 0}
                                        isLoading={isAnalyticsLoading}
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <ActivityFeed
                                        activities={userAnalytics?.recentActivity || []}
                                        isLoading={isAnalyticsLoading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Cards Section */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">{t('Your Cards')}</h2>
                            <p className="text-sm text-gray-500">{cards.length} {t('cards')}</p>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white rounded-2xl h-[400px] animate-pulse border border-gray-100" />
                                ))}
                            </div>
                        ) : cards.length === 0 ? (
                            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center max-w-2xl mx-auto mt-12">
                                <div className="text-8xl mb-6 grayscale opacity-50 select-none">📇</div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('Ready to make an impression?')}</h2>
                                <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                                    {t('Create your first digital business card and start sharing your profile with the world.')}
                                </p>
                                <Link
                                    to="/app"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 text-lg font-bold"
                                >
                                    <Plus className="w-6 h-6" />
                                    <span>{t('Create Your First Card')}</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-1000 mb-12">
                                {cards.map((card) => (
                                    <div
                                        key={card.id}
                                        className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-1"
                                    >
                                        {/* Card Preview */}
                                        <div className="relative bg-gray-50 h-[380px] overflow-hidden border-b border-gray-50 rounded-t-2xl">
                                            {card.data.wallet ? (
                                                <div className="flex h-full p-4 gap-4 items-center justify-center overflow-hidden">
                                                    {/* Online Card */}
                                                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('Online')}</span>
                                                        <div className="flex items-center justify-center overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm" style={{ width: '160px', height: '280px' }}>
                                                            <div className="origin-center scale-[0.3571] pointer-events-none" style={{ width: '448px', height: '784px' }}>
                                                                <BusinessCard data={card.data} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Apple Wallet */}
                                                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('Wallet')}</span>
                                                        <div className="flex items-center justify-center overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm" style={{ width: '160px', height: '280px' }}>
                                                            <div className="origin-center scale-[0.5] pointer-events-none" style={{ width: '320px', height: '560px' }}>
                                                                <WalletPreview data={card.data} isPreview={true} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="scale-[0.4] origin-top translate-y-[5%]" style={{ width: '448px', height: '800px' }}>
                                                        <BusinessCard data={card.data} />
                                                    </div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />
                                                </>
                                            )}

                                            {/* Hover Play Button / View */}
                                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => navigate(`/card/${card.slug || card.uid}`)}
                                                    className="p-3 bg-white rounded-full shadow-lg text-gray-900 hover:scale-110 transition-transform z-10"
                                                >
                                                    <Eye className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card Info */}
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <h3 className="font-bold text-gray-900 truncate flex-1">
                                                    {card.data.name || card.data.fullName || t('Untitled Card')}
                                                </h3>
                                                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                    <Eye className="w-3 h-3" />
                                                    {card.viewCount || 0}
                                                </div>
                                            </div>

                                            {card.slug && (
                                                <p className="text-[10px] text-gray-400 font-mono truncate mb-4 uppercase tracking-widest bg-gray-50 inline-block px-2 py-0.5 rounded">
                                                    /{card.slug}
                                                </p>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 mt-auto">
                                                <button
                                                    onClick={() => handleEdit(card)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    {t('Edit')}
                                                </button>

                                                {card.slug && (
                                                    <>
                                                        <button
                                                            onClick={() => setAnalyticsCard(card)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title={t('View Analytics') || "View Analytics"}
                                                        >
                                                            <BarChart2 className="w-5 h-5" />
                                                        </button>
                                                        <ShareMenu
                                                            cardSlug={card.slug || card.uid}
                                                            data={card.data}
                                                        />
                                                    </>
                                                )}

                                                <button
                                                    onClick={() => setDeleteConfirmCard({ id: card.id, name: card.data.name || card.data.fullName || t('Untitled Card') })}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title={t('Delete card') || "Delete card"}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {deleteConfirmCard && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 scale-in-center overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('Delete Card?')}</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            {t('Are you sure you want to delete "{{name}}"?', { name: deleteConfirmCard.name })} {t('This will permanently remove all analytics data associated with this card.')}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteConfirmCard(null)}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                {t('Cancel')}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmCard.id)}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                            >
                                {isDeleting ? t('Deleting...') : t('Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal */}
            {analyticsCard && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-full max-w-5xl">
                        <AnalyticsDashboard
                            cardId={analyticsCard.id}
                            slug={analyticsCard.slug}
                            onClose={() => setAnalyticsCard(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
