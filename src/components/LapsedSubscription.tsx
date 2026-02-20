import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LapsedSubscription() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                        <AlertCircle className="w-10 h-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        {t('Card Inactive')}
                    </h1>

                    <p className="text-gray-600 mb-8">
                        {t('The owner of this card has a pending subscription update. Please check back later or contact them directly.')}
                    </p>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 text-left">
                        <div className="flex items-start gap-3">
                            <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900 mb-1">
                                    {t('Are you the owner?')}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {t('Your subscription has lapsed, causing your digital and wallet cards to be deactivated.')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Link
                            to="/app/billing"
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <span>{t('Reactive Card Now')}</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        <Link
                            to="/"
                            className="w-full inline-block text-gray-500 text-sm hover:text-gray-700 py-2"
                        >
                            {t('Back to Home')}
                        </Link>
                    </div>
                </div>

                <div className="bg-gray-50 py-4 px-8 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} Really Simple Apps
                    </p>
                </div>
            </div>
        </div>
    );
}
