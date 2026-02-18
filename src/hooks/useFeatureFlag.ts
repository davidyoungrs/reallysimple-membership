import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useFeatureFlag() {
    const { getToken, isSignedIn } = useAuth();
    const [features, setFeatures] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSignedIn) {
            setLoading(false);
            return;
        }

        async function fetchFeatures() {
            try {
                const token = await getToken();
                const res = await fetch('/api/me?resource=features', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setFeatures(data.features || {});
                }
            } catch (error) {
                console.error('Failed to fetch features:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchFeatures();
    }, [isSignedIn, getToken]);

    const hasFeature = (featureKey: string) => {
        return !!features[featureKey];
    };

    return { hasFeature, loading, features };
}
