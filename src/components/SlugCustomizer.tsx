import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { generateSlug, validateSlugFormat } from '../utils/slugUtils';

interface SlugCustomizerProps {
    value: string | undefined;
    onChange: (slug: string) => void;
    fullName: string;
    currentCardId?: number | null;
    onStatusChange?: (status: SlugStatus, suggestion?: string) => void;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

export function SlugCustomizer({ value, onChange, fullName, currentCardId, onStatusChange }: SlugCustomizerProps) {
    const { t } = useTranslation();
    const [slug, setSlug] = useState(value || '');
    const [status, setStatus] = useState<SlugStatus>('idle');
    const [suggestion, setSuggestion] = useState('');
    const [debouncedSlug, setDebouncedSlug] = useState(slug);

    // Sync slug state when value prop changes (e.g., when loading a saved card)
    useEffect(() => {
        if (value !== undefined && value !== slug) {
            setSlug(value);
        }
    }, [value]);

    // Auto-generate slug from name if empty
    useEffect(() => {
        if (!slug && fullName) {
            const generated = generateSlug(fullName);
            setSlug(generated);
            onChange(generated);
        }
    }, [fullName, slug]); // Removed onChange from dependencies

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

    const charCount = slug.length;
    const isValid = charCount >= 3 && charCount <= 50;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                    {t('Custom URL')}
                </label>
                <span className={`text-xs ${!isValid && charCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {charCount} / 50 {t('characters')}
                </span>
            </div>

            <div className="relative">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">yourdomain.com/card/</span>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            placeholder="your-name"
                            className={`w-full px-4 py-2 pr-10 rounded-lg border ${status === 'available' ? 'border-green-500' :
                                status === 'taken' || status === 'reserved' || status === 'invalid' ? 'border-red-500' :
                                    'border-gray-300'
                                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {getStatusIcon()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs">
                <div>{getStatusText()}</div>
                {charCount < 3 && charCount > 0 && (
                    <span className="text-red-500">Minimum 3 characters</span>
                )}
            </div>

            {suggestion && (status === 'taken' || status === 'reserved') && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 text-sm text-blue-800">
                        Try: <code className="font-mono bg-white px-1 rounded">{suggestion}</code>
                    </div>
                    <button
                        onClick={useSuggestion}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                        Use This
                    </button>
                </div>
            )}

            <p className="text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only. This will be your public card URL.
            </p>
        </div>
    );
}
