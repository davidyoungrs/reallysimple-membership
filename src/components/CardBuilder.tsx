import React, { useState, useEffect, useRef } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { initialCardData, type CardData } from '../types';
import { BusinessCard } from './BusinessCard';
import { Editor } from './Editor';
import { loadFromUrl, saveToUrl } from '../utils/urlState';
import { useTranslation } from 'react-i18next';
import { 
    Trash2, 
    Languages, 
    Check, 
    X,
    ChevronUp, 
    ChevronDown, 
    ArrowLeft, 
    Copy, 
    LayoutDashboard 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { LanguageSelector } from './LanguageSelector';
import { OnboardingTour } from './OnboardingTour';
import { WalletBuilder, WalletPreview } from './WalletBuilder';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useTier } from '../contexts/TierContext';

// Declare Clerk on window for TypeScript
declare global {
    interface Window {
        Clerk?: {
            session?: {
                getToken: () => Promise<string>;
            };
        };
    }
}

// Helper component to scale content to fit container
const ScaleToFit = ({ children }: { children: React.ReactNode }) => {
    const [scale, setScale] = useState(1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculateScale = () => {
            if (!containerRef.current || !contentRef.current) return;

            const container = containerRef.current;
            const content = contentRef.current;

            // add some padding
            const padding = 40;
            const availableWidth = container.clientWidth - padding;
            const availableHeight = container.clientHeight - padding;

            const contentWidth = content.scrollWidth;
            const contentHeight = content.scrollHeight;

            if (contentWidth === 0 || contentHeight === 0) return;

            const scaleX = availableWidth / contentWidth;
            const scaleY = availableHeight / contentHeight;

            // Scale down if too big, but max scale is 1 (don't scale up pixelated)
            const newScale = Math.min(scaleX, scaleY, 1);

            setScale(newScale);
        };

        // Initial calculation
        calculateScale();

        // Observe resizing
        const observer = new ResizeObserver(calculateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        if (contentRef.current) observer.observe(contentRef.current);

        return () => observer.disconnect();
    }, [children]); // Re-calculate when children change

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
            <div
                ref={contentRef}
                style={{
                    transform: `scale(${scale})`,
                    transition: 'transform 0.1s ease-out'
                }}
                className="origin-center"
            >
                {children}
            </div>
        </div>
    );
};

export function CardBuilder() {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const location = useLocation();
    const [isEditorOpen, setIsEditorOpen] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showShareCard, setShowShareCard] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);
    const [savedCards, setSavedCards] = useState<any[]>([]);
    const [showCardsDropdown, setShowCardsDropdown] = useState(false);
    const [currentCardId, setCurrentCardId] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const shareCardRef = useRef<HTMLDivElement>(null);
    const [deleteConfirmCard, setDeleteConfirmCard] = useState<{ id: number, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingTranslation, setPendingTranslation] = useState<Partial<CardData> | null>(null);
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid'>('idle');
    const [showTour, setShowTour] = useState(false);
    const [builderMode, setBuilderMode] = useState<'card' | 'wallet'>('card');
    const { hasFeature, loading: featuresLoading } = useFeatureFlag();
    const { tier } = useTier();

    // Reset to card mode if wallet access is revoked
    useEffect(() => {
        if (builderMode === 'wallet' && !featuresLoading && !hasFeature('wallet_access')) {
            setBuilderMode('card');
        }
    }, [builderMode, featuresLoading, hasFeature]);

    // Initialize state from URL or default
    const [data, setData] = useState<CardData>(() => {
        return loadFromUrl() || initialCardData;
    });

    // Save to URL whenever data changes
    useEffect(() => {
        const timer = setTimeout(() => {
            saveToUrl(data);
        }, 500); // Debounce by 500ms

        return () => clearTimeout(timer);
    }, [data]);

    // Load saved cards from database
    const [isConcierge, setIsConcierge] = useState(false);
    const [targetUserId, setTargetUserId] = useState<string | null>(null);
    const lastFetchedConciergeRef = useRef<string | null>(null);

    // Initial load and URL handling
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const conciergeParam = params.get('concierge') === 'true';
        const cardIdParam = params.get('cardId');
        const userIdParam = params.get('userId');

        if (conciergeParam && cardIdParam) {
            // Skip if we already fetched this specific card
            const fetchKey = `${cardIdParam}-${userIdParam}`;
            if (lastFetchedConciergeRef.current === fetchKey) return;
            
            setIsConcierge(true);
            setTargetUserId(userIdParam);
            lastFetchedConciergeRef.current = fetchKey;
            
            // Fetch exact card for concierge mode
            const fetchConciergeCard = async () => {
                try {
                    const token = await window.Clerk?.session?.getToken();
                    const url = userIdParam ? `/api/cards?userId=${userIdParam}` : '/api/cards';
                    const response = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const { cards } = await response.json();
                        const card = cards.find((c: any) => c.id === parseInt(cardIdParam));
                        if (card) {
                            handleLoadCard(card);
                        }
                    }
                } catch (err) {
                    console.error('Failed to load concierge card:', err);
                }
            };
            fetchConciergeCard();
        }
    }, [location.search]);

    const loadSavedCards = async () => {
        try {
            const token = await window.Clerk?.session?.getToken();
            if (!token) return [];

            const response = await fetch('/api/cards', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const result = await response.json();
                setSavedCards(result.cards || []);
                return result.cards || [];
            }
        } catch (error) {
            console.error('Error loading cards:', error);
        }
        return [];
    };

    // Load a specific card
    const handleLoadCard = (card: any) => {
        // Merge with initialCardData fallback to ensure all arrays (socialLinks, phoneNumbers, embeds) exist
        // This prevents "undefined is not an object" crashes on older card data
        setData({ 
            ...initialCardData,
            ...card.data, 
            slug: card.slug 
        });
        setCurrentCardId(card.id);
        setShowCardsDropdown(false);
    };

    // Handle navigation from Dashboard
    useEffect(() => {
        if (location.state?.cardId && savedCards.length > 0) {
            const cardToLoad = savedCards.find(c => c.id === location.state.cardId);
            if (cardToLoad) {
                handleLoadCard(cardToLoad);
                // Clear state to prevent reloading
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, savedCards]);

    // Delete a card
    const handleDeleteCard = async (cardId: number) => {
        setIsDeleting(true);
        try {
            const userId = user?.id;
            if (!userId) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`/api/cards?id=${cardId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await window.Clerk?.session?.getToken()}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete card');
            }

            // If we deleted the currently loaded card, reset to new card
            if (currentCardId === cardId) {
                setData(initialCardData);
                setCurrentCardId(null);
            }

            // Refresh the cards list
            await loadSavedCards();

            // Close confirmation dialog
            setDeleteConfirmCard(null);

            // Show success message
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);

        } catch (error) {
            console.error('Error deleting card:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setIsDeleting(false);
        }
    };

    // Load saved cards on mount
    useEffect(() => {
        loadSavedCards().then((cards) => {
            // If user has no cards and hasn't seen the tour this session/ever
            const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
            if (cards && cards.length === 0 && !hasSeenTour) {
                setShowTour(true);
            }
        });
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowCardsDropdown(false);
            }
            // Close share card dropdown when clicking outside
            if (shareCardRef.current && !shareCardRef.current.contains(event.target as Node)) {
                setShowShareCard(false);
            }
        };

        if (showCardsDropdown || showShareCard) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCardsDropdown, showShareCard]);

    const handleTranslate = (translatedData: Partial<CardData>) => {
        // Only show pending translation if it actually differs from current data
        // and we're not in English mode (where we just reset)
        if (i18n.language === 'en') return;

        const hasChanges = Object.keys(translatedData).some(
            key => translatedData[key as keyof CardData] !== data[key as keyof CardData]
        );

        if (hasChanges) {
            setPendingTranslation(translatedData);
        }
    };

    const applyTranslation = () => {
        if (pendingTranslation) {
            setData(prev => ({
                ...prev,
                ...pendingTranslation
            }));
            setPendingTranslation(null);
        }
    };

    // Save card to database
    const handleSaveCard = async () => {
        // Check if user is trying to create a new card based on tier limits
        const maxCards = tier === 'starter' ? 1 : 5; // Starter: 1, Pro/Pro+: 5, Business/Grandfathered: allowed by isFeatureEnabled

        if (!currentCardId && savedCards.length >= maxCards && tier !== 'grandfathered' && tier !== 'business') {
            alert(t('You have reached the maximum number of cards for your plan ({{count}}). Please upgrade to create more.', { count: maxCards }));
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
            return;
        }

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const userId = isConcierge ? targetUserId : user?.id;
            if (!userId) {
                throw new Error('Not authenticated');
            }

            // Check if slug is provided and validate it before saving
            if (data.slug) {
                const params = new URLSearchParams({ slug: data.slug });
                if (currentCardId) {
                    params.append('cardId', currentCardId.toString());
                }

                const slugCheckResponse = await fetch(`/api/cards?action=check-slug&${params}`);
                const slugCheckData = await slugCheckResponse.json();

                if (!slugCheckData.available) {
                    // Slug is taken, show error with suggestion
                    const suggestion = slugCheckData.suggestion || `${data.slug}-2`;
                    const useSuggestion = confirm(
                        t('The slug "{{slug}}" is already taken.', { slug: data.slug }) + '\n\n' +
                        t('Would you like to use "{{suggestion}}" instead?', { suggestion }) + '\n\n' +
                        t('Click OK to use the suggestion, or Cancel to change it manually.')
                    );

                    if (useSuggestion) {
                        // Update the slug with the suggestion and retry save
                        const updatedData = { ...data, slug: suggestion };
                        setData(updatedData);

                        // Retry save with the new slug
                        const retryResponse = await fetch('/api/cards', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${await window.Clerk?.session?.getToken()}`,
                            },
                            body: JSON.stringify({ 
                                cardData: updatedData, 
                                cardId: currentCardId,
                                userId: userId
                            }),
                        });

                        if (!retryResponse.ok) {
                            const retryError = await retryResponse.json();
                            throw new Error(retryError.error || 'Failed to save card');
                        }

                        const retryResult = await retryResponse.json();
                        setSaveStatus('success');
                        setTimeout(() => setSaveStatus('idle'), 3000);
                        if (retryResult.card && !currentCardId) {
                            setCurrentCardId(retryResult.card.id);
                        }
                        loadSavedCards();
                        setIsSaving(false);
                        return;
                    } else {
                        // User cancelled, don't save
                        setIsSaving(false);
                        setSaveStatus('error');
                        setTimeout(() => setSaveStatus('idle'), 3000);
                        return;
                    }
                }
            }

            const response = await fetch('/api/cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await window.Clerk?.session?.getToken()}`,
                },
                body: JSON.stringify({ 
                    cardData: data, 
                    cardId: currentCardId,
                    userId: userId
                }),
            });

            if (!response.ok) {
                const error = await response.json();

                // Special handling for slug already taken
                if (error.error === 'Slug already taken' && error.suggestion) {
                    const useSuggestion = confirm(
                        t('The slug "{{slug}}" is already taken.', { slug: data.slug }) + '\n\n' +
                        t('Would you like to use "{{suggestion}}" instead?', { suggestion: error.suggestion }) + '\n\n' +
                        t('Click OK to use the suggestion, or Cancel to change it manually.')
                    );

                    if (useSuggestion) {
                        // Update the slug with the suggestion and try saving again
                        setData({ ...data, slug: error.suggestion });
                        setIsSaving(false);
                        return; // User can click save again with the new slug
                    } else {
                        setIsSaving(false);
                        setSaveStatus('error');
                        setTimeout(() => setSaveStatus('idle'), 3000);
                        return;
                    }
                }

                throw new Error(error.error || 'Failed to save card');
            }

            const result = await response.json();
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
            // Set the current card ID if it was a new card
            if (result.card && !currentCardId) {
                setCurrentCardId(result.card.id);
            }
            // Reload cards list after successful save
            loadSavedCards();
        } catch (error: any) {
            console.error('Error saving card:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row relative overflow-hidden">

            {/* Back to Home */}
            <div className="fixed top-4 left-4 z-50">
                <Link to="/" className="flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-lg shadow-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ArrowLeft className="w-4 h-4" />
                    {t('Home')}
                </Link>
            </div>

            {/* Right Side: User Profile, Language Switcher, Load Card, Save Button */}
            <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
                {/* Top Row: Avatar and Language */}
                <div className="flex items-center gap-2">
                    <LanguageSelector />

                    <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-lg shadow-md border border-gray-200">
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>

                {/* Button Container - Fixed width to prevent expansion */}
                <div className="space-y-3">
                    {/* Dashboard Link */}
                    <Link
                        to="/dashboard"
                        data-tour="dashboard"
                        className="w-full px-4 py-2 rounded-lg font-medium transition-all shadow-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center justify-center gap-2"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        {t('My Dashboard')}
                    </Link>

                    <button
                        onClick={handleSaveCard}
                        data-tour="save"
                        disabled={isSaving || slugStatus === 'taken' || slugStatus === 'reserved' || slugStatus === 'invalid'}
                        className={`w-full px-4 py-2 rounded-lg font-medium transition-all shadow-md ${saveStatus === 'success'
                            ? 'bg-green-500 text-white'
                            : saveStatus === 'error' || slugStatus === 'taken' || slugStatus === 'reserved' || slugStatus === 'invalid'
                                ? 'bg-red-500 text-white'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            } ${isSaving || slugStatus === 'taken' || slugStatus === 'reserved' || slugStatus === 'invalid' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSaving ? t('Saving...') : saveStatus === 'success' ? t('Saved!') : saveStatus === 'error' ? t('Error') : t('Save Card')}
                    </button>

                    {/* Share Card Content - Removed button, keeping logic if needed but user asked to remove button */}
                </div>

                {/* Share Card Dropdown - Outside button container */}
                <div ref={shareCardRef}>
                    {showShareCard && data.slug && (
                        <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm mt-3">
                            <div className="text-xs font-medium text-blue-900 mb-2">{t('Public URL')}</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-white rounded px-3 py-2 text-sm text-gray-700 font-mono truncate border border-blue-100">
                                    {window.location.origin}/card/{data.slug}
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(`${window.location.origin}/card/${data.slug}`);
                                            setCopyStatus(true);
                                            setTimeout(() => setCopyStatus(false), 2000);
                                        } catch (err) {
                                            console.error('Failed to copy:', err);
                                        }
                                    }}
                                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                                    title={t('Copy Link')}
                                >
                                    {copyStatus ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            {copyStatus && (
                                <div className="text-xs text-green-600 mt-1 font-medium">✓ {t('Link Copied!')}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Editor Toggle */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsEditorOpen(!isEditorOpen)}
                    className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                    aria-label="Toggle Editor"
                >
                    {isEditorOpen ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
                </button>
            </div>

            {/* Editor Side */}
            <div className={`
                fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-3xl shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out border-t border-gray-200
                h-[85vh] md:h-[100dvh] md:relative md:inset-auto md:w-[45%] lg:w-[40%] md:rounded-none md:shadow-none md:border-r md:border-t-0 md:bg-white md:translate-y-0
                ${isEditorOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)] md:translate-y-0'}
            `}>
                {/* Mobile Handle */}
                <div
                    className="w-full flex justify-center p-3 md:hidden cursor-pointer"
                    onClick={() => setIsEditorOpen(!isEditorOpen)}
                >
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                <div className="px-4 py-2 border-b border-gray-100 flex gap-1">
                    <button
                        onClick={() => setBuilderMode('card')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${builderMode === 'card' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {t('Main Card')}
                    </button>
                    {(hasFeature('wallet_access') || isConcierge) && (
                        <button
                            onClick={() => setBuilderMode('wallet')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${builderMode === 'wallet' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {t('Apple Wallet')}
                        </button>
                    )}
                </div>

                <div className="h-full overflow-y-auto pb-40 md:pb-32">
                    {builderMode === 'card' ? (
                        <Editor data={data} onChange={setData} currentCardId={currentCardId} onSlugStatusChange={setSlugStatus} />
                    ) : (
                        <WalletBuilder data={data} onChange={setData} />
                    )}
                </div>
            </div>

            {/* Preview Side */}
            <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 bg-gray-50 h-[50vh] md:h-screen relative overflow-y-auto overflow-x-hidden">
                <div className="fixed inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none"></div>

                <ScaleToFit>
                    {builderMode === 'card' ? (
                        <BusinessCard data={data} onTranslate={handleTranslate} />
                    ) : (
                        <WalletPreview data={data} />
                    )}
                </ScaleToFit>

                {/* Translation Apply Banner */}
                {pendingTranslation && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
                        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-2 pl-4 pr-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Languages className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    Apply translations to card?
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPendingTranslation(null)}
                                    className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
                                    title="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={applyTranslation}
                                    className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center text-gray-400 text-sm hidden md:block shrink-0 pb-8">
                    {t('Preview')}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {
                deleteConfirmCard && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Confirm Delete')}</h3>
                            <p className="text-gray-600 mb-4">
                                {t('Are you sure you want to delete this card? This action cannot be undone.')}
                            </p>
                            <div className="bg-gray-50 rounded p-3 mb-4">
                                <div className="font-medium text-gray-900">{deleteConfirmCard.name}</div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmCard(null)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={() => handleDeleteCard(deleteConfirmCard.id)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            {t('Deleting...')}
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            {t('Delete')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Onboarding Tour */}
            {
                showTour && (
                    <OnboardingTour onComplete={() => {
                        setShowTour(false);
                        localStorage.setItem('hasSeenOnboardingTour', 'true');
                    }} />
                )
            }
        </div >
    );
}
