import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { CreditCard, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTier } from '../contexts/TierContext';

export function SubscriptionManager() {
    const { t } = useTranslation();
    const { getToken } = useAuth();
    const { tier, isLoading: isTierLoading } = useTier();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleManageBilling = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getToken();
            const response = await fetch('/api/create-portal-session', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to open portal');
            }

            const { url } = await response.json();
            window.location.href = url;
            
        } catch (err: any) {
            console.error('Portal error:', err);
            setError(err.message || 'An error occurred while opening the billing portal.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isTierLoading) {
        return <div className="animate-pulse bg-gray-100 h-32 rounded-xl"></div>;
    }

    const tierDisplayNames: Record<string, string> = {
        'starter': 'Starter (Free)',
        'pro': 'Pro',
        'pro_plus': 'Pro Plus',
        'business': 'Business',
        'grandfathered': 'Pro (Grandfathered)'
    };

    const isPremium = tier !== 'starter';

    return (
        <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t('Subscription & Billing')}
            </h3>
            
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{t('Current Plan')}</p>
                        <div className="flex items-center gap-2">
                            <h4 className="text-2xl font-bold text-gray-900">
                                {tierDisplayNames[tier || 'starter'] || 'Starter'}
                            </h4>
                            {isPremium && (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="flex gap-3">
                    {isPremium ? (
                        <button
                            onClick={handleManageBilling}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading ? t('Loading...') : t('Manage Billing')}
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    ) : (
                        <a
                            href="/pricing"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                            {t('Upgrade to Pro')}
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
}
