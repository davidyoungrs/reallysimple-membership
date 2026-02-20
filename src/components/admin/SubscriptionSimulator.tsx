import { useState } from 'react';
import { Shield, Play, AlertTriangle, ExternalLink, CreditCard } from 'lucide-react';
import type { SubscriptionTier, SubscriptionStatus } from '../../utils/tier-limits';

export function SubscriptionSimulator() {
    const [slug, setSlug] = useState('');
    const [tier, setTier] = useState<SubscriptionTier>('starter');
    const [status, setStatus] = useState<SubscriptionStatus>('active');
    const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0]);

    const tiers: SubscriptionTier[] = ['starter', 'pro', 'pro_plus', 'business', 'grandfathered'];
    const statuses: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid'];

    const getSimulatedUrl = () => {
        const params = new URLSearchParams({
            sim_tier: tier,
            sim_status: status || '',
            sim_end: periodEnd,
            simulator: 'true'
        });
        return `/card/${slug}?${params.toString()}`;
    };

    const getApplePassUrl = () => {
        const params = new URLSearchParams({
            type: 'apple',
            slug: slug,
            sim_tier: tier,
            sim_status: status || '',
            sim_end: periodEnd
        });
        return `/api/passes?${params.toString()}`;
    };

    const getGooglePassUrl = () => {
        const params = new URLSearchParams({
            type: 'google',
            slug: slug,
            sim_tier: tier,
            sim_status: status || '',
            sim_end: periodEnd
        });
        return `/api/passes?${params.toString()}`;
    };

    const triggerPushUpdate = async () => {
        if (!slug) return;
        try {
            const res = await fetch('/api/admin/push-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug })
            });
            const data = await res.json();
            alert(data.message || 'Push triggered');
        } catch (err) {
            console.error(err);
            alert('Failed to trigger push');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Access Control Simulator</h2>
                </div>
                <p className="text-sm text-gray-500">
                    Test how cards look and behave under different subscription states without affecting real data.
                </p>
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Target Card */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Card Slug</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/card/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className="w-full pl-14 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="e.g. david"
                            />
                        </div>
                    </div>

                    {/* Subscription Tier */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Simulated Tier</label>
                        <select
                            value={tier}
                            onChange={(e) => setTier(e.target.value as any)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            {tiers.map(t => (
                                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Subscription Status</label>
                        <select
                            value={status || ''}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            {statuses.map(s => (
                                <option key={s || 'null'} value={s || ''}>{s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : 'None'}</option>
                            ))}
                        </select>
                    </div>

                    {/* Period End */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Period End (Current/Expired)</label>
                        <input
                            type="date"
                            value={periodEnd}
                            onChange={(e) => setPeriodEnd(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex gap-3 text-sm text-purple-700">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold mb-1">How simulation works:</p>
                        <ul className="list-disc list-inside space-y-1 opacity-90">
                            <li>Overrides are temporary and handled via URL parameters.</li>
                            <li>The API will only honor these overrides if you are logged in as an Admin.</li>
                            <li>Test the 3-day grace period by setting "Past Due" with a date ~2 days ago.</li>
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-100 mt-4">
                    <button
                        onClick={() => window.open(getApplePassUrl(), '_blank')}
                        disabled={!slug}
                        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-black transition-colors disabled:opacity-50"
                    >
                        <CreditCard className="w-4 h-4" />
                        Download Apple Pass (Sim)
                    </button>

                    <button
                        onClick={() => window.open(getGooglePassUrl(), '_blank')}
                        disabled={!slug}
                        className="flex items-center gap-2 bg-[#1a73e8] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <CreditCard className="w-4 h-4" />
                        Save to Google (Sim)
                    </button>

                    <button
                        onClick={triggerPushUpdate}
                        disabled={!slug}
                        className="flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                        title="Simulate an APNs push to trigger phones to check for updates"
                    >
                        <Shield className="w-4 h-4" />
                        Trigger Push Update
                    </button>

                    <button
                        onClick={() => window.open(getSimulatedUrl(), '_blank')}
                        disabled={!slug}
                        className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Play className="w-4 h-4" />
                        Preview Digital Card
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
