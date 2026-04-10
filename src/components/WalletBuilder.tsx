import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Upload, Layout, Image as ImageIcon, User, RefreshCw, Lock } from 'lucide-react';
import { StripDesigner } from './StripDesigner';
import { useTier } from '../contexts/TierContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { type CardData, type WalletData } from '../types';
import { UpgradeModal } from './UpgradeModal';

interface WalletBuilderProps {
    data: CardData;
    onChange: (data: CardData) => void;
    isConcierge?: boolean;
}

export function WalletBuilder({ data, onChange, isConcierge = false }: WalletBuilderProps) {
    const { t } = useTranslation();
    const { isFeatureEnabled } = useTier();
    const [showStripDesigner, setShowStripDesigner] = useState(false);
    const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'style' | 'strip' | 'branding' | 'info'>('style');

    const wallet = data.wallet || {
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        labelColor: '#000000',
        logoText: data.company || '',
        showLogoText: true,
        stripImageUrl: isFeatureEnabled('strip_designer') ? '/wallet-strip.png' : undefined,
        showStripImage: isFeatureEnabled('strip_designer'),
        showNameFields: true,
        showRole: true,
        showCompany: true
    };

    const logoInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [hoveredField, setHoveredField] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const updateWallet = (updates: Partial<WalletData>) => {
        onChange({
            ...data,
            wallet: { ...wallet, ...updates }
        });
    };

    const extractColorsFromLogo = async () => {
        if (!wallet.logoUrl) return;
        setIsExtracting(true);

        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = wallet.logoUrl;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colors: Record<string, number> = {};
            
            // Sample every 4th pixel for speed
            for (let i = 0; i < imageData.length; i += 16) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];

                if (a < 128) continue; // Skip transparent

                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                colors[hex] = (colors[hex] || 0) + 1;
            }

            // Sort colors by frequency
            const sortedColors = Object.entries(colors).sort((a, b) => b[1] - a[1]);
            if (sortedColors.length > 0) {
                const dominant = sortedColors[0][0];
                // Simple contrast check for foreground
                const r = parseInt(dominant.slice(1, 3), 16);
                const g = parseInt(dominant.slice(3, 5), 16);
                const b = parseInt(dominant.slice(5, 7), 16);
                const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const foreground = luma > 128 ? '#000000' : '#ffffff';
                const label = luma > 128 ? '#374151' : '#9ca3af';

                updateWallet({
                    backgroundColor: dominant,
                    foregroundColor: foreground,
                    labelColor: label
                });
            }
        } catch (err) {
            console.error('Failed to extract colors:', err);
        } finally {
            setIsExtracting(false);
        }
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

    const tabs = [
        { id: 'style', label: t('Style'), icon: Palette, enabled: true },
        { id: 'strip', label: t('Strip Image'), icon: ImageIcon, enabled: isFeatureEnabled('strip_designer') },
        { id: 'branding', label: t('Branding'), icon: Layout, enabled: true },
        { id: 'info', label: t('Information'), icon: User, enabled: true },
    ];

    const isStarterGated = !isFeatureEnabled('wallet_passes') && !isConcierge;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Controls Sidebar */}
                <div className="flex-1 space-y-6">
                    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Tab Navigation */}
                        <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
                            {tabs.map((tab: { id: string; label: string; icon: any; enabled: boolean }) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            if (tab.enabled) {
                                                setActiveTab(tab.id as any);
                                            } else {
                                                setUpgradeModalFeature(tab.label);
                                            }
                                        }}
                                        className={`
                                            flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-2xl text-xs font-bold transition-all relative
                                            ${activeTab === tab.id 
                                                ? 'bg-white text-blue-600 shadow-sm' 
                                                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}
                                        `}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        {!tab.enabled && <Lock className="w-2.5 h-2.5 ml-1 inline-block text-gray-400" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {activeTab === 'style' && (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                    <Palette className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <h3 className="font-bold text-gray-900">{t('Wallet Appearance')}</h3>
                                            </div>

                                            {/* Cool Palettes */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                                        {t('Cool Palettes')}
                                                    </label>
                                                    {!isFeatureEnabled('custom_theme') && (
                                                        <Link to="/pricing" className="text-[10px] text-blue-600 font-bold hover:underline">
                                                            PRO FEATURE
                                                        </Link>
                                                    )}
                                                </div>
                                                <div className={`flex flex-wrap gap-2 ${!isFeatureEnabled('custom_theme') ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    {coolPalettes.map((p: any) => (
                                                        <button
                                                            key={p.name}
                                                            onClick={() => updateWallet({
                                                                backgroundColor: p.bg,
                                                                foregroundColor: p.fg,
                                                                labelColor: p.label
                                                            })}
                                                            className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                                        >
                                                            <div className="flex -space-x-1">
                                                                <div className="w-4 h-4 rounded-full border border-gray-100" style={{ backgroundColor: p.bg }} />
                                                                <div className="w-4 h-4 rounded-full border border-gray-100" style={{ backgroundColor: p.fg }} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-700">{p.name}</span>
                                                        </button>
                                                    ))}
                                                    {wallet.logoUrl && (
                                                        <button
                                                            onClick={extractColorsFromLogo}
                                                            disabled={isExtracting}
                                                            className="flex items-center gap-2 p-1.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100 transition-all group overflow-hidden relative"
                                                        >
                                                            <div className="flex -space-x-1">
                                                                <RefreshCw className={`w-4 h-4 text-blue-600 ${isExtracting ? 'animate-spin' : ''}`} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-blue-700">{isExtracting ? t('Extracting...') : t('Match Logo')}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`space-y-4 ${!isFeatureEnabled('custom_theme') ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {/* Color Pickers */}
                                                <div className="grid grid-cols-1 gap-4">
                                                    {[
                                                        { id: 'backgroundColor', label: t('Background'), value: wallet.backgroundColor },
                                                        { id: 'foregroundColor', label: t('Text Color'), value: wallet.foregroundColor },
                                                        { id: 'labelColor', label: t('Label Color'), value: wallet.labelColor },
                                                    ].map((item: { id: string, label: string, value: string | undefined }) => (
                                                        <div key={item.id} className="space-y-2">
                                                            <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">{item.label}</label>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="color"
                                                                    value={item.value || '#ffffff'}
                                                                    onChange={(e) => updateWallet({ [item.id]: e.target.value })}
                                                                    className="w-10 h-10 rounded-xl border-2 border-white shadow-sm cursor-pointer p-0 overflow-hidden shrink-0"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={item.value || '#ffffff'}
                                                                    onChange={(e) => updateWallet({ [item.id]: e.target.value })}
                                                                    className="w-full px-4 py-2 text-xs border border-gray-200 rounded-xl outline-none font-mono uppercase"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'strip' && (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <h3 className="font-bold text-gray-900">{t('Strip Image & Banner')}</h3>
                                            </div>

                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                                <label className="flex items-center justify-between cursor-pointer group">
                                                    <div className="space-y-0.5">
                                                        <span className="text-sm font-bold text-gray-800">{t('Hide Text Overlays')}</span>
                                                        <p className="text-[10px] text-gray-500">{t('Remove name and title from the banner area')}</p>
                                                    </div>
                                                    <div className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${wallet.hideStripText ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={wallet.hideStripText || false}
                                                            onChange={(e) => updateWallet({ hideStripText: e.target.checked })}
                                                            className="sr-only"
                                                        />
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${wallet.hideStripText ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </label>

                                                <label className="flex items-center justify-between cursor-pointer group">
                                                    <div className="space-y-0.5">
                                                        <span className="text-sm font-bold text-gray-800">{t('Show Strip Image')}</span>
                                                        <p className="text-[10px] text-gray-500">{t('Include a background image on the front of the card')}</p>
                                                    </div>
                                                    <div className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${wallet.showStripImage !== false ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={wallet.showStripImage !== false}
                                                            onChange={(e) => updateWallet({ showStripImage: e.target.checked })}
                                                            className="sr-only"
                                                        />
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${wallet.showStripImage !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </label>
                                            </div>

                                            {wallet.showStripImage !== false && (
                                                <div className="space-y-4">
                                                    <div className="aspect-[3/1] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative group">
                                                        <img
                                                            src={wallet.stripImageUrl || '/wallet-strip.png'}
                                                            alt="Wallet Strip"
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => isFeatureEnabled('strip_designer') && setShowStripDesigner(true)}
                                                                className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
                                                            >
                                                                <Palette className="w-3.5 h-3.5" />
                                                                {t('Open Designer')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={() => {
                                                            const url = prompt(t('Enter Strip Image URL'), wallet.stripImageUrl || '/wallet-strip.png');
                                                            if (url) updateWallet({ stripImageUrl: url });
                                                        }}
                                                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        {t('Link External Image URL')}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {activeTab === 'branding' && (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                                    <Layout className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <h3 className="font-bold text-gray-900">{t('Logo & Branding')}</h3>
                                            </div>

                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                                <label className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-gray-700">{t('Show Logo Text')}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={wallet.showLogoText !== false}
                                                        onChange={(e) => updateWallet({ showLogoText: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </label>

                                                <div className="space-y-2">
                                                    <label className="block text-[10px] uppercase font-bold text-gray-400">{t('Logo Label')}</label>
                                                    <input
                                                        type="text"
                                                        value={wallet.logoText || ''}
                                                        onChange={(e) => updateWallet({ logoText: e.target.value })}
                                                        disabled={wallet.showLogoText === false}
                                                        placeholder={data.company || t('Company Name')}
                                                        className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] uppercase font-bold text-gray-400">{t('Wallet Logo Icon')}</label>
                                                    {wallet.logoUrl && (
                                                        <button onClick={() => updateWallet({ logoUrl: undefined })} className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors">
                                                            {t('Remove')}
                                                        </button>
                                                    )}
                                                </div>

                                                <div
                                                    onDragOver={onDragOver}
                                                    onDragLeave={onDragLeave}
                                                    onDrop={onDrop}
                                                    onClick={() => isFeatureEnabled('custom_theme') && logoInputRef.current?.click()}
                                                    className={`
                                                        relative min-h-[100px] flex items-center justify-center border-2 border-dashed rounded-2xl transition-all
                                                        ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'}
                                                        ${!isFeatureEnabled('custom_theme') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    <input type="file" ref={logoInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                                    {wallet.logoUrl ? (
                                                        <img src={wallet.logoUrl} alt="Logo" className="max-h-16 max-w-[80%] object-contain" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                                                            <p className="text-[10px] font-bold text-gray-500">{t('Click to Upload Logo')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'info' && (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                                    <User className="w-4 h-4 text-orange-600" />
                                                </div>
                                                <h3 className="font-bold text-gray-900">{t('Information Fields')}</h3>
                                            </div>

                                            <div className="space-y-3">
                                                <label 
                                                    onMouseEnter={() => setHoveredField('name')}
                                                    onMouseLeave={() => setHoveredField(null)}
                                                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl border transition-all cursor-pointer ${hoveredField === 'name' ? 'border-blue-500 shadow-md ring-2 ring-blue-50' : 'border-gray-100 hover:border-blue-200'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        <span className="text-sm font-bold text-gray-700">{t('Display Name')}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={wallet.showNameFields !== false}
                                                        onChange={(e) => updateWallet({ showNameFields: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                </label>
                                                <label 
                                                    onMouseEnter={() => setHoveredField('role')}
                                                    onMouseLeave={() => setHoveredField(null)}
                                                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl border transition-all cursor-pointer ${hoveredField === 'role' ? 'border-blue-500 shadow-md ring-2 ring-blue-50' : 'border-gray-100 hover:border-blue-200'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                        <span className="text-sm font-bold text-gray-700">{t('Display Job Title')}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={wallet.showRole !== false}
                                                        onChange={(e) => updateWallet({ showRole: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                </label>
                                                <label 
                                                    onMouseEnter={() => setHoveredField('company')}
                                                    onMouseLeave={() => setHoveredField(null)}
                                                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-2xl border transition-all cursor-pointer ${hoveredField === 'company' ? 'border-blue-500 shadow-md ring-2 ring-blue-50' : 'border-gray-100 hover:border-blue-200'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                                        <span className="text-sm font-bold text-gray-700">{t('Display Company')}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={wallet.showCompany !== false}
                                                        onChange={(e) => updateWallet({ showCompany: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                </label>
                                            </div>

                                            <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                                                <div className="flex items-center gap-2 text-blue-700">
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">{t('Automatic Sync')}</span>
                                                </div>
                                                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                                                    {t('The back of your Apple Wallet card automatically syncs your Bio, Professional Links, and Contact Details from your profile.')}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </section>
                </div>

                {/* Removed internal preview to avoid duplication with parent CardBuilder */}
                <div className="lg:w-[0px] flex flex-col items-center">
                </div>
            </div>

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

            {/* Starter Locked Overlay */}
            {isStarterGated && (
                <div className="absolute inset-x-0 bottom-0 top-[49px] z-50 flex items-center justify-center p-6 text-center rounded-b-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />
                    <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-sm w-full space-y-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-900">{t('Wallet Passes Gated')}</h3>
                            <p className="text-sm text-gray-500">
                                {t('Upgrade to Pro to create and customize Apple & Google Wallet passes for your business cards.')}
                            </p>
                        </div>
                        <Link 
                            to="/pricing"
                            className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                        >
                            {t('Upgrade to Pro')}
                        </Link>
                    </div>
                </div>
            )}

            {/* Upgrade Modal for Specific Features */}
            <UpgradeModal
                isOpen={!!upgradeModalFeature}
                onClose={() => setUpgradeModalFeature(null)}
                featureName={upgradeModalFeature || ''}
            />
        </div>
    );
}

export function WalletPreview({ data, isPreview, isFlipped, hoveredField }: { data: CardData; isPreview?: boolean; isFlipped?: boolean; hoveredField?: string | null }) {
    const { isFeatureEnabled } = useTier();
    const canShowStrip = isFeatureEnabled('strip_designer');

    const wallet = data.wallet || {
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        labelColor: '#000000',
        logoText: data.company || '',
        showLogoText: true,
        stripImageUrl: canShowStrip ? '/wallet-strip.png' : undefined,
        showNameFields: true,
        showRole: true,
        showCompany: true,
        hideStripText: false,
        showStripImage: canShowStrip
    };

    const logoUrl = wallet.logoUrl || data.logoUrl;
    
    // Final override: if tier doesn't support strip, force it off in preview
    const effectiveShowStrip = canShowStrip && (wallet.showStripImage !== false);

    return (
        <div className={`
            ${isPreview ? 'w-full h-full' : 'w-[320px] h-[480px] bg-gray-900/5 backdrop-blur-sm rounded-[40px] p-4 shadow-2xl border border-white/20'} 
            flex flex-col items-center justify-center relative [preserve-perspective:1000px]
        `}>
            {/* 3D Flip Container */}
            <motion.div
                className="w-full h-[400px] relative transition-all duration-700 [transform-style:preserve-3d]"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {/* FRONT OF CARD */}
                <div
                    className={`${isPreview ? 'rounded-xl' : 'rounded-[18px] shadow-xl'} absolute inset-0 w-full h-full overflow-hidden flex flex-col [backface-visibility:hidden]`}
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

                    {/* Strip Image Area */}
                    {effectiveShowStrip ? (
                        <div className="h-[120px] w-full relative">
                            <img
                                src={wallet.stripImageUrl || '/wallet-strip.png'}
                                alt="Strip"
                                className="w-full h-full object-cover"
                            />
                            {/* Primary Field Over Strip (Unless Hidden) */}
                            {!wallet.hideStripText && (
                                <div className="absolute inset-0 flex flex-col justify-center px-4 pt-4">
                                        <div className={`flex flex-col transition-all duration-300 ${hoveredField === 'name' ? 'scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`}>
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
                            )}
                        </div>
                    ) : (
                        /* Minimalist Non-Strip Mode */
                        <div className="px-4 py-8 z-10 flex-grow flex flex-col justify-center">
                            <div className={`flex flex-col transition-all duration-300 ${hoveredField === 'name' ? 'scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]' : ''}`}>
                                {wallet.showNameFields !== false && (
                                    <>
                                        <span
                                            className="text-[10px] font-medium opacity-60"
                                            style={{ color: wallet.labelColor }}
                                        >
                                            {t('NAME')}
                                        </span>
                                        <span
                                            className="text-3xl font-black tracking-tight leading-none mb-1"
                                            style={{ color: wallet.foregroundColor }}
                                        >
                                            {data.fullName || t('Your Name')}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Secondary/Auxiliary Fields */}
                    <div className="px-4 py-4 grid grid-cols-2 gap-y-4 gap-x-2 flex-grow">
                        {wallet.showRole !== false && (
                            <div className={`transition-all duration-300 ${hoveredField === 'role' ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] bg-white/10 rounded-lg p-1 -m-1' : ''}`}>
                                <span className="block text-[8px] font-medium opacity-70" style={{ color: wallet.labelColor }}>{t('ROLE')}</span>
                                <span className="block text-xs font-semibold" style={{ color: wallet.foregroundColor }}>{data.jobTitle || t('Your Position')}</span>
                            </div>
                        )}
                        {wallet.showCompany !== false && (
                            <div className={`transition-all duration-300 ${hoveredField === 'company' ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] bg-white/10 rounded-lg p-1 -m-1' : ''}`}>
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
                                    {[...Array(9)].map((_: any, i: number) => <div key={i} className="w-full aspect-square bg-black rounded-[1px]" />)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK OF CARD */}
                <div
                    className={`${isPreview ? 'rounded-xl' : 'rounded-[18px] shadow-xl'} absolute inset-0 w-full h-full overflow-hidden flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]`}
                    style={{ backgroundColor: wallet.backgroundColor || '#ffffff' }}
                >
                    <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('Synched Information')}</h4>
                            
                            {data.bio && (
                                <div className="space-y-1">
                                    <span className="text-[8px] font-bold opacity-50" style={{ color: wallet.labelColor }}>{t('BIO')}</span>
                                    <p className="text-[10px] leading-relaxed" style={{ color: wallet.foregroundColor }}>{data.bio}</p>
                                </div>
                            )}

                            {Array.isArray(data.phoneNumbers) && data.phoneNumbers.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-[8px] font-bold opacity-50" style={{ color: wallet.labelColor }}>{t('PHONE')}</span>
                                    {data.phoneNumbers.map((p: any, i: number) => (
                                        <p key={i} className="text-[10px] font-medium" style={{ color: wallet.foregroundColor }}>{p.label}: {p.number}</p>
                                    ))}
                                </div>
                            )}

                            {Array.isArray(data.socialLinks) && data.socialLinks.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-[8px] font-bold opacity-50" style={{ color: wallet.labelColor }}>{t('LINKS')}</span>
                                    {data.socialLinks.map((l: any, i: number) => (
                                        <p key={i} className="text-[10px] font-medium flex items-center gap-2" style={{ color: wallet.foregroundColor }}>
                                            <span className="capitalize">{l.platform}</span>
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center justify-center bg-gray-50/50">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{t('Automatically Managed by Really Simple')}</span>
                    </div>
                </div>
            </motion.div>

            {/* Hint of background card */}
            {!isPreview && (
                <>
                    <div className="absolute top-[320px] left-8 right-8 h-[200px] bg-white/40 backdrop-blur-md rounded-t-[18px] -z-10 translate-y-12 rotate-[-2deg] border border-white/20" />
                    <p className="absolute bottom-6 text-[10px] text-gray-400 font-medium">{t('Live Wallet Preview')}</p>
                </>
            )}
        </div>
    );
}
