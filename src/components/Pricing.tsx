import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Check, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

const TIERS = [
    {
        id: 'starter',
        name: 'Starter',
        priceMonthly: '$0',
        priceAnnual: '$0',
        period: '/month',
        description: 'Perfect for individuals getting started with digital cards.',
        features: [
            '1 Online Digital Business Card',
            'Standard Templates',
            'QR Code Generator',
            'Email Signature Generator'
        ],
        buttonText: 'Get Started',
        priceIdMonthly: null,
        priceIdAnnual: null
    },
    {
        id: 'pro',
        name: 'Pro',
        priceMonthly: '$12',
        priceAnnual: '$120',
        period: '/month',
        description: 'For professionals who want to stand out and track engagement.',
        features: [
            'Up to 3 Digital Business Cards Online and Phone Wallet',
            'Analytics & Geography Data',
            'Custom Themes & Branding',
            'Save to Apple & Google Wallet',
            'Lead Capture Forms',
            'Custom Slug: Personalized URL link (e.g., card/sarah_jenkins)'
        ],
        buttonText: 'Subscribe to Pro',
        priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
        priceIdAnnual: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY,
        popular: true
    },
    {
        id: 'pro_plus',
        name: 'Pro Plus',
        priceMonthly: '$13',
        priceAnnual: '$130',
        period: '/month',
        description: 'For power users, designers, influencers who needing multiple profiles and advanced features.',
        features: [
            'All Pro features included',
            'Priority Support',
            'Strip Designer 2.0: Full access to the canvas tool to design custom Wallet strips and images',
            'Rich Media: Embed YouTube, TikTok, Vimeo, and Spotify players directly on the card.',
            'Advanced Analytics: Detailed click tracking and location heatmaps.'
        ],
        buttonText: 'Subscribe to Pro Plus',
        priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PLUS_MONTHLY,
        priceIdAnnual: import.meta.env.VITE_STRIPE_PRICE_PLUS_YEARLY
    }
];

export function Pricing() {
    const { getToken, isLoaded: isAuthLoaded } = useAuth();
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);

    const handleCheckout = async (priceId: string | null, tierId: string) => {
        if (!priceId) {
            // Free tier, just go to app
            window.location.href = '/app';
            return;
        }

        if (!user) {
            // Need to sign in first
            window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        setIsLoading(tierId);
        setError(null);

        try {
            const token = await getToken();
            const response = await fetch('/api/billing?action=checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    priceId,
                    successUrl: `${window.location.origin}/dashboard?checkout=success`,
                    cancelUrl: `${window.location.origin}/pricing?checkout=cancel`
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Checkout failed');
            }

            const { url } = await response.json();
            window.location.href = url;
            
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'An error occurred during checkout. Please try again.');
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Home</span>
                    </Link>
                    {!user && (
                        <Link to="/sign-in" className="text-blue-600 hover:text-blue-700 font-bold">
                            Sign In
                        </Link>
                    )}
                </div>
            </header>

            <main className="flex-1 py-16 px-4">
                <div className="max-w-7xl mx-auto text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight uppercase italic">
                        Pricing Models
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        Choose the plan that fits your professional networking needs.
                    </p>

                    {/* Simple Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <span className={`text-sm font-bold ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
                        <button 
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="w-14 h-7 bg-gray-200 rounded-full relative p-1 transition-colors hover:bg-gray-300"
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-sm font-bold ${isAnnual ? 'text-blue-600' : 'text-gray-500'}`}>
                            Yearly <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] ml-1 uppercase tracking-wider font-black">Save 20%</span>
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="max-w-xl mx-auto mb-8 p-4 bg-red-50 text-red-700 rounded-xl text-center border border-red-100">
                        {error}
                    </div>
                )}

                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TIERS.map((tier) => {
                        const priceId = isAnnual ? tier.priceIdAnnual : tier.priceIdMonthly;
                        const displayPrice = isAnnual ? tier.priceAnnual : tier.priceMonthly;
                        const displayPeriod = isAnnual ? '/year' : '/month';

                        return (
                            <div 
                                key={tier.id}
                                className={`bg-white rounded-3xl p-8 flex flex-col relative transition-all duration-300 ${
                                    tier.popular 
                                        ? 'shadow-2xl shadow-blue-400/20 border-2 border-blue-500 scale-105 z-10' 
                                        : 'shadow-lg shadow-gray-200/50 border border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {tier.popular && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                                            Recommended
                                        </span>
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase italic">{tier.name}</h3>
                                    <p className="text-gray-500 text-sm font-medium leading-relaxed">{tier.description}</p>
                                </div>

                                <div className="mb-8 flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-gray-900 tracking-tighter">{displayPrice}</span>
                                    <span className="text-gray-400 font-bold uppercase text-xs">{displayPeriod}</span>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="mt-1 bg-blue-100 rounded-full p-0.5">
                                                <Check className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <span className="text-gray-700 text-sm font-medium leading-tight">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleCheckout(priceId, tier.id)}
                                    disabled={isLoading === tier.id || (!isAuthLoaded && !!priceId)}
                                    className={`w-full py-4 px-6 rounded-2xl font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        tier.popular
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200'
                                            : 'bg-gray-900 text-white hover:bg-black'
                                    } disabled:opacity-50`}
                                >
                                    {isLoading === tier.id ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Wait...
                                        </>
                                    ) : (
                                        <>
                                            {tier.buttonText}
                                            {priceId && <ArrowRight className="w-5 h-5" />}
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
