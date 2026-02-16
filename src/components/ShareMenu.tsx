import { useState, useRef, useEffect } from 'react';
import { Share2, Download, Mail, Copy, Check, Wallet, Loader2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CardData } from '../types';
import { downloadQRCodeAsSVG, downloadQRCodeAsPNG } from '../utils/qrDownload';
import { EmailSignatureModal } from './EmailSignatureModal';
import { downloadVCard } from '../utils/vcard';

interface ShareMenuProps {
    cardSlug: string;
    data: CardData;
}

export function ShareMenu({ cardSlug, data }: ShareMenuProps) {
    const { t } = useTranslation();
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const publicUrl = `${window.location.origin}/card/${cardSlug}`;
    const qrUrl = `${publicUrl}?src=qr`;
    const filename = cardSlug || 'business-card';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleAddToGoogleWallet = async () => {
        setLoadingGoogle(true);
        // Open window immediately to avoid popup blockers
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write('<html><body style="font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;"><div>Generating your Google Wallet pass...</div></body></html>');
        }

        try {
            const response = await fetch('/api/generate-google-pass', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ slug: data.slug }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate pass');
            }

            const { saveUrl } = await response.json();

            if (saveUrl && newWindow) {
                newWindow.location.href = saveUrl;
            } else {
                if (newWindow) newWindow.close();
                throw new Error('No save URL returned');
            }
        } catch (error) {
            console.error('Error generating Google Wallet pass:', error);
            if (newWindow) newWindow.close();
            alert('Failed to generate Google Wallet pass. Please try again.');
        } finally {
            setLoadingGoogle(false);
        }
    };

    const handleDownloadSVG = async () => {
        try {
            await downloadQRCodeAsSVG(qrUrl, `qr-${filename}`);
            setShowMenu(false);
        } catch (error) {
            console.error('Failed to download SVG:', error);
        }
    };

    const handleDownloadPNG = async () => {
        try {
            await downloadQRCodeAsPNG(qrUrl, `qr-${filename}`);
            setShowMenu(false);
        } catch (error) {
            console.error('Failed to download PNG:', error);
        }
    };

    const handleViewPublic = () => {
        window.open(publicUrl, '_blank');
        setShowMenu(false);
    };

    const handleEmailSignature = () => {
        setShowSignatureModal(true);
        setShowMenu(false);
    };

    const handleEmailShare = () => {
        const subject = encodeURIComponent(`${data.fullName || 'Digital Business Card'}`);
        const body = encodeURIComponent(`Here is my digital business card:\n\n${publicUrl}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
        setShowMenu(false);
    };

    const handleWhatsAppShare = () => {
        const text = encodeURIComponent(`Here is my digital business card: ${publicUrl}`);
        window.open(`https://wa.me/?text=${text}`);
        setShowMenu(false);
    };

    const handleDownloadVCard = () => {
        downloadVCard(data);
        setShowMenu(false);
    };

    const handleAddToWallet = async () => {
        setLoadingWallet(true);
        try {
            const response = await fetch(`/api/generate-pass?slug=${cardSlug}`);

            if (!response.ok) {
                let errorMessage = `Server returned ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                        if (errorData.details) errorMessage += `: ${errorData.details}`;
                    }
                } catch (e) {
                    // If response is not JSON, use default error message
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${cardSlug}.pkpass`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setShowMenu(false);
        } catch (error: any) {
            console.error('Error generating pass:', error);
            alert(`Failed to generate Apple Wallet pass: ${error.message}`);
        } finally {
            setLoadingWallet(false);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
                <Share2 className="w-4 h-4" />
                {t('Share')}
            </button>

            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                            onClick={handleCopyLink}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600">{t('Link copied!')}</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 text-gray-600" />
                                    <span>{t('Copy public link')}</span>
                                </>
                            )}
                        </button>

                        <div className="border-t border-gray-200 my-1" />

                        <button
                            onClick={handleEmailShare}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            <Mail className="w-4 h-4 text-gray-600" />
                            <span>{t('Share via Email')}</span>
                        </button>

                        <button
                            onClick={handleWhatsAppShare}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            <svg className="w-4 h-4 text-gray-600 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span>{t('Share via WhatsApp')}</span>
                        </button>

                        <button
                            onClick={handleEmailSignature}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            <Mail className="w-4 h-4 text-gray-600" />
                            <span>{t('Email Signature')}</span>
                        </button>

                        <div className="border-t border-gray-200 my-1" />

                        <button
                            onClick={handleAddToWallet}
                            disabled={loadingWallet}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
                        >
                            <div className="bg-black text-white p-1.5 rounded-md">
                                {loadingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                            </div>
                            <span className="font-medium">{loadingWallet ? t('Creating...') : t('Add to Apple Wallet')}</span>
                        </button>

                        <button
                            onClick={handleAddToGoogleWallet}
                            disabled={loadingGoogle}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
                        >
                            <div className="bg-white border border-gray-300 text-black p-1.5 rounded-md">
                                {loadingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                            </div>
                            <span className="font-medium">{loadingGoogle ? t('Opening...') : t('Save to Google Pay')}</span>
                        </button>

                        <button
                            onClick={handleDownloadVCard}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            <Download className="w-4 h-4 text-gray-600" />
                            <span>{t('Download vCard')}</span>
                        </button>

                        <div className="border-t border-gray-200 my-1" />

                        <button
                            onClick={handleDownloadSVG}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            <Download className="w-4 h-4 text-gray-600" />
                            <span>{t('Download QR (SVG)')}</span>
                        </button>

                        <button
                            onClick={handleDownloadPNG}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            <Download className="w-4 h-4 text-gray-600" />
                            <span>{t('Download QR (PNG)')}</span>
                        </button>

                        <div className="border-t border-gray-200 my-1" />

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleViewPublic();
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                        >
                            <ExternalLink className="w-4 h-4 text-gray-600" />
                            <span>{t('View public card')}</span>
                        </button>
                    </div>
                </>
            )}

            {showSignatureModal && (
                <EmailSignatureModal
                    data={data}
                    cardUrl={publicUrl}
                    isOpen={showSignatureModal}
                    onClose={() => setShowSignatureModal(false)}
                />
            )}
        </div>
    );
}
