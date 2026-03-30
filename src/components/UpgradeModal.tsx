import { X, Lock } from 'lucide-react';
import { PricingCards } from './PricingCards';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName: string;
}

export function UpgradeModal({ isOpen, onClose, featureName }: UpgradeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="relative bg-gray-50 rounded-3xl shadow-2xl w-full max-w-5xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-200">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-100 transition-colors z-20"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                <div className="p-8 text-center bg-white border-b border-gray-200 rounded-t-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 -ml-20 -mb-20 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">
                            Unlock {featureName}
                        </h2>
                        <p className="text-gray-500 max-w-lg mx-auto text-lg leading-relaxed">
                            Upgrade your account to access premium features, advanced customizations, and powerful tools to grow your network.
                        </p>
                    </div>
                </div>

                <div className="p-4 sm:p-8 bg-gray-50">
                    <PricingCards compact />
                </div>
            </div>
        </div>
    );
}
