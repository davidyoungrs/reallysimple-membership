import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface PolicyContentProps {
    type: 'privacy' | 'terms' | 'cookies';
}

interface Section {
    title: string;
    text: React.ReactNode;
}

interface PolicyData {
    title: string;
    lastUpdated: string;
    contactEmail: string;
    intro?: string;
    sections: Section[];
}

const PolicyContent = ({ type }: PolicyContentProps) => {

    const content: Record<'privacy' | 'terms' | 'cookies', PolicyData> = {
        privacy: {
            title: "Privacy Policy",
            lastUpdated: "June 7, 2026",
            contactEmail: "info@reallysimpleapps.com",
            intro: "Really Simple Apps (“we,” “us,” or “our”) is committed to protecting your personal information and your right to privacy.",
            sections: [
                {
                    title: "1. What Information We Collect",
                    text: (
                        <>
                            <p>We may collect and process the following personal data:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Your name</li>
                                <li>Contact details (phone number, email address)</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "2. How We Use Your Information",
                    text: (
                        <>
                            <p>We use your data to:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Contact you regarding the services and solutions we offer.</li>
                                <li>Maintain internal records.</li>
                                <li>Comply with legal or regulatory obligations.</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "3. Legal Basis for Processing",
                    text: (
                        <>
                            <p>We process your personal data under the following lawful bases:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Contract (to provide services you have requested)</li>
                                <li>Legitimate interests (to manage our business effectively)</li>
                                <li>Legal obligations (where applicable)</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "4. Data Sharing",
                    text: (
                        <>
                            <p>We do not sell or rent your personal data. We may share your data with:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Service providers (e.g., booking systems) who process data on our behalf.</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "5. Data Retention",
                    text: "We retain your data only as long as necessary to fulfil the purposes we collected it for, including legal, accounting, or reporting requirements."
                },
                {
                    title: "6. Data Security",
                    text: "We take appropriate technical and organisational measures to protect your personal data from unauthorised access, loss, or misuse."
                },
                {
                    title: "7. Your Rights",
                    text: (
                        <>
                            <p>Under UK GDPR, you have the right to:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Access your personal data.</li>
                                <li>Request correction of inaccurate data</li>
                                <li>Request deletion of your data</li>
                                <li>Object to or restrict processing.</li>
                                <li>Withdraw consent at any time (where applicable)</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "8. Contact Us",
                    text: "If you have any questions about this privacy notice or your data, please contact: info@reallysimpleapps.com"
                },
                {
                    title: "9. Complaints",
                    text: "You have the right to lodge a complaint with the Information Commissioner’s Office (ICO) if you believe your data has been handled improperly."
                }
            ]
        },
        terms: {
            title: "Terms and Conditions",
            lastUpdated: "February 16, 2026",
            contactEmail: "support@reallysimple.apps",
            intro: "Welcome to Really Simple Cards! These Terms and Conditions (“Terms”) govern your use of our digital products and services, including our website (reallysimple.apps) and the Really Simple Cards platform. By using Really Simple Cards, creating a profile, or subscribing, you agree to these Terms. Please read them carefully.",
            sections: [
                {
                    title: "1. General Terms & Applicability",
                    text: "These Terms apply to all interactions with Really Simple Apps. We reserve the right to update these Terms at any time. Updates become effective immediately upon posting. Continued use signifies acceptance of the revised Terms."
                },
                {
                    title: "2. Service Description",
                    text: (
                        <>
                            <p>Really Simple Cards provides a digital business card ecosystem. Our services include:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Profile Hosting: Creation and management of digital business profiles.</li>
                                <li>Lead Capture: Tools for contact collection and storage.</li>
                                <li>Sharing Tools: QR code generation, Apple Wallet passes, and custom URLs.</li>
                                <li>Analytics: Engagement reporting (views, clicks, geographic data).</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "3. User Accounts",
                    text: (
                        <>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>You are responsible for maintaining the security of your account and password.</li>
                                <li>You must provide accurate and complete information.</li>
                                <li>Content you post must not violate any laws or third-party rights.</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "4. Data Ownership & Fair Usage",
                    text: (
                        <>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Data Ownership:</strong> You own all contact data and leads captured via your profile. You may export this data at any time during an active subscription.</li>
                                <li><strong>Fair Usage:</strong> To ensure platform stability, we prohibit spamming, scraping, or misrepresenting identity. Excessive volume that impacts performance may require a plan upgrade.</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "5. Subscription Plans & Pricing",
                    text: (
                        <>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>We may offer free and paid (Pro) tiers.</li>
                                <li>Paid subscriptions renew automatically unless cancelled at least 48 hours before the next billing date.</li>
                                <li>Pricing may be adjusted at any time with prior notification.</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "6. Limitation of Liability",
                    text: "Really Simple Cards is provided 'as is'. We are not liable for indirect, incidental, or consequential damages. Our maximum liability is limited to the amount paid for the specific service."
                },
                {
                    title: "7. Governing Law",
                    text: "These Terms are governed by the laws of the United Kingdom. Any disputes shall be subject to the exclusive jurisdiction of the courts of the UK."
                }
            ]
        },
        cookies: {
            title: "Cookies Policy",
            lastUpdated: "February 16, 2026",
            contactEmail: "support@reallysimple.apps",
            sections: [
                {
                    title: "1. What are cookies?",
                    text: "Cookies are small text files stored on your device when you visit a website. They help the website remember your preferences and understand how you interact with the content."
                },
                {
                    title: "2. How we use cookies",
                    text: (
                        <>
                            <p>Really Simple Cards uses cookies for the following purposes:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Essential Cookies:</strong> Necessary for the website to function, such as maintaining your login session.</li>
                                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with cards and our dashboard, allowing us to improve the service.</li>
                                <li><strong>Functional Cookies:</strong> Remember choices you make (like language preferences).</li>
                            </ul>
                        </>
                    )
                },
                {
                    title: "3. Third-Party Cookies",
                    text: "We use third-party services like Clerk (for authentication) and Google Analytics. These services may set their own cookies to provide their functionality."
                },
                {
                    title: "4. Your Options",
                    text: (
                        <>
                            <p>Most web browsers allow you to control cookies through their settings. You can:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Block all cookies (this may prevent some parts of the site from working).</li>
                                <li>Delete existing cookies.</li>
                                <li>Set preferences for which cookies to accept.</li>
                            </ul>
                        </>
                    )
                }
            ]
        }
    };

    const active = content[type];

    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{active.title}</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: {active.lastUpdated}</p>

            {active.intro && (
                <p className="text-gray-600 leading-relaxed mb-8 font-medium">
                    {active.intro}
                </p>
            )}

            <div className="space-y-8">
                {active.sections.map((section, idx) => (
                    <section key={idx}>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                        <div className="text-gray-600 leading-relaxed">{section.text}</div>
                    </section>
                ))}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100">
                <p className="text-gray-600">
                    Have questions? Contact us at{' '}
                    <a href={`mailto:${active.contactEmail}`} className="text-blue-600 font-medium hover:underline">
                        {active.contactEmail}
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
