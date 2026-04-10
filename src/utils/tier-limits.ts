import type { CardData } from '../types';

export type SubscriptionTier = 'starter' | 'pro' | 'pro_plus' | 'business' | 'grandfathered';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null;

export interface UserSubscriptionInfo {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | string | null;
}

/**
 * Calculates the Tier based on payment status and a 3-day grace period.
 */
export function getEffectiveTier(info: UserSubscriptionInfo): SubscriptionTier {
    const { tier, status, currentPeriodEnd } = info;

    // Grandfathered and Business accounts are always active in this logic
    if (tier === 'grandfathered' || tier === 'business') return tier;

    const now = new Date();
    const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000; // 3 days

    // If an expiration date explicitly exists and it has passed (including grace period), they are lapsed.
    if (periodEnd && now.getTime() > periodEnd.getTime() + gracePeriodMs) {
        return 'starter';
    }

    // Active, Trialing, or Null (legacy/manual) accounts are good as long as they aren't expired
    if (status === 'active' || status === 'trialing' || !status) return tier;

    // Past Due or Canceled: If they haven't explicitly expired by date (checked above), let them keep it
    if (status === 'past_due' || status === 'canceled') {
        return tier;
    }

    // Default to starter if no other conditions met
    return 'starter';
}

/**
 * Strips premium features from card data based on the user's tier.
 */
export function applyTierLimits(data: CardData, tier: SubscriptionTier): CardData {
    // Create a shallow copy to avoid mutating original
    const limitedData = { ...data };

    // --- SHARED LIMITS (Starter & Pro) ---
    if (tier === 'starter' || tier === 'pro') {
        if (limitedData.wallet) {
            limitedData.wallet = {
                ...limitedData.wallet,
                showStripImage: false, // Solid background only
                stripImageUrl: undefined
            };
        }
    }

    // --- STARTER ONLY LIMITS ---
    if (tier === 'starter') {
        limitedData.removeBranding = false;
        limitedData.stickyActionBar = false;

        // Explicitly disable Wallet features on Starter
        if (limitedData.wallet) {
            (limitedData.wallet as any).enabled = false;
        }

        // Limit Layouts
        if (limitedData.layoutMode !== 'classic') {
            limitedData.layoutMode = 'classic';
        }

        // Limit Sections (Max 1)
        if (limitedData.sections && limitedData.sections.length > 1) {
            limitedData.sections = limitedData.sections.slice(0, 1);
        }

        // Limit Embeds (Max 1)
        if (limitedData.embeds && limitedData.embeds.length > 1) {
            limitedData.embeds = limitedData.embeds.slice(0, 1);
        }

        // Limit Social Links (Max 3)
        if (limitedData.socialLinks && limitedData.socialLinks.length > 3) {
            limitedData.socialLinks = limitedData.socialLinks.slice(0, 3);
        }

        // Limit Phone Numbers (Max 2)
        if (limitedData.phoneNumbers && limitedData.phoneNumbers.length > 2) {
            limitedData.phoneNumbers = limitedData.phoneNumbers.slice(0, 2);
        }
    }

    return limitedData;
}
