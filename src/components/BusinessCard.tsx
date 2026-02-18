import { LeadForm } from './leads/LeadForm';
import { Download, Wallet, Loader2, Phone, MessageSquare } from 'lucide-react';

export function BusinessCard({ data, onLinkClick }: BusinessCardProps) {
    const { t } = useTranslation();
    const {
        fullName,
        // ... other destructuring
    } = data;
    const [loading, setLoading] = useState(false);
    const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
    // ...

    // ... (keep usage of useEffect etc)

    const handleConnect = () => {
        if (onLinkClick) onLinkClick('contact', 'lead_form');
        setIsLeadFormOpen(true);
    };

    return (
        <div
        // ... wrapper
        >
            {/* ... background */}

            <div
            // ... container
            >
                {/* ... content */}

                {/* Actions & QR Code */}
                <div className={`w-full space-y-4 mb-4 ${data.stickyActionBar ? 'pb-24' : ''}`}>
                    {/* ... embeds */}

                    {data.stickyActionBar ? (
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-50 backdrop-blur-sm">
                            <div className="flex gap-2 max-w-md mx-auto">
                                <button
                                    onClick={handleConnect}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 py-3.5 rounded-xl transition-all active:scale-95 font-bold shadow-lg cursor-pointer"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{t('Connect')}</span>
                                </button>
                                <button
                                    onClick={handleDownloadVCard}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-100 py-3.5 rounded-xl transition-all active:scale-95 font-medium shadow-lg cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('Save')}</span>
                                </button>
                                <button
                                    onClick={handleAddToWallet}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-black/80 hover:bg-black text-white border border-white/20 py-3.5 rounded-xl transition-all active:scale-95 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{loading ? t('...') : t('Wallet')}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleConnect}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-all active:scale-95 font-bold shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span>{t('Connect with {{name}}', { name: data.firstName || 'Me' })}</span>
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDownloadVCard}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 py-3 rounded-xl transition-all active:scale-95 font-medium cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>{t('Save Contact')}</span>
                                </button>
                                <button
                                    onClick={handleAddToWallet}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 py-3 rounded-xl transition-all active:scale-95 font-medium text-white/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                                    <span>{loading ? t('Creating...') : t('Wallet Pass')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Lead Form Modal */}
                    <LeadForm
                        cardId={data.slug || 'unknown'}
                        isOpen={isLeadFormOpen}
                        onClose={() => setIsLeadFormOpen(false)}
                        ownerName={data.firstName || fullName.split(' ')[0]}
                    />


                    <div className={`flex justify-center pt-2 ${data.stickyActionBar ? 'mb-4' : ''}`}>
                        <div className="p-2 bg-white rounded-xl shadow-lg">
                            {/* QR Code - use base URL if current URL is too long */}
                            {(() => {
                                try {
                                    const currentUrl = window.location.href;
                                    // QR codes have a max capacity. If URL is too long, use base URL
                                    const qrUrl = currentUrl.length > 2000
                                        ? window.location.origin + window.location.pathname
                                        : currentUrl;
                                    return <QRCodeSVG value={qrUrl} size={48} />;
                                } catch (error) {
                                    console.error('QR code generation failed:', error);
                                    return (
                                        <div className="w-12 h-12 flex items-center justify-center text-xs text-gray-400">
                                            QR
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </div>

            </div>
        </div >
    );
}


