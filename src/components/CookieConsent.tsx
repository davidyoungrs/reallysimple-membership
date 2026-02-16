import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Show after a short delay
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-[60] animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

                <div className="bg-blue-50 p-4 rounded-xl shrink-0">
                    <Cookie className="w-8 h-8 text-blue-600" />
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Cookies & Privacy</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        We use cookies to improve your experience and analyze how our cards are shared.
                        By continuing, you agree to our <Link to="/privacy" className="text-blue-600 font-medium hover:underline">Privacy Policy</Link>.
                    </p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleAccept}
                        className="flex-1 md:flex-none px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                    >
                        Accept All
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-3 text-gray-400 hover:text-gray-600 transition-colors hidden md:block"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
