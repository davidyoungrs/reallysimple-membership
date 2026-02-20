import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BusinessCard } from './BusinessCard';
import { type CardData } from '../types';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

export function PublicCard() {
    const { slug } = useParams<{ slug: string }>();
    const { getToken } = useAuth();
    const { t } = useTranslation();
    const [cardData, setCardData] = useState<CardData | null>(null);
    const [ownerTier, setOwnerTier] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastTrackedSlug = useRef<string | null>(null);

    useEffect(() => {
        const fetchCard = async () => {
            if (!slug) {
                setError('No slug provided');
                setLoading(false);
                return;
            }

            try {
                // Get source and simulation params
                const searchParams = new URLSearchParams(window.location.search);
                const source = searchParams.get('src') || 'direct';
                const isSimulator = searchParams.get('simulator') === 'true';

                let headers: Record<string, string> = {};
                if (isSimulator) {
                    try {
                        const token = await getToken();
                        if (token) headers['Authorization'] = `Bearer ${token}`;
                    } catch (e) {
                        console.error('Failed to get simulator token:', e);
                    }
                }

                const response = await fetch(`/api/cards?slug=${slug}&${searchParams.toString()}`, {
                    headers
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Card not found');
                    } else {
                        setError('Failed to load card');
                    }
                    setLoading(false);
                    return;
                }

                const result = await response.json();
                setCardData(result.card.data);
                setOwnerTier(result.card.ownerTier || 'starter');
                setLoading(false);

                // Track view (fire-and-forget) - prevent double counting in StrictMode
                if (lastTrackedSlug.current !== slug) {
                    lastTrackedSlug.current = slug;
                    fetch('/api/cards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slug, source, action: 'track', type: 'view' }),
                    }).catch(err => console.error('Failed to track view:', err));
                }

            } catch (err) {
                console.error('Error fetching card:', err);
                setError('Failed to load card');
                setLoading(false);
            }
        };

        fetchCard();
    }, [slug]);

    const handleLinkClick = (type: string, targetInfo: string) => {
        if (!slug || !type) {
            console.error('Missing slug or type for tracking:', { slug, type, targetInfo });
            return;
        }

        console.log('Tracking click:', { slug, type, targetInfo });

        // Use track endpoint
        fetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, type: 'click', typeDetail: type, targetInfo, action: 'track' }),
        }).catch(err => console.error('Failed to track click:', err));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('Loading...')}</p>
                </div>
            </div>
        );
    }

    if (error || !cardData) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Card Not Found</h1>
                    <p className="text-gray-600 mb-6">
                        The business card you're looking for doesn't exist or has been removed.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('Go Home')}
                    </Link>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-3">Want to create your own digital business card?</p>
                        <Link
                            to="/app"
                            className="inline-block bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Create Your Card
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Card Display */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <BusinessCard data={cardData} onLinkClick={handleLinkClick} ownerTier={ownerTier as any} />
                </div>
            </div>

            {/* Footer CTA */}
            {!(cardData.removeBranding && ownerTier !== 'starter') && (
                <div className={`bg-white border-t border-gray-200 py-6 px-6 ${cardData.stickyActionBar ? 'mb-20' : ''}`}>
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="text-gray-600 mb-3">{t('Impressed? Create your own digital business card in minutes.')}</p>
                        <Link
                            to="/"
                            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-6"
                        >
                            {t('Get Started Free')}
                        </Link>

                        <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400 border-t border-gray-100 pt-6">
                            <span>© {new Date().getFullYear()} Really Simple Apps</span>
                            <Link to="/privacy" className="hover:text-gray-600 transition-colors">{t('Privacy')}</Link>
                            <Link to="/terms" className="hover:text-gray-600 transition-colors">{t('Terms')}</Link>
                            <Link to="/cookies" className="hover:text-gray-600 transition-colors">{t('Cookies')}</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
