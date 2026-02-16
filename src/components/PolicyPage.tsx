import { ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface PolicyContentProps {
    type: 'privacy' | 'terms' | 'cookies';
}

const PolicyContent = ({ type }: PolicyContentProps) => {

    const content = {
        privacy: {
            title: "Privacy Policy",
            lastUpdated: "February 16, 2026",
            sections: [
                {
                    title: "1. Introduction",
                    text: "Really Simple Apps is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, share, and safeguard your information when you use our website and our Really Simple Cards platform."
                },
                {
                    title: "2. Who we are",
                    text: "Really Simple Apps is the data controller responsible for deciding how and why your personal information is used. For any privacy-related questions, contact us at support@reallysimple.apps."
                },
                {
                    title: "3. Information we collect",
                    text: "We collect personal information that you voluntarily provide, such as your name, phone number, email address, bio, and profile photo when building your card. We also collect technical data indirectly through cookies."
                },
                {
                    title: "4. Legal basis",
                    text: "We process data based on consent, contractual necessity, legal obligations, and legitimate interests such as improving our services."
                },
                {
                    title: "5. Data Sharing",
                    text: "We only share data when necessary: Public profiles are intended for sharing; Service providers like Clerk and Supabase help operate our platform; and if required by law."
                },
                {
                    title: "6. Your Rights",
                    text: "Depending on your location, you have rights to access, correct, erase, or port your data. Email support@reallysimple.apps to exercise these rights."
                }
            ]
        },
        terms: {
            title: "Terms and Conditions",
            lastUpdated: "February 16, 2026",
            sections: [
                {
                    title: "1. Agreement to Terms",
                    text: "By using Really Simple Cards, you agree to be bound by these Terms. We reserve the right to update these terms at any time."
                },
                {
                    title: "2. Service Description",
                    text: "Really Simple Cards provides digital business card hosting, lead capture tools, sharing tools (QR codes, Wallet passes), and analytics."
                },
                {
                    title: "3. User Responsibilities",
                    text: "You are responsible for account security and the accuracy of the information you provide. Content must not violate any laws."
                },
                {
                    title: "4. Data Ownership",
                    text: "You own all contact data and leads captured via your profile. You may export this data at any time during an active subscription."
                },
                {
                    title: "5. Limitation of Liability",
                    text: "Really Simple Cards is provided 'as is'. Our maximum liability is limited to the amount paid for the specific service."
                }
            ]
        },
        cookies: {
            title: "Cookies Policy",
            lastUpdated: "February 16, 2026",
            sections: [
                {
                    title: "1. What are cookies?",
                    text: "Cookies are small text files stored on your device that help us remember your preferences and understand how you interact with our site."
                },
                {
                    title: "2. How we use them",
                    text: "We use essential cookies for login, analytics cookies to improve our service, and functional cookies for preferences like language."
                },
                {
                    title: "3. Third-party cookies",
                    text: "We use services like Clerk and Google Analytics which may set their own cookies."
                },
                {
                    title: "4. Your Options",
                    text: "You can block or delete cookies through your browser settings, though some site features may stop working."
                }
            ]
        }
    };

    const active = content[type];

    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{active.title}</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: {active.lastUpdated}</p>

            <div className="space-y-8">
                {active.sections.map((section, idx) => (
                    <section key={idx}>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                        <p className="text-gray-600 leading-relaxed">{section.text}</p>
                    </section>
                ))}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100">
                <p className="text-gray-600">
                    Have questions? Contact us at{' '}
                    <a href="mailto:support@reallysimple.apps" className="text-blue-600 font-medium hover:underline">
                        support@reallysimple.apps
                    </a>
                </p>
            </div>
        </div>
    );
};

export const PolicyPage = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const validTypes: ('privacy' | 'terms' | 'cookies')[] = ['privacy', 'terms', 'cookies'];
    const activeType = validTypes.includes(type as any) ? (type as 'privacy' | 'terms' | 'cookies') : 'privacy';

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span>Back to Home</span>
                        </button>
                        <div className="font-bold text-gray-900">Really Simple Cards</div>
                    </div>
                </div>
            </nav>

            <div className="pt-24 pb-12">
                <PolicyContent type={activeType} />
            </div>

            {/* Footer-like navigation */}
            <div className="bg-gray-50 border-t border-gray-100 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex flex-wrap justify-center gap-6 mb-4">
                        <button onClick={() => navigate('/privacy')} className={`text-sm ${activeType === 'privacy' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}>Privacy Policy</button>
                        <button onClick={() => navigate('/terms')} className={`text-sm ${activeType === 'terms' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}>Terms of Service</button>
                        <button onClick={() => navigate('/cookies')} className={`text-sm ${activeType === 'cookies' ? 'text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}>Cookies Policy</button>
                    </div>
                    <p className="text-xs text-gray-400">© {new Date().getFullYear()} Really Simple Apps. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};
