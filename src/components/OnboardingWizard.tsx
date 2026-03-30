import React, { useState, useRef, useEffect } from 'react';
import { initialCardData, type CardData } from '../types';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Upload, X, Check, Star, Zap, Building2, User } from 'lucide-react';
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
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [data, setData] = useState<CardData>({ ...initialCardData });
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Form inputs state mapped directly to card data
    const handleChange = (field: keyof CardData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhoneChange = (value: string) => {
        if (!data.phoneNumbers || data.phoneNumbers.length === 0) {
            handleChange('phoneNumbers', [{ id: '1', label: 'Mobile', number: value }]);
            return;
        }
        const newPhones = [...data.phoneNumbers];
        newPhones[0] = { ...newPhones[0], number: value };
        handleChange('phoneNumbers', newPhones);
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

    const getPrimaryPhone = () => {
        return data.phoneNumbers?.[0]?.number || '';
    };

    const handlePlanSelection = (tier: 'starter' | 'pro' | 'pro_plus') => {
        // Save wizard data and intended tier to localStorage
        localStorage.setItem('wizard_data', JSON.stringify(data));
        localStorage.setItem('intended_tier', tier);
        
        // Redirect to sign-up with a callback to /onboarding-callback
        navigate('/sign-up?redirect_url=' + encodeURIComponent(window.location.origin + '/onboarding-callback'));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
            
            {/* Left Side: Form / Progression */}
            <div className="w-full md:w-1/2 lg:w-5/12 bg-white flex flex-col h-full min-h-screen border-r border-gray-200 shadow-xl z-20 relative">
                
                {/* Progress Bar Header */}
                <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-1">
                            {step === 1 ? 'Step 1 of 3' : step === 2 ? 'Step 2 of 3' : 'Final Step'}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {step === 1 ? 'Your Details' : step === 2 ? 'Your Brand' : 'Select Your Plan'}
                        </h1>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-32">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <p className="text-gray-500 mb-6">Let's start with the basics. This information will be immediately visible on your new digital business card.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={data.fullName}
                                            onChange={(e) => handleChange('fullName', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                            placeholder="John Doe"
                                        />
                                    </div>
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                                        <PhoneInput
                                            value={getPrimaryPhone()}
                                            onChange={(_, formattedValue) => handlePhoneChange(formattedValue)}
                                            className="w-full bg-white border border-gray-300 rounded-xl shadow-sm"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Website URL (Optional)</label>
                                    <input
                                        type="url"
                                        value={getWebsiteUrl()}
                                        onChange={(e) => handleWebsiteChange(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <p className="text-gray-500 mb-6">Build trust by adding your company details and logo to your card.</p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building2 className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={data.company}
                                            onChange={(e) => handleChange('company', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                            placeholder="Acme Corp"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Company Logo</label>
                                    
                                    <div className="flex items-center gap-6">
                                        {data.logoUrl ? (
                                            <div className="relative w-32 h-32 rounded-2xl border border-gray-200 p-2 flex items-center justify-center bg-gray-50 shadow-sm transition-all hover:shadow-md">
                                                <img src={data.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                                <button
                                                    onClick={() => handleChange('logoUrl', undefined)}
                                                    className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-md border border-gray-200 text-gray-500 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => logoInputRef.current?.click()}
                                                className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all gap-2"
                                            >
                                                <Upload className="w-6 h-6" />
                                                <span className="text-sm font-medium">{t('Upload Logo')}</span>
                                            </button>
                                        )}
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-gray-900 mb-1">Logo Guidelines</h4>
                                            <ul className="text-xs text-gray-500 space-y-1">
                                                <li>• Use a square or circular image</li>
                                                <li>• Transparent background recommended (PNG)</li>
                                                <li>• Max file size: 5MB</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                                <h3 className="text-blue-900 font-bold mb-1 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-blue-600" /> Nice looking card!
                                </h3>
                                <p className="text-sm text-blue-800">Your card is ready. Create an account to save it and start sharing immediately.</p>
                            </div>

                            <div className="space-y-4">
                                {/* Starter Tier */}
                                <div className="border border-gray-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white" onClick={() => handlePlanSelection('starter')}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-900 text-lg">Starter</h3>
                                        <span className="text-gray-500 font-medium">Free</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">Perfect for individuals getting started.</p>
                                    <ul className="text-sm text-gray-600 space-y-2 mb-4">
                                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 1 Digital Business Card</li>
                                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Add to Apple/Google Wallet</li>
                                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Standard Analytics</li>
                                    </ul>
                                    <button className="w-full py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                        Create Free Account
                                    </button>
                                </div>

                                {/* Pro Tier */}
                                <div className="border-2 border-blue-600 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all cursor-pointer bg-white relative overflow-hidden" onClick={() => handlePlanSelection('pro')}>
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                                        Most Popular
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">Professional</h3>
                                        <span className="text-blue-600 font-bold">$7 <span className="text-xs text-gray-500 font-normal">/mo</span></span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">For professionals who need to stand out.</p>
                                    <ul className="text-sm text-gray-600 space-y-2 mb-4">
                                        <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-blue-600" /> Up to 5 Cards</li>
                                        <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-blue-600" /> Custom Card Slugs (e.g. /card/name)</li>
                                        <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-blue-600" /> Custom Backgrounds & Themes</li>
                                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> Everything in Starter</li>
                                    </ul>
                                    <button className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2">
                                        <Zap className="w-4 h-4 fill-white" /> Subscribe to Pro
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Navigation */}
                {step < 3 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-white border-t border-gray-100 flex items-center justify-between">
                        {step > 1 ? (
                            <button 
                                onClick={() => setStep(step - 1 as 1|2|3)}
                                className="px-6 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        ) : (
                            <Link to="/" className="text-gray-500 hover:text-gray-900 text-sm font-medium">
                                Cancel
                            </Link>
                        )}
                        
                        <button 
                            onClick={() => setStep(step + 1 as 1|2|3)}
                            disabled={step === 1 && !data.fullName}
                            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md
                                ${step === 1 && !data.fullName ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5'}`}
                        >
                            Continue <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Right Side: Live Preview */}
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-gray-100 relative overflow-hidden">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none"></div>
                
                {/* Blurre effect overlay for pricing step */}
                {step === 3 && (
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-10 flex items-center justify-center flex-col pointer-events-none transition-all duration-500">
                    </div>
                )}

                <div className={`w-full max-w-sm h-[750px] relative z-0 transition-transform duration-700 ${step === 3 ? 'scale-95' : 'scale-100'}`}>
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

