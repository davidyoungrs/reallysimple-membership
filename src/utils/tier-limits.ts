import type { CardData } from '../types';

export type SubscriptionTier = 'starter' | 'pro' | 'pro_plus' | 'business' | 'grandfathered';
export type SubscriptionStatus = 'active' | 'trailing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null;

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

    // Active or Trialing accounts are good
    if (status === 'active' || status === 'trailing') return tier;

    const now = new Date();
    const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : now;
    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000; // 3 days

    // Past Due: Allow 3-day grace period from currentPeriodEnd
    if (status === 'past_due') {
        if (now.getTime() < periodEnd.getTime() + gracePeriodMs) {
            return tier;
        }
    }

    // Canceled: Allow access until the actual end of the period
    if (status === 'canceled') {
        if (now.getTime() < periodEnd.getTime()) {
            return tier;
        }
    }

    // Default to starter if no other conditions met
    return 'starter';
}

/**
 * Strips premium features from card data if the user is on a starter tier.
 */
export function applyTierLimits(data: CardData, tier: SubscriptionTier): CardData {
    if (tier !== 'starter') return data;

    // Create a shallow copy to avoid mutating original
    const limitedData = { ...data };

    // Starter Tier Restrictions
    limitedData.removeBranding = false;
    limitedData.stickyActionBar = false;

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

    // Limit Social Links (Max 5)
    if (limitedData.socialLinks && limitedData.socialLinks.length > 5) {
        limitedData.socialLinks = limitedData.socialLinks.slice(0, 5);
    }

    // Limit Phone Numbers (Max 1)
    if (limitedData.phoneNumbers && limitedData.phoneNumbers.length > 1) {
        limitedData.phoneNumbers = limitedData.phoneNumbers.slice(0, 1);
    }

    return limitedData;
}
