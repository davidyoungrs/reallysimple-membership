import React, { useState, useRef, useEffect } from 'react';
import { initialCardData, type CardData } from '../types';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Upload, X, Building2, User, Palette, Type, Globe } from 'lucide-react';
import { PricingCards } from './PricingCards';
import { PhoneInput } from './ui/phone-input';
import { BusinessCard } from './BusinessCard';
import { useNavigate, Link } from 'react-router-dom';

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

            const padding = 40;
            const availableWidth = container.clientWidth - padding;
            const availableHeight = container.clientHeight - padding;

            const contentWidth = content.scrollWidth;
            const contentHeight = content.scrollHeight;

            if (contentWidth === 0 || contentHeight === 0) return;

            const scaleX = availableWidth / contentWidth;
            const scaleY = availableHeight / contentHeight;

            const newScale = Math.min(scaleX, scaleY, 1);
            setScale(newScale);
        };

        calculateScale();
        const observer = new ResizeObserver(calculateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        if (contentRef.current) observer.observe(contentRef.current);

        return () => observer.disconnect();
    }, [children]);

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

export function OnboardingWizard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2>(1);
    const [data, setData] = useState<CardData>({ 
        ...initialCardData,
        showPhoto: false, // Ensure no photo by default for wizard
        socialLinks: [
           { id: 'web1', platform: 'website', url: '', label: '' },
           { id: 'email1', platform: 'email', url: 'mailto:', label: 'Email' }
        ]
    });
    const logoInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Form inputs state mapped directly to card data
    const handleChange = (field: keyof CardData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhoneChange = (label: string, value: string) => {
        let newPhones = [...(data.phoneNumbers || [])];
        const existingIndex = newPhones.findIndex(p => p.label === label);
        
        if (existingIndex >= 0) {
            newPhones[existingIndex] = { ...newPhones[existingIndex], number: value };
        } else {
            newPhones.push({ id: Date.now().toString(), label, number: value });
        }
        handleChange('phoneNumbers', newPhones);
    };

    const getPhoneByLabel = (label: string) => {
        return data.phoneNumbers?.find(p => p.label === label)?.number || '';
    };

    const handleWebsiteChange = (value: string) => {
        let links = data.socialLinks || [];
        const websiteIndex = links.findIndex(l => l.platform === 'website');
        
        if (websiteIndex >= 0) {
            const newLinks = [...links];
            newLinks[websiteIndex] = { ...newLinks[websiteIndex], url: value };
            handleChange('socialLinks', newLinks);
        } else {
            handleChange('socialLinks', [...links, { id: 'web1', platform: 'website', url: value, label: '' }]);
        }
    };

    const handleEmailChange = (value: string) => {
        let links = data.socialLinks || [];
        const emailIndex = links.findIndex(l => l.platform === 'email');
        
        if (emailIndex >= 0) {
            const newLinks = [...links];
            newLinks[emailIndex] = { ...newLinks[emailIndex], url: `mailto:${value.replace('mailto:', '')}` };
            handleChange('socialLinks', newLinks);
        } else {
            handleChange('socialLinks', [...links, { id: 'email1', platform: 'email', url: `mailto:${value}`, label: 'Email' }]);
        }
    };

    const getEmail = () => {
        const link = data.socialLinks?.find(l => l.platform === 'email');
        return link?.url?.replace('mailto:', '') || '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('logoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const getWebsiteUrl = () => {
        const link = data.socialLinks?.find(l => l.platform === 'website');
        return link?.url || '';
    };



    const handlePlanSelection = (tierId: string, _priceId: string | null) => {
        // Save wizard data and intended tier to localStorage
        localStorage.setItem('wizard_data', JSON.stringify(data));
        localStorage.setItem('intended_tier', tierId);
        
        // Redirect to sign-up with a callback to /onboarding-callback
        navigate('/sign-up?redirect_url=' + encodeURIComponent(window.location.origin + '/onboarding-callback'));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
            
            {/* Left Side: Form / Progression */}
            <div className="w-full md:w-1/2 lg:w-5/12 bg-white flex flex-col h-screen border-r border-gray-200 shadow-xl z-20 relative overflow-hidden">
                
                {/* Progress Bar Header */}
                <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-1">
                            {step === 1 ? 'Step 1 of 2' : 'Final Step'}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {step === 1 ? 'Design Your Card' : 'Select Your Plan'}
                        </h1>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    
                    {step === 1 && (
                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                            {/* Personal Details */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">{t('Personal Details')}</h3>
                                </div>
                                <div className="space-y-4">
                                    {/* Profile Photo */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo</label>
                                        <div className="flex items-center gap-4">
                                            {data.avatarUrl ? (
                                                <div className="relative w-20 h-20 rounded-full border border-gray-200 p-1 group">
                                                    <img src={data.avatarUrl} alt="Avatar preview" className="w-full h-full rounded-full object-cover" />
                                                    <button 
                                                        onClick={() => {
                                                            handleChange('avatarUrl', '');
                                                            handleChange('showPhoto', false);
                                                        }}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                                >
                                                    <User className="w-6 h-6" />
                                                    <span className="text-[10px] font-bold mt-1">PHOTO</span>
                                                </button>
                                            )}
                                            <p className="text-xs text-gray-500 flex-1">
                                                Add a photo to build trust and make your card personal.
                                            </p>
                                        </div>
                                        <input 
                                            ref={avatarInputRef} 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        handleChange('avatarUrl', reader.result as string);
                                                        handleChange('showPhoto', true);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }} 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={data.fullName}
                                            onChange={(e) => handleChange('fullName', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Job Title</label>
                                        <input
                                            type="text"
                                            value={data.jobTitle}
                                            onChange={(e) => handleChange('jobTitle', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                            placeholder="Chief Executive Officer"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={getEmail()}
                                            onChange={(e) => handleEmailChange(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                                            <PhoneInput
                                                value={getPhoneByLabel('Mobile')}
                                                onChange={(_, formattedValue) => handlePhoneChange('Mobile', formattedValue)}
                                                className="w-full bg-white border border-gray-300 rounded-xl shadow-sm"
                                                placeholder="Mobile"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Office Number</label>
                                            <PhoneInput
                                                value={getPhoneByLabel('Office')}
                                                onChange={(_, formattedValue) => handlePhoneChange('Office', formattedValue)}
                                                className="w-full bg-white border border-gray-300 rounded-xl shadow-sm"
                                                placeholder="Office"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Website URL (Optional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Globe className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="url"
                                                value={getWebsiteUrl()}
                                                onChange={(e) => handleWebsiteChange(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Branding Section */}
                            <section className="space-y-4 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-indigo-100 p-2 rounded-lg">
                                        <Building2 className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">{t('Company & Branding')}</h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name</label>
                                        <input
                                            type="text"
                                            value={data.company}
                                            onChange={(e) => handleChange('company', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                            placeholder="Acme Corp"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Bio / Professional Summary</label>
                                        <textarea
                                            rows={3}
                                            value={data.bio}
                                            onChange={(e) => handleChange('bio', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm resize-none"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Company Logo</label>
                                        <div className="flex items-center gap-4">
                                            {data.logoUrl ? (
                                                <div className="relative w-20 h-20 rounded-xl border border-gray-200 p-2 bg-gray-50 flex items-center justify-center group">
                                                    <img src={data.logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                                                    <button 
                                                        onClick={() => handleChange('logoUrl', undefined)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                                >
                                                    <Upload className="w-5 h-5" />
                                                    <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                                                </button>
                                            )}
                                            <p className="text-xs text-gray-500 flex-1 leading-relaxed">
                                                Add your company logo for a professional look. Transparent PNG recommended.
                                            </p>
                                        </div>
                                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                    </div>
                                </div>
                            </section>

                            {/* Design Section */}
                            <section className="space-y-6 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-amber-100 p-2 rounded-lg">
                                        <Palette className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">{t('Cool Palettes')}</h3>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { name: 'Midnight', theme: '#000000', gradient: '#1a1a1a', text: '#ffffff' },
                                        { name: 'Ocean', theme: '#0ea5e9', gradient: '#000000', text: '#ffffff' },
                                        { name: 'Forest', theme: '#059669', gradient: '#000000', text: '#ffffff' },
                                        { name: 'Royal', theme: '#4f46e5', gradient: '#000000', text: '#ffffff' },
                                        { name: 'Sunset', theme: '#f43f5e', gradient: '#fbbf24', text: '#ffffff' },
                                        { name: 'Lava', theme: '#ef4444', gradient: '#000000', text: '#ffffff' },
                                        { name: 'Cloud', theme: '#f8fafc', gradient: '#e2e8f0', text: '#1e293b' },
                                        { name: 'Glass', theme: '#6366f1', gradient: '#a855f7', text: '#ffffff' }
                                    ].map((p) => (
                                        <button
                                            key={p.name}
                                            onClick={() => setData(prev => ({
                                                ...prev,
                                                themeColor: p.theme,
                                                gradientColor: p.gradient,
                                                textColor: p.text,
                                                backgroundType: 'gradient'
                                            }))}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${data.themeColor === p.theme ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                                        >
                                            <div className="flex -space-x-1">
                                                <div className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: p.theme }} />
                                                <div className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: p.gradient }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{p.name}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-purple-100 p-2 rounded-lg">
                                            <Type className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">{t('Typography')}</h3>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {[
                                            { name: 'Inter', font: 'Inter' },
                                            { name: 'Outfit', font: 'Outfit' },
                                            { name: 'Roboto', font: 'Roboto' },
                                            { name: 'Montserrat', font: 'Montserrat' },
                                            { name: 'Poppins', font: 'Poppins' },
                                            { name: 'Raleway', font: 'Raleway' },
                                            { name: 'Lato', font: 'Lato' },
                                            { name: 'Open Sans', font: 'Open Sans' },
                                            { name: 'Nunito', font: 'Nunito' },
                                            { name: 'Rubik', font: 'Rubik' },
                                            { name: 'Oswald', font: 'Oswald' },
                                            { name: 'Bebas Neue', font: 'Bebas Neue' },
                                            { name: 'Playfair', font: 'Playfair Display' },
                                            { name: 'Lora', font: 'Lora' },
                                            { name: 'Merriweather', font: 'Merriweather' },
                                            { name: 'PT Serif', font: 'PT Serif' },
                                            { name: 'Dancing Script', font: 'Dancing Script' },
                                            { name: 'Pacifico', font: 'Pacifico' },
                                            { name: 'Lobster', font: 'Lobster' },
                                            { name: 'Roboto Mono', font: 'Roboto Mono' }
                                        ].map((f) => (
                                            <button
                                                key={f.name}
                                                onClick={() => handleChange('font', f.font)}
                                                className={`p-3 rounded-xl border-2 transition-all text-center group ${data.font === f.font ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                                                style={{ fontFamily: f.font }}
                                            >
                                                <span className={`text-sm ${data.font === f.font ? 'text-blue-700 font-bold' : 'text-gray-700 font-medium'}`}>{f.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                           <PricingCards onSelect={handlePlanSelection} showButtons={true} compact={true} />
                        </div>
                    )}
                </div>

                {/* Bottom Navigation */}
                {step === 1 && (
                    <div className="p-6 md:p-8 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                        <Link to="/" className="text-gray-500 hover:text-gray-900 text-sm font-medium">
                            Cancel
                        </Link>
                        
                        <button 
                            onClick={() => setStep(2)}
                            disabled={!data.fullName}
                            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md
                                ${!data.fullName ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5'}`}
                        >
                            Review & Choose Plan <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="p-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm z-30 shrink-0">
                        <button 
                            onClick={() => setStep(1)}
                            className="text-gray-500 hover:text-gray-800 flex items-center gap-2 text-sm font-bold mx-auto"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Edit Design
                        </button>
                    </div>
                )}
            </div>

            {/* Right Side: Live Preview */}
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-gray-100 relative overflow-hidden">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none"></div>
                
                {/* Blur effect overlay for pricing step */}
                {step === 2 && (
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-10 flex items-center justify-center flex-col pointer-events-none transition-all duration-500">
                    </div>
                )}

                <div className={`w-full max-w-sm h-[750px] relative z-0 transition-transform duration-700 ${step === 2 ? 'scale-90 opacity-60' : 'scale-100'}`}>
                    <ScaleToFit>
                        <BusinessCard data={data} />
                    </ScaleToFit>
                </div>
                
                <div className="mt-8 text-center text-gray-400 text-sm font-medium tracking-wide uppercase shrink-0 relative z-0">
                    Live Preview
                </div>
            </div>
        </div>
    );
}

