import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Check, ArrowRight, Loader2, ArrowLeft, Globe } from 'lucide-react';
import { BorderBeam } from './ui/border-beam';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const TIERS = [
    {
        id: 'starter',
        name: 'Starter',
        priceMonthlyGbp: 0,
        priceAnnualGbp: 0,
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
        priceMonthlyGbp: 12,
        priceAnnualGbp: 120,
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
        priceMonthlyGbp: 13,
        priceAnnualGbp: 130,
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

const CURRENCIES = [
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'AED', symbol: 'DH', name: 'UAE Dirham' },
];

export function Pricing() {
    const { getToken, isLoaded: isAuthLoaded } = useAuth();
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);
    
    // FX State
    const [selectedCurrency, setSelectedCurrency] = useState('GBP');
    const [rates, setRates] = useState<Record<string, number>>({});
    const [fxLoading, setFxLoading] = useState(false);

    useEffect(() => {
        const fetchRates = async () => {
            setFxLoading(true);
            try {
                // Try internal Stripe FX first
                const response = await fetch('/api/billing?action=get-rates');
                const data = await response.json();
                if (data.rates) {
                    setRates(data.rates);
                    return;
                }
                throw new Error('Internal FX API failed');
            } catch (err) {
                console.warn('Internal FX API failed, falling back to Frankfurter:', err);
                try {
                    // Fallback to public Frankfurter API
                    const response = await fetch('https://api.frankfurter.dev/v2/latest?base=GBP');
                    const data = await response.json();
                    if (data.rates) {
                        setRates(data.rates);
                    }
                } catch (fallbackErr) {
                    console.error('All FX APIs failed:', fallbackErr);
                }
            } finally {
                setFxLoading(false);
            }
        };
        fetchRates();
    }, []);

    const handleCheckout = async (priceId: string | null, tierId: string) => {
        if (!priceId) {
            window.location.href = '/app';
            return;
        }

        if (!user) {
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
                    currency: selectedCurrency.toLowerCase(),
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

    const formatPrice = (gbpAmount: number) => {
        if (gbpAmount === 0) return selectedCurrency === 'GBP' ? '£0' : `${CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || ''}0`;
        
        const rate = selectedCurrency === 'GBP' ? 1 : (rates[selectedCurrency.toLowerCase()] || 1);
        const margin = selectedCurrency === 'GBP' ? 1 : 1.04;
        const converted = gbpAmount * rate * margin;

        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: selectedCurrency,
            maximumFractionDigits: 0,
        }).format(converted);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Home</span>
                    </Link>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                                <SelectTrigger className="w-[120px] h-8 text-sm font-bold border-none bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {CURRENCIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code} className="text-sm font-medium">
                                            {c.code} - {c.symbol}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {!user && (
                            <Link to="/sign-in" className="text-blue-600 hover:text-blue-700 font-bold text-sm">
                                Sign In
                            </Link>
                        )}
                        {user && (
                            <Link to="/app" className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-colors">
                                Dashboard
                            </Link>
                        )}
                    </div>
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
                        const gbpPrice = isAnnual ? tier.priceAnnualGbp : tier.priceMonthlyGbp;
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
                                    <>
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                            <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                                                Recommended
                                            </span>
                                        </div>
                                        <BorderBeam size={250} duration={12} delay={0} />
                                    </>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase italic">{tier.name}</h3>
                                    <p className="text-gray-500 text-sm font-medium leading-relaxed">{tier.description}</p>
                                </div>

                                <div className="mb-8 overflow-hidden">
                                    <div className="flex items-baseline gap-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <span className="text-5xl font-black text-gray-900 tracking-tighter">
                                            {formatPrice(gbpPrice)}
                                        </span>
                                        <span className="text-gray-400 font-bold uppercase text-xs">{displayPeriod}</span>
                                    </div>
                                    {selectedCurrency !== 'GBP' && gbpPrice > 0 && !fxLoading && (
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tight">
                                            Approx. conversion from GBP (inc. 4% processing)
                                        </p>
                                    )}
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
