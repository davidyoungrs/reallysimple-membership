import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Check, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

const TIERS = [
    {
        id: 'starter',
        name: 'Starter',
        price: '$0',
        period: '/month',
        description: 'Perfect for individuals getting started with digital cards.',
        features: [
            '1 Digital Business Card',
            'Basic Analytics (Views & Clicks)',
            'Standard Templates',
            'QR Code Generator',
            'Email Signature Generator'
        ],
        buttonText: 'Get Started',
        priceId: null
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '$5',
        period: '/month',
        description: 'For professionals who want to stand out and track engagement.',
        features: [
            'Up to 3 Digital Business Cards',
            'Advanced Analytics & Geography Data',
            'Custom Themes & Branding',
            'Save to Apple & Google Wallet',
            'Lead Capture Forms'
        ],
        buttonText: 'Subscribe to Pro',
        priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
        popular: true
    },
    {
        id: 'pro_plus',
        name: 'Pro Plus',
        price: '$12',
        period: '/month',
        description: 'For power users needing multiple profiles and advanced features.',
        features: [
            'Up to 10 Digital Business Cards',
            'Remove "Powered By" Watermark',
            'Priority Support',
            'All Pro features included'
        ],
        buttonText: 'Subscribe to Pro Plus',
        priceId: import.meta.env.VITE_STRIPE_PRICE_PLUS_MONTHLY
    }
];

export function Pricing() {
    const { getToken, isLoaded: isAuthLoaded } = useAuth();
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async (priceId: string | null) => {
        if (!priceId) {
            // Free tier, just go to app
            window.location.href = '/app';
            return;
        }

        if (!user) {
            // Need to sign in first
            window.location.href = '/sign-in?redirect_url=/pricing';
            return;
        }

        setIsLoading(priceId);
        setError(null);

        try {
            const token = await getToken();
            const response = await fetch('/api/checkout', {
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
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
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Upgrade your digital networking experience with premium features, detailed analytics, and custom branding.
                    </p>
                </div>

                {error && (
                    <div className="max-w-xl mx-auto mb-8 p-4 bg-red-50 text-red-700 rounded-xl text-center border border-red-100">
                        {error}
                    </div>
                )}

                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TIERS.map((tier) => (
                        <div 
                            key={tier.id}
                            className={`bg-white rounded-3xl p-8 flex flex-col relative ${
                                tier.popular 
                                    ? 'shadow-2xl shadow-blue-900/10 border-2 border-blue-500 scale-105 z-10' 
                                    : 'shadow-lg shadow-gray-200/50 border border-gray-200'
                            }`}
                        >
                            {tier.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                                <p className="text-gray-500 text-sm h-10">{tier.description}</p>
                            </div>

                            <div className="mb-8 flex items-baseline gap-1">
                                <span className="text-5xl font-extrabold text-gray-900">{tier.price}</span>
                                <span className="text-gray-500 font-medium">{tier.period}</span>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-blue-500 shrink-0" />
                                        <span className="text-gray-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleCheckout(tier.priceId)}
                                disabled={isLoading === tier.priceId || (!isAuthLoaded && !!tier.priceId)}
                                className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    tier.popular
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                } disabled:opacity-50`}
                            >
                                {isLoading === tier.priceId ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {tier.buttonText}
                                        {tier.priceId && <ArrowRight className="w-5 h-5" />}
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
