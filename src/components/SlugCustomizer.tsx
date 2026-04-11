import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { generateSlug, validateSlugFormat, generateRandomSlug } from '../utils/slugUtils';

interface SlugCustomizerProps {
    value: string | undefined;
    onChange: (slug: string) => void;
    fullName: string;
    currentCardId?: number | null;
    onStatusChange?: (status: SlugStatus, suggestion?: string) => void;
    disabled?: boolean;
    tier?: string;
    onUpgradeClick?: () => void;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

export function SlugCustomizer({ value, onChange, fullName, currentCardId, onStatusChange, disabled, tier, onUpgradeClick }: SlugCustomizerProps) {
    const { t } = useTranslation();
    const isStarter = tier === 'starter';
    // Guard against null — DB can return null for slug which would crash slug.length
    const [slug, setSlug] = useState(value ?? '');
    const [status, setStatus] = useState<SlugStatus>('idle');
    const [suggestion, setSuggestion] = useState('');
    const [debouncedSlug, setDebouncedSlug] = useState(slug);

    // Sync slug state when value prop changes (e.g., when loading a saved card)
    // Use ?? '' to guard against null — a null slug would cause slug.length to crash
    useEffect(() => {
        const safeValue = value ?? '';
        if (safeValue !== slug) {
            setSlug(safeValue);
        }
    }, [value]);

    // Auto-generate slug from name if empty
    useEffect(() => {
        if (!slug && fullName) {
            const generated = isStarter ? generateRandomSlug(16) : generateSlug(fullName);
            setSlug(generated);
            onChange(generated);
        }
    }, [fullName, slug, isStarter]); // Added isStarter and slug to deps

    // Debounce slug input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSlug(slug);
        }, 500);

        return () => clearTimeout(timer);
    }, [slug]);

    // Check availability when debounced slug changes
    useEffect(() => {
        const checkAvailability = async () => {
            if (!debouncedSlug) {
                setStatus('idle');
                return;
            }

            // Validate format first
            if (!validateSlugFormat(debouncedSlug)) {
                setStatus('invalid');
                return;
            }

            setStatus('checking');

            try {
                const params = new URLSearchParams({ slug: debouncedSlug });
                if (currentCardId) {
                    params.append('cardId', currentCardId.toString());
                }

                const response = await fetch(`/api/cards?action=check-slug&${params}`);
                const data = await response.json();

                if (data.available) {
                    setStatus('available');
                    setSuggestion('');
                    onStatusChange?.('available');
                } else if (data.reason === 'reserved') {
                    setStatus('reserved');
                    setSuggestion(data.suggestion || '');
                    onStatusChange?.('reserved', data.suggestion);
                } else {
                    setStatus('taken');
                    setSuggestion(data.suggestion || '');
                    onStatusChange?.('taken', data.suggestion);
                }
            } catch (error) {
                console.error('Error checking slug:', error);
                setStatus('idle');
                onStatusChange?.('idle');
            }
        };

        checkAvailability();
    }, [debouncedSlug, currentCardId]);

    const handleSlugChange = (newSlug: string) => {
        // Sanitize input
        const sanitized = newSlug
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 50);

        setSlug(sanitized);
        onChange(sanitized);
    };

    const useSuggestion = () => {
        if (suggestion) {
            setSlug(suggestion);
            onChange(suggestion);
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'checking':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'available':
                return <Check className="w-4 h-4 text-green-500" />;
            case 'taken':
            case 'reserved':
            case 'invalid':
                return <X className="w-4 h-4 text-red-500" />;
            default:
                return null;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'checking':
                return <span className="text-blue-600">{t('Checking...')}</span>;
            case 'available':
                return <span className="text-green-600">✓ {t('Available')}</span>;
            case 'taken':
                return <span className="text-red-600">✗ {t('Taken')}</span>;
            case 'reserved':
                return <span className="text-red-600">✗ {t('Reserved')}</span>;
            case 'invalid':
                return <span className="text-red-600">✗ Invalid format</span>;
            default:
                return null;
        }
    };

    // Ensure slug is always a string — null would crash .length
    const safeSlug = slug ?? '';
    const charCount = safeSlug.length;
    const isValid = charCount >= 3 && charCount <= 50;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                    {t('Public Card URL')}
                </label>
                {!isStarter && (
                    <span className={`text-xs ${!isValid && charCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {charCount} / 50 {t('characters')}
                    </span>
                )}
            </div>

            <div className={`
                flex items-center gap-2 p-3 bg-white border rounded-xl transition-all shadow-sm
                ${status === 'available' ? 'border-emerald-200' : 
                  status === 'taken' || status === 'reserved' || status === 'invalid' ? 'border-red-200' : 
                  'border-gray-200'}
                ${(disabled || isStarter) ? 'bg-gray-50/50' : 'focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50'}
            `}>
                <div className="flex items-center gap-2 text-gray-400 min-w-fit border-r border-gray-100 pr-2">
                    {isStarter ? <Lock className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="text-[10px] sm:text-xs font-medium select-none text-gray-400">reallysimple.apps/card/</span>
                </div>
                <input
                    type="text"
                    value={slug}
                    onChange={(e) => !isStarter && handleSlugChange(e.target.value)}
                    placeholder={isStarter ? t('Auto-generated ID') : t('username')}
                    disabled={disabled || isStarter}
                    className="flex-1 bg-transparent border-none p-0 text-sm font-semibold text-gray-900 focus:ring-0 placeholder:text-gray-300 disabled:text-gray-500"
                />
                <div className="flex items-center gap-1 justify-end min-w-fit pl-2">
                    {!isStarter && getStatusIcon()}
                </div>
            </div>

            {isStarter ? (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-100">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <p className="text-[10px] text-blue-700 leading-tight">
                        <strong>{t('System-Assigned URL')}:</strong> {t('Standard plans receive a unique 16-character digital ID. Upgrade to Pro for custom profile handles.')}
                    </p>
                    <button 
                        onClick={(e) => { e.preventDefault(); onUpgradeClick?.(); }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap underline ml-auto"
                    >
                        {t('Upgrade')}
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between text-[11px]">
                        <div>{getStatusText()}</div>
                        {charCount < 3 && charCount > 0 && (
                            <span className="text-red-500">{t('Minimum 3 characters')}</span>
                        )}
                    </div>

                    {suggestion && (status === 'taken' || status === 'reserved') && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 text-xs text-blue-800">
                                {t('Try')}: <code className="font-mono bg-white px-1 rounded">{suggestion}</code>
                            </div>
                            <button
                                onClick={useSuggestion}
                                className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                            >
                                {t('Use This')}
                            </button>
                        </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">
                        {t('Lowercase letters, numbers, and hyphens only.')}
                    </p>
                </>
            )}
        </div>
    );
}
