import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface Step {
    target: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const steps: Step[] = [
        {
            target: '[data-tour="profile"]',
            title: t('Tour Profile Title') || 'Add Your Info',
            content: t('Tour Profile Desc') || 'Upload a photo and add your bio to let people know who you are.',
            position: 'right'
        },
        {
            target: '[data-tour="links"]',
            title: t('Tour Links Title') || 'Social & Contact Links',
            content: t('Tour Links Desc') || 'Add your social media profiles and contact information. You can drag to reorder them!',
            position: 'right'
        },
        {
            target: '[data-tour="branding"]',
            title: t('Tour Branding Title') || 'Brand Your Card',
            content: t('Tour Branding Desc') || 'Choose your colors, fonts, and layout style to match your brand.',
            position: 'right'
        },
        {
            target: '[data-tour="save"]',
            title: t('Tour Save Title') || 'Save & Share',
            content: t('Tour Save Desc') || 'Customise your URL and save your card to generate a QR code and start sharing.',
            position: 'left'
        }
    ];

    useEffect(() => {
        // Short delay to let the page settle
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
    };

    if (!isVisible) return null;

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" onClick={handleComplete} />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 pointer-events-auto animate-in zoom-in-95 fade-in duration-300">
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Sparkles className="w-4 h-4" />
                            <span>{t('Getting Started')}</span>
                        </div>
                        <button onClick={handleComplete} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-gray-100 flex">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`flex-1 transition-all duration-500 ${idx <= currentStep ? 'bg-blue-500' : ''}`}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-8">
                            {step.content}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-gray-400">
                                {currentStep + 1} / {steps.length}
                            </div>

                            <div className="flex gap-2">
                                {currentStep > 0 && (
                                    <button
                                        onClick={handlePrev}
                                        className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                                    </button>
                                )}
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                >
                                    {currentStep === steps.length - 1 ? t('Finish') : t('Next')}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
