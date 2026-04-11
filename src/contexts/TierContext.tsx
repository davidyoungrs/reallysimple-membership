import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

export type UserTier = 'starter' | 'pro' | 'pro_plus' | 'business' | 'grandfathered';

interface TierContextType {
    tier: UserTier;
    subscriptionStatus: string | null;
    isLoading: boolean;
    refreshTier: () => Promise<void>;
    isFeatureEnabled: (feature: string) => boolean;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

export function TierProvider({ children }: { children: React.ReactNode }) {
    const { getToken } = useAuth();
    const { isLoaded, isSignedIn } = useUser();
    const [tier, setTier] = useState<UserTier>('starter');
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTier = async () => {
        if (!isSignedIn) {
            setIsLoading(false);
            return;
        }

        try {
            const token = await getToken();
            const res = await fetch('/api/user', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (data.success) {
                setTier(data.user.tier);
                setSubscriptionStatus(data.user.subscriptionStatus);
            }
        } catch (error) {
            console.error('Failed to fetch tier:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            fetchTier();
        }

        const handleFocus = () => {
            if (isLoaded && isSignedIn) {
                fetchTier();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [isLoaded, isSignedIn]);

    const isFeatureEnabled = (feature: string): boolean => {
        // Grandfathered and Business check
        if (tier === 'grandfathered' || tier === 'business') return true;

        switch (feature) {
            case 'custom_slug':
                return tier !== 'starter';
            case 'custom_theme':
                return tier !== 'starter';
            case 'remove_branding':
                return tier !== 'starter';
            case 'wallet_passes':
                return tier !== 'starter';
            case 'strip_designer':
                return (tier as string) === 'pro_plus' || (tier as string) === 'business';
            case 'rich_media':
                return (tier as string) === 'pro_plus' || (tier as string) === 'business';
            case 'advanced_analytics':
                return (tier as string) === 'pro_plus' || (tier as string) === 'business';
            case 'multiple_cards':
                return tier !== 'starter'; // Starter only 1, others up to 5
            default:
                return false;
        }
    };

    return (
        <TierContext.Provider value={{ tier, subscriptionStatus, isLoading, refreshTier: fetchTier, isFeatureEnabled }}>
            {children}
        </TierContext.Provider>
    );
}

export function useTier() {
    const context = useContext(TierContext);
    if (context === undefined) {
        throw new Error('useTier must be used within a TierProvider');
    }
    return context;
}
