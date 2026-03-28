import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { User, Shield, Smartphone } from 'lucide-react';
import { SubscriptionManager } from './SubscriptionManager';

export function ProfileSettings() {
    const { user } = useUser();
    const { t } = useTranslation();

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50/30 flex items-center gap-6">
                    <img
                        src={user.imageUrl}
                        alt={user.fullName || ''}
                        className="w-20 h-20 rounded-2xl shadow-md border-4 border-white"
                    />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{user.fullName}</h2>
                        <p className="text-gray-500">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {t('Personal Information')}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">{t('Full Name')}</label>
                                    <p className="text-gray-900 font-medium">{user.fullName || '—'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">{t('Email')}</label>
                                    <p className="text-gray-900 font-medium">{user.primaryEmailAddress?.emailAddress || '—'}</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                {t('Security')}
                            </h3>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <p className="text-sm text-gray-600">
                                    {t('Your account is secured via Clerk. Manage your credentials and sessions in the account settings popup.')}
                                </p>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-6">
                        <SubscriptionManager />

                        <section>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                {t('App Preferences')}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-2">
                                    <span className="text-sm text-gray-700">{t('Notifications')}</span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded uppercase">
                                        {t('Coming Soon')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2">
                                    <span className="text-sm text-gray-700">{t('Dark Mode')}</span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded uppercase">
                                        {t('Coming Soon')}
                                    </span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
