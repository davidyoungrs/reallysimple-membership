import { useState, useRef } from 'react';
import { type CardData, type WalletData } from '../types';
import { useTranslation } from 'react-i18next';
import { Palette, Type, Info, Upload, X } from 'lucide-react';
import { StripDesigner } from './StripDesigner';

interface WalletBuilderProps {
    data: CardData;
    onChange: (data: CardData) => void;
}

export function WalletBuilder({ data, onChange }: WalletBuilderProps) {
    const { t } = useTranslation();
    const [showStripDesigner, setShowStripDesigner] = useState(false);
    const wallet = data.wallet || {
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        labelColor: '#000000',
        logoText: data.company || '',
        showLogoText: true,
        stripImageUrl: '/wallet-strip.png',
        showNameFields: true,
        showRole: true,
        showCompany: true
    };

    const logoInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const updateWallet = (updates: Partial<WalletData>) => {
        onChange({
            ...data,
            wallet: { ...wallet, ...updates }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            updateWallet({ logoUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    };

    const coolPalettes = [
        { name: t('Midnight'), bg: '#000000', fg: '#ffffff', label: '#9ca3af' },
        { name: t('Sky'), bg: '#0ea5e9', fg: '#ffffff', label: '#e0f2fe' },
        { name: t('Forest'), bg: '#059669', fg: '#ffffff', label: '#d1fae5' },
        { name: t('Royal'), bg: '#4f46e5', fg: '#ffffff', label: '#e0e7ff' },
        { name: t('Slate'), bg: '#475569', fg: '#ffffff', label: '#f1f5f9' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-center mb-6">
                    <img src="/logo.png" alt="Really Simple" className="h-12 w-auto" />
                </div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Palette className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t('Wallet Appearance')}</h2>
                        <p className="text-sm text-gray-500">{t('Customize how your card looks in Apple Wallet')}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Cool Palettes */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            {t('Cool Palettes')}
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {coolPalettes.map((p) => (
                                <button
                                    key={p.name}
                                    onClick={() => updateWallet({
                                        backgroundColor: p.bg,
                                        foregroundColor: p.fg,
                                        labelColor: p.label
                                    })}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                    title={p.name}
                                >
                                    <div className="flex -space-x-1">
                                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: p.bg }} />
                                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: p.fg }} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 max-w-md">
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
                                    className="w-10 h-10 rounded-xl border-2 border-white shadow-sm cursor-pointer p-0 overflow-hidden flex-shrink-0"
                                />
                                <input
                                    type="text"
                                    value={wallet.backgroundColor || '#ffffff'}
                                    onChange={(e) => updateWallet({ backgroundColor: e.target.value })}
                                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
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
                                    className="w-10 h-10 rounded-xl border-2 border-white shadow-sm cursor-pointer p-0 overflow-hidden flex-shrink-0"
                                />
                                <input
                                    type="text"
                                    value={wallet.foregroundColor || '#000000'}
                                    onChange={(e) => updateWallet({ foregroundColor: e.target.value })}
                                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
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
                                    className="w-10 h-10 rounded-xl border-2 border-white shadow-sm cursor-pointer p-0 overflow-hidden flex-shrink-0"
                                />
                                <input
                                    type="text"
                                    value={wallet.labelColor || '#000000'}
                                    onChange={(e) => updateWallet({ labelColor: e.target.value })}
                                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase"
                                />
                            </div>
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

                <div className="space-y-8">
                    {/* Logo & Text Section */}
                    <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900">{t('Logo & Branding')}</h3>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-xs font-medium text-gray-600">{t('Show Logo Text')}</span>
                                <input
                                    type="checkbox"
                                    checked={wallet.showLogoText !== false}
                                    onChange={(e) => updateWallet({ showLogoText: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-500">
                                    {t('Logo Text Content')}
                                </label>
                                <input
                                    type="text"
                                    value={wallet.logoText || ''}
                                    onChange={(e) => updateWallet({ logoText: e.target.value })}
                                    disabled={wallet.showLogoText === false}
                                    placeholder={data.company || t('Company Name')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                        {t('Custom Wallet Logo')}
                                    </label>
                                    {wallet.logoUrl && (
                                        <button
                                            onClick={() => updateWallet({ logoUrl: undefined })}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                            {t('Remove')}
                                        </button>
                                    )}
                                </div>

                                <div
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    onClick={() => logoInputRef.current?.click()}
                                    className={`
                                        relative group cursor-pointer overflow-hidden border-2 border-dashed rounded-xl transition-all duration-200
                                        ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-gray-200 hover:border-blue-400 hover:bg-white'}
                                        ${wallet.logoUrl ? 'border-solid border-gray-100 bg-white' : 'aspect-[4/1] py-4'}
                                    `}
                                >
                                    <input
                                        type="file"
                                        ref={logoInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />

                                    {wallet.logoUrl ? (
                                        <div className="relative group/logo w-full p-4 flex items-center justify-center min-h-[80px]">
                                            <img
                                                src={wallet.logoUrl}
                                                alt="Wallet Logo"
                                                className="max-h-16 max-w-full object-contain"
                                            />
                                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="px-3 py-1 bg-white/90 rounded-full text-[10px] font-bold text-gray-700 shadow-sm border border-gray-100">
                                                    {t('Change')}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                <Upload className="w-4 h-4" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-gray-500 group-hover:text-blue-600 transition-colors">
                                                    {t('Upload Logo')}
                                                </p>
                                                <p className="text-[9px] text-gray-400">
                                                    {t('Drag & drop or Click')}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {isDragging && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 backdrop-blur-[1px] animate-in fade-in duration-200">
                                            <div className="flex flex-col items-center gap-2">
                                                <Upload className="w-6 h-6 text-blue-500 animate-bounce" />
                                                <span className="text-[10px] font-bold text-blue-600">{t('Drop here')}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[9px] text-gray-400 italic">
                                    {t('Recommended: PNG with transparency, max 480x150px')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Field Toggles */}
                    <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                        <h3 className="text-sm font-bold text-gray-900">{t('Visible Fields')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-200 transition-colors">
                                <span className="text-sm font-medium text-gray-700">{t('Display Name')}</span>
                                <input
                                    type="checkbox"
                                    checked={wallet.showNameFields !== false}
                                    onChange={(e) => updateWallet({ showNameFields: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-200 transition-colors">
                                <span className="text-sm font-medium text-gray-700">{t('Display Job Title')}</span>
                                <input
                                    type="checkbox"
                                    checked={wallet.showRole !== false}
                                    onChange={(e) => updateWallet({ showRole: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-200 transition-colors">
                                <span className="text-sm font-medium text-gray-700">{t('Display Company')}</span>
                                <input
                                    type="checkbox"
                                    checked={wallet.showCompany !== false}
                                    onChange={(e) => updateWallet({ showCompany: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                            </label>
                        </div>
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
                                    <button
                                        onClick={() => setShowStripDesigner(true)}
                                        className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <Palette className="w-4 h-4 ml-1" />
                                        {t('Open Designer')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const url = prompt(t('Enter Strip Image URL') || 'Enter Strip Image URL', wallet.stripImageUrl || '/wallet-strip.png');
                                            if (url !== null) updateWallet({ stripImageUrl: url });
                                        }}
                                        className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {t('Link')}
                                    </button>
                                </div>
                            </div>
                            <div className="sm:w-64 space-y-2">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex gap-2">
                                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        {t('The strip image is displayed prominently behind the primary fields. For best results, use an abstract or minimalist image.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {showStripDesigner && (
                <StripDesigner
                    cardData={data}
                    initialWalletData={wallet}
                    onSave={(dataUrl, config) => {
                        updateWallet({
                            stripImageUrl: dataUrl,
                            stripConfig: config
                        });
                        setShowStripDesigner(false);
                    }}
                    onClose={() => setShowStripDesigner(false)}
                />
            )}
        </div>
    );
}

export function WalletPreview({ data, isPreview }: { data: CardData; isPreview?: boolean }) {
    const { t } = useTranslation();
    const wallet = data.wallet || {
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        labelColor: '#000000',
        logoText: data.company || '',
        showLogoText: true,
        stripImageUrl: '/wallet-strip.png',
        showNameFields: true,
        showRole: true,
        showCompany: true
    };

    const logoUrl = wallet.logoUrl || data.logoUrl;

    return (
        <div className={`${isPreview ? 'w-full h-full' : 'w-[320px] h-[480px] bg-gray-900/5 backdrop-blur-sm rounded-[40px] p-4 shadow-2xl border border-white/20'} flex flex-col items-center justify-center relative overflow-hidden`}>
            {/* Apple Wallet Pass Frame */}
            <div
                className={`${isPreview ? 'w-full h-full rounded-xl' : 'w-full h-[400px] rounded-[18px] shadow-xl'} overflow-hidden flex flex-col relative animate-in zoom-in duration-500`}
                style={{ backgroundColor: wallet.backgroundColor || '#ffffff' }}
            >
                {/* Top Section / Header */}
                <div className="px-4 py-3 flex justify-between items-center z-10">
                    <div className="flex items-center gap-2">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
                        ) : (
                            <div className="w-6 h-6 bg-gray-200 rounded-sm" />
                        )}
                        {wallet.showLogoText !== false && (
                            <span
                                className="text-[10px] font-bold tracking-tight"
                                style={{ color: wallet.foregroundColor }}
                            >
                                {(wallet.logoText || data.company || t('DIGITAL CARD')).toUpperCase()}
                            </span>
                        )}
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
                        {wallet.showNameFields !== false && (
                            <>
                                <span
                                    className="text-[10px] font-medium opacity-80"
                                    style={{ color: wallet.labelColor }}
                                >
                                    {t('NAME')}
                                </span>
                                <span
                                    className="text-xl font-bold leading-tight"
                                    style={{ color: wallet.foregroundColor }}
                                >
                                    {data.fullName || t('Your Name')}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Secondary/Auxiliary Fields */}
                <div className="px-4 py-4 grid grid-cols-2 gap-y-4 gap-x-2 flex-grow">
                    {wallet.showRole !== false && (
                        <div>
                            <span className="block text-[8px] font-medium opacity-70" style={{ color: wallet.labelColor }}>{t('ROLE')}</span>
                            <span className="block text-xs font-semibold" style={{ color: wallet.foregroundColor }}>{data.jobTitle || t('Your Position')}</span>
                        </div>
                    )}
                    {wallet.showCompany !== false && (
                        <div>
                            <span className="block text-[8px] font-medium opacity-70" style={{ color: wallet.labelColor }}>{t('COMPANY')}</span>
                            <span className="block text-xs font-semibold" style={{ color: wallet.foregroundColor }}>{data.company || t('Your Company')}</span>
                        </div>
                    )}
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
            {!isPreview && (
                <>
                    <div className="absolute top-[320px] left-8 right-8 h-[200px] bg-white/40 backdrop-blur-md rounded-t-[18px] -z-10 translate-y-12 rotate-[-2deg] border border-white/20" />
                    <p className="absolute bottom-6 text-[10px] text-gray-400 font-medium">{t('Apple Wallet Preview')}</p>
                </>
            )}
        </div>
    );
}
