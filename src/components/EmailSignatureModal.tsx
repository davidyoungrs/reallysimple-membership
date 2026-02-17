import { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CardData } from '../types';
import { generateSignatureHTML } from '../utils/signatureGenerator';

interface EmailSignatureModalProps {
    data: CardData;
    cardUrl: string;
    isOpen: boolean;
    onClose: () => void;
}

export function EmailSignatureModal({ data, cardUrl, isOpen, onClose }: EmailSignatureModalProps) {
    const { t } = useTranslation();
    const [points, setPoints] = useState<string>('');
    const [copiedVisual, setCopiedVisual] = useState(false);
    const [copiedHTML, setCopiedHTML] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && data) {
            setPoints(generateSignatureHTML(data, cardUrl));
        }
    }, [isOpen, data, cardUrl]);

    if (!isOpen) return null;

    const handleCopyVisual = async () => {
        if (!previewRef.current) return;
        try {
            // We need to copy both text/html and text/plain for maximum compatibility
            const html = points; // Use the generated HTML directly to ensure clean code
            // Or better, use the ref's innerHTML which might have browser sanitization, 
            // but for email signatures, raw generated HTML is safer to control style tags.
            // Actually, copying the *rendered* selection is often safer for "visual" copy.

            // Let's rely on the Clipboard API with the generated HTML string.
            // However, some clients prefer the computed styles. 
            // The most robust way for "Copy for Gmail" is often `document.execCommand('copy')` on a selection,
            // but `navigator.clipboard.write` is the modern standard.

            const blobHtml = new Blob([html], { type: 'text/html' });
            const blobText = new Blob([previewRef.current.innerText], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText,
                }),
            ]);

            setCopiedVisual(true);
            setTimeout(() => setCopiedVisual(false), 2000);
        } catch (err) {
            console.error('Failed to copy visual signature:', err);
            // Fallback for older browsers or if permission denied
            try {
                const range = document.createRange();
                range.selectNode(previewRef.current);
                window.getSelection()?.removeAllRanges();
                window.getSelection()?.addRange(range);
                document.execCommand('copy');
                window.getSelection()?.removeAllRanges();
                setCopiedVisual(true);
                setTimeout(() => setCopiedVisual(false), 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }
        }
    };

    const handleCopyHTML = async () => {
        try {
            await navigator.clipboard.writeText(points);
            setCopiedHTML(true);
            setTimeout(() => setCopiedHTML(false), 2000);
        } catch (err) {
            console.error('Failed to copy HTML:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">{t('Email Signature')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-gray-600 mb-6 font-medium">
                        {t('Preview your signature below. Click "Copy Signature" to paste it directly into Gmail, Outlook, or Apple Mail.')}
                    </p>

                    {/* Preview Area */}
                    <div className="border border-gray-200 rounded-xl p-8 bg-gray-50 mb-8 overflow-x-auto">
                        <div
                            ref={previewRef}
                            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 block min-w-full"
                            dangerouslySetInnerHTML={{ __html: points }}
                        />
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={handleCopyVisual}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all transform active:scale-95 ${copiedVisual
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {copiedVisual ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            <span>{copiedVisual ? t('Copied!') : t('Copy Signature')}</span>
                        </button>

                        <button
                            onClick={handleCopyHTML}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all border ${copiedHTML
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            {copiedHTML ? <Check className="w-5 h-5" /> : <Code className="w-5 h-5" />}
                            <span>{copiedHTML ? t('Copied HTML!') : t('Copy HTML Code')}</span>
                        </button>
                    </div>

                    <p className="text-xs text-center text-gray-400 mt-6">
                        {t('Tip: If visual copy doesn\'t work, try copying the HTML code and inserting it via your email client\'s source editor.')}
                    </p>
                </div>
            </div>
        </div>
    );
}
