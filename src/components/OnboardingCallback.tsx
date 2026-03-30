import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function OnboardingCallback() {
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Setting up your account...');
    
    useEffect(() => {
        if (!isLoaded) return;
        
        if (!isSignedIn) {
            navigate('/sign-in');
            return;
        }

        const processOnboarding = async () => {
            try {
                // 1. Get Wizard Data
                const wizardDataStr = localStorage.getItem('wizard_data');
                const intendedTier = localStorage.getItem('intended_tier') || 'starter';
                
                if (!wizardDataStr) {
                    // No wizard data found. Normal login path.
                    navigate('/app');
                    return;
                }

                setStatus('Saving your new digital business card...');
                const wizardData = JSON.parse(wizardDataStr);
                const token = await getToken();

                // 2. Save Card Data
                const saveResponse = await fetch('/api/cards', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        cardData: wizardData,
                        userId: user?.id
                    })
                });

                if (!saveResponse.ok) {
                    console.error('Failed to save initial card data', await saveResponse.text());
                    // Don't throw, we still want to log them in, they just might have to re-enter data
                }

                // 3. Clean up storage
                localStorage.removeItem('wizard_data');
                localStorage.removeItem('intended_tier');

                // 4. Handle Routing based on Tier
                if (intendedTier === 'pro' || intendedTier === 'pro_plus') {
                    setStatus('Preparing secure checkout...');
                    
                    const priceId = intendedTier === 'pro' 
                        ? import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY 
                        : import.meta.env.VITE_STRIPE_PRICE_PLUS_MONTHLY;

                    if (!priceId) {
                        console.error('Missing Stripe Price ID for', intendedTier);
                        navigate('/dashboard');
                        return;
                    }

                    const checkoutResponse = await fetch('/api/billing?action=checkout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            priceId,
                            currency: 'gbp', // Defaulting to GBP for onboarding, can be upgraded later to auto-detect
                            successUrl: `${window.location.origin}/dashboard?checkout=success&onboarding=true`,
                            cancelUrl: `${window.location.origin}/dashboard` // if they cancel, send to dashboard (card is already saved!)
                        })
                    });

                    if (!checkoutResponse.ok) {
                        throw new Error('Failed to create checkout session');
                    }

                    const { url } = await checkoutResponse.json();
                    window.location.href = url;
                } else {
                    // Starter Tier
                    navigate('/dashboard');
                }

            } catch (err) {
                console.error("Onboarding logic error:", err);
                setStatus("Wrapping things up...");
                setTimeout(() => navigate('/dashboard'), 1500);
            }
        };

        // Delay slightly so the UI doesn't flash aggressively if it resolves instantly
        const timer = setTimeout(() => {
            processOnboarding();
        }, 800);

        return () => clearTimeout(timer);

    }, [isLoaded, isSignedIn, navigate, getToken, user?.id]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in slide-in-from-bottom-4 duration-500">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-blue-600 rounded-full w-full h-full flex items-center justify-center shadow-lg">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Almost there!</h1>
                <p className="text-gray-500 font-medium">{status}</p>
                
                <div className="mt-8 pt-8 border-t border-gray-100">
                    <img src="/logo.png" alt="Really Simple Apps" className="h-6 mx-auto opacity-50 grayscale" />
                </div>
            </div>
        </div>
    );
}
