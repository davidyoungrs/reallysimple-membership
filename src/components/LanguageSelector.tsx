import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSelectorProps {
    variant?: 'navbar' | 'card';
    textColor?: string;
}

export function LanguageSelector({ variant = 'navbar', textColor }: LanguageSelectorProps) {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'fr', label: 'Français' },
        { code: 'de', label: 'Deutsch' },
        { code: 'ar', label: 'العربية' },
        { code: 'ru', label: 'Русский' },
        { code: 'zh', label: '中文 (Mandarin)' },
        { code: 'hi', label: 'हिन्दी (Hindi)' },
        { code: 'pt', label: 'Português' },
        { code: 'ja', label: '日本語 (Japanese)' },
        { code: 'pnb', label: 'پنجابی (Punjabi)' },
        { code: 'tr', label: 'Türkçe' },
        { code: 'ko', label: '한국어 (Korean)' },
        { code: 'it', label: 'Italiano' }
    ];

    const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    if (variant === 'card') {
        return (
            <div className="relative" ref={containerRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center group"
                    style={{ color: textColor || 'currentColor' }}
                    title="Change Language"
                >
                    <Globe className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white/10 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 py-1 z-50 animate-in fade-in zoom-in duration-200">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 flex items-center justify-between group transition-colors"
                            >
                                <span className={`${i18n.language === lang.code ? 'font-bold' : 'opacity-70'}`} style={{ color: textColor || '#ffffff' }}>
                                    {lang.label}
                                </span>
                                {i18n.language === lang.code && (
                                    <Check className="w-3 h-3" style={{ color: textColor || '#ffffff' }} />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white/50 hover:bg-white/80 rounded-lg transition-colors border border-transparent hover:border-gray-200"
            >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLanguage.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between group"
                        >
                            <span className={`${i18n.language === lang.code ? 'font-medium text-blue-600' : 'text-gray-700'}`}>
                                {lang.label}
                            </span>
                            {i18n.language === lang.code && (
                                <Check className="w-4 h-4 text-blue-600" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
