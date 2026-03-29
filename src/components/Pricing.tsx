import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft } from 'lucide-react';
import ContactSection from './ui/contact-form';
import { PricingCards } from './PricingCards';

export function Pricing() {
    const { user } = useUser();
    const [showContactForm, setShowContactForm] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Home</span>
                    </Link>
                    
                    <div className="flex items-center gap-6">
                        {!user && (
                            <Link to="/sign-in" className="text-blue-600 hover:text-blue-700 font-bold text-sm">
                                Sign In
                            </Link>
                        )}
                        {user && (
                            <Link to="/app" className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-colors">
                                Dashboard
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 py-16 px-4">
                <div className="max-w-7xl mx-auto text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight uppercase italic">
                        Pricing Models
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        Choose the plan that fits your professional networking needs.
                    </p>
                </div>

                <PricingCards showButtons={true} />

                {/* Business CTA Section */}
                <div className="max-w-4xl mx-auto mt-24 mb-16 text-center">
                    <div className="bg-gray-900 rounded-[2.5rem] p-12 relative overflow-hidden shadow-2xl shadow-blue-900/10 border border-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase italic tracking-tight">
                                Are you a business that requires multiple cards?
                            </h2>
                            <p className="text-gray-400 text-lg mb-8 font-medium max-w-2xl mx-auto">
                                We offer custom solutions, centralized billing, and concierge design services for teams and organizations.
                            </p>
                            <button
                                onClick={() => {
                                    setShowContactForm(true);
                                    setTimeout(() => {
                                        document.getElementById('contact-sales')?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                }}
                                className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-xl"
                            >
                                Contact Sales
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contact Form Section */}
                {showContactForm && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <ContactSection />
                    </div>
                )}
            </main>
        </div>
    );
}
