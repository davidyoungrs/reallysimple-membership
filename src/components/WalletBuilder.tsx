import { type CardData, type WalletData } from '../types';
import { useTranslation } from 'react-i18next';
import { Palette, Type, Info } from 'lucide-react';

interface WalletBuilderProps {
    data: CardData;
    onChange: (data: CardData) => void;
}

export function WalletBuilder({ data, onChange }: WalletBuilderProps) {
    const { t } = useTranslation();
    const wallet = data.wallet || {
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        labelColor: '#000000',
        logoText: data.company || '',
        stripImageUrl: '/wallet-strip.png'
    };

    const updateWallet = (updates: Partial<WalletData>) => {
        onChange({
            ...data,
            wallet: { ...wallet, ...updates }
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Palette className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t('Wallet Appearance')}</h2>
                        <p className="text-sm text-gray-500">{t('Customize how your card looks in Apple Wallet')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Background Color */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 capitalize">
                            {t('Background')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={wallet.backgroundColor || '#ffffff'}
                                onChange={(e) => updateWallet({ backgroundColor: e.target.value })}
                                className="w-12 h-12 rounded-lg border-2 border-white shadow-sm cursor-pointer p-0 overflow-hidden"
                            />
                            <input
                                type="text"
                                value={wallet.backgroundColor || '#ffffff'}
                                onChange={(e) => updateWallet({ backgroundColor: e.target.value })}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                            />
                        </div>
                    </div>

                    {/* Foreground Color */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 capitalize">
                            {t('Text Color')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={wallet.foregroundColor || '#000000'}
                                onChange={(e) => updateWallet({ foregroundColor: e.target.value })}
                                className="w-12 h-12 rounded-lg border-2 border-white shadow-sm cursor-pointer p-0 overflow-hidden"
                            />
                            <input
                                type="text"
                                value={wallet.foregroundColor || '#000000'}
                                onChange={(e) => updateWallet({ foregroundColor: e.target.value })}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                            />
                        </div>
                    </div>

                    {/* Label Color */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 capitalize">
                            {t('Label Color')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={wallet.labelColor || '#000000'}
                                onChange={(e) => updateWallet({ labelColor: e.target.value })}
                                className="w-12 h-12 rounded-lg border-2 border-white shadow-sm cursor-pointer p-0 overflow-hidden"
                            />
                            <input
                                type="text"
                                value={wallet.labelColor || '#000000'}
                                onChange={(e) => updateWallet({ labelColor: e.target.value })}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Content settings */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <Type className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t('Wallet Content')}</h2>
                        <p className="text-sm text-gray-500">{t('Manage text and images on the pass')}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {t('Logo Text')}
                        </label>
                        <input
                            type="text"
                            value={wallet.logoText || ''}
                            onChange={(e) => updateWallet({ logoText: e.target.value })}
                            placeholder={data.company || t('Company Name')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 italic">Displayed at the top left of the pass</p>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            {t('Strip Image')}
                        </label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 aspect-[3/1] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 group relative">
                                <img
                                    src={wallet.stripImageUrl || '/wallet-strip.png'}
                                    alt="Wallet Strip"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg hover:bg-gray-50 transition-colors">
                                        {t('Change')}
                                    </button>
                                </div>
                            </div>
                            <div className="sm:w-64 space-y-2">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex gap-2">
                                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        The strip image is displayed prominently behind the primary fields. For best results, use an abstract or minimalist image.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export function WalletPreview({ data }: { data: CardData }) {
    const wallet = data.wallet || {
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        labelColor: '#000000',
        logoText: data.company || '',
        stripImageUrl: '/wallet-strip.png'
    };

    return (
        <div className="w-[320px] h-[480px] bg-gray-900/5 backdrop-blur-sm rounded-[40px] p-4 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden border border-white/20">
            {/* Apple Wallet Pass Frame */}
            <div
                className="w-full h-[400px] rounded-[18px] shadow-xl overflow-hidden flex flex-col relative animate-in zoom-in duration-500"
                style={{ backgroundColor: wallet.backgroundColor || '#ffffff' }}
            >
                {/* Top Section / Header */}
                <div className="px-4 py-3 flex justify-between items-center z-10">
                    <div className="flex items-center gap-2">
                        {data.logoUrl ? (
                            <img src={data.logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
                        ) : (
                            <div className="w-6 h-6 bg-gray-200 rounded-sm" />
                        )}
                        <span
                            className="text-[10px] font-bold tracking-tight"
                            style={{ color: wallet.foregroundColor }}
                        >
                            {(wallet.logoText || data.company || 'DIGITAL CARD').toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Strip Image */}
                <div className="h-[120px] w-full relative">
                    <img
                        src={wallet.stripImageUrl || '/wallet-strip.png'}
                        alt="Strip"
                        className="w-full h-full object-cover"
                    />
                    {/* Primary Field Over Strip */}
                    <div className="absolute inset-0 flex flex-col justify-center px-4 pt-4">
                        <span
                            className="text-[10px] font-medium opacity-80"
                            style={{ color: wallet.labelColor }}
                        >
                            NAME
                        </span>
                        <span
                            className="text-xl font-bold leading-tight"
                            style={{ color: wallet.foregroundColor }}
                        >
                            {data.fullName || 'Your Name'}
                        </span>
                    </div>
                </div>

                {/* Secondary/Auxiliary Fields */}
                <div className="px-4 py-4 grid grid-cols-2 gap-y-4 gap-x-2 flex-grow">
                    <div>
                        <span className="block text-[8px] font-medium opacity-70" style={{ color: wallet.labelColor }}>ROLE</span>
                        <span className="block text-xs font-semibold" style={{ color: wallet.foregroundColor }}>{data.jobTitle || 'Your Position'}</span>
                    </div>
                    <div>
                        <span className="block text-[8px] font-medium opacity-70" style={{ color: wallet.labelColor }}>COMPANY</span>
                        <span className="block text-xs font-semibold" style={{ color: wallet.foregroundColor }}>{data.company || 'Your Company'}</span>
                    </div>
                </div>

                {/* QR Code Section */}
                <div className="bg-white p-4 flex items-center justify-center border-t border-gray-100">
                    <div className="w-24 h-24 border border-gray-100 flex items-center justify-center p-2 rounded-lg">
                        <div className="w-full h-full bg-black/10 rounded-sm flex items-center justify-center">
                            <div className="grid grid-cols-3 gap-1 w-12 opacity-30">
                                {[...Array(9)].map((_, i) => <div key={i} className="w-full aspect-square bg-black rounded-[1px]" />)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hint of background card */}
            <div className="absolute top-[320px] left-8 right-8 h-[200px] bg-white/40 backdrop-blur-md rounded-t-[18px] -z-10 translate-y-12 rotate-[-2deg] border border-white/20" />

            <p className="absolute bottom-6 text-[10px] text-gray-400 font-medium">Apple Wallet Preview</p>
        </div>
    );
}
