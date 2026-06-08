import React, { createContext, useContext } from 'react';

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
    const tier: UserTier = 'business';
    const subscriptionStatus = 'active';
    const isLoading = false;

    const fetchTier = async () => {};
    const isFeatureEnabled = (): boolean => true;

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
