import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, 
    BookOpen, 
    Zap, 
    Layout, 
    Layers, 
    Smartphone, 
    Share2, 
    CheckCircle,
    ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const UserGuide = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const sections = [
        {
            id: 'onboarding',
            title: t('Onboarding Wizard'),
            description: t('Create your professional card in under 60 seconds with our intuitive setup flow.'),
            image: '/guide/onboarding.png',
            icon: Zap,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            steps: [
                t('Enter your details (Name, Role, Company)'),
                t('Pick a professional theme'),
                t('Watch real-time updates in the 3D preview')
            ]
        },
        {
            id: 'dashboard',
            title: t('Command Center'),
            description: t('Manage all your digital assets and track engagement from a single, powerful dashboard.'),
            image: '/guide/dashboard.png',
            icon: Layout,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            steps: [
                t('Monitor total views and link clicks'),
                t('View recent activity and visitor locations'),
                t('Manage multiple cards from one place')
            ]
        },
        {
            id: 'editor',
            title: t('Creative Studio'),
            description: t('Fine-tune your brand with deep customization options for every element of your card.'),
            image: '/guide/editor.png',
            icon: Layers,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            steps: [
                t('Choose from "Cool Palettes" themes'),
                t('Add rich media like TikTok or Instagram embeds'),
                t('Update contact info and social links instantly')
            ]
        },
        {
            id: 'wallet',
            title: t('Wallet Integration'),
            description: t('Your card lives in your phone. Setup Apple Wallet and Google Pay passes in one tap.'),
            image: '/guide/wallet.png',
            icon: Smartphone,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            steps: [
                t('Customize your wallet pass appearance'),
                t('Add to phone for offline sharing'),
                t('Automatic updates across all devices')
            ]
        },
        {
            id: 'sharing',
            title: t('Infinite Sharing'),
            description: t('Share your profile via custom URLs, QR codes, or direct wallet sharing.'),
            image: '/guide/landing.png',
            icon: Share2,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50',
            steps: [
                t('Short, professional username URLs'),
                t('High-resolution QR code generator'),
                t('Lead capture forms for networking events')
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span>{t('Back to Home')}</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            <span className="font-bold text-slate-900 tracking-tight">Really Simple Guide</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <div className="pt-32 pb-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                        Master Your <span className="text-blue-600">Digital Presence</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        This guide covers everything you need to know about setting up, customizing, and sharing your professional digital cards on Really Simple.
                    </p>
                </div>
            </div>

            {/* Guide Sections */}
            <div className="max-w-7xl mx-auto px-4 pb-24 space-y-24">
                {sections.map((section, idx) => (
                    <div 
                        key={section.id} 
                        className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
                    >
                        {/* Text Content */}
                        <div className="flex-1 space-y-6">
                            <div className={`${section.bg} ${section.color} w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm`}>
                                <section.icon className="w-6 h-6" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{section.title}</h2>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                {section.description}
                            </p>
                            <ul className="space-y-3">
                                {section.steps.map((step, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Image Preview */}
                        <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                                <div className="relative bg-white rounded-[1.5rem] overflow-hidden shadow-2xl border border-slate-200">
                                    <img 
                                        src={section.image} 
                                        alt={section.title}
                                        className="w-full h-auto object-contain transform transition duration-700 group-hover:scale-[1.02]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Call to Action */}
            <div className="bg-white border-t border-slate-200 py-20 px-4">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <h2 className="text-3xl font-bold text-slate-900">{t('Ready to build your digital card?')}</h2>
                    <p className="text-lg text-slate-600">
                        Join thousands of professionals who have simplified their networking.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={() => navigate('/create')}
                            className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
                        >
                            {t('Get Started Free')}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub-footer */}
            <div className="bg-slate-50 border-t border-slate-200 py-8 px-4 text-center">
                <p className="text-sm text-slate-400 font-medium">
                    © {new Date().getFullYear()} Really Simple Apps. All rights reserved.
                </p>
            </div>
        </div>
    );
};
