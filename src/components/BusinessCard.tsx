import type { CardData } from '../types';
import { SocialLinks } from './SocialLinks';
import { Download, Wallet, Loader2, Phone, MessageSquare } from 'lucide-react';
import { LeadForm } from './leads/LeadForm';
import { QRCodeSVG } from 'qrcode.react';
import { downloadVCard } from '../utils/vcard';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface BusinessCardProps {
    data: CardData;
    onLinkClick?: (type: string, targetInfo: string) => void;
    ownerTier?: 'starter' | 'pro' | 'pro_plus' | 'business' | 'grandfathered';
}

export function BusinessCard({ data, onLinkClick }: BusinessCardProps) {
    const { t } = useTranslation();
    const {
        fullName,
        jobTitle,
        company,
        bio,
        avatarUrl,
        logoUrl,
        themeColor,
        gradientColor,
        backgroundType,
        showPhoto,
        phoneNumbers,
        socialLinks,
        embeds
    } = data;
    const [loading, setLoading] = useState(false);
    const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const trackedEmbedsRef = useRef<Set<string>>(new Set());

    // Initialize IntersectionObserver for media tracking
    useEffect(() => {
        if (!onLinkClick || (data.embeds || []).length === 0) return;

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const type = entry.target.getAttribute('data-embed-type');
                    const id = entry.target.getAttribute('data-embed-id');

                    if (type && id && !trackedEmbedsRef.current.has(id)) {
                        // Track media view
                        onLinkClick('media', type);
                        trackedEmbedsRef.current.add(id);

                        // Stop observing this element once tracked
                        observerRef.current?.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.5, // 50% of the item must be visible
            rootMargin: '0px'
        });

        // Observe all embed containers
        const embedElements = document.querySelectorAll('.media-embed-container');
        embedElements.forEach(el => observerRef.current?.observe(el));

        return () => {
            observerRef.current?.disconnect();
        };
    }, [data.embeds, onLinkClick]);

    const handleConnect = () => {
        if (onLinkClick) onLinkClick('contact', 'lead_form');
        setIsLeadFormOpen(true);
    };

    const handleDownloadVCard = () => {
        if (onLinkClick) onLinkClick('contact', 'vcard');
        downloadVCard(data);
    };

    const handleAddToWallet = async () => {
        if (onLinkClick) onLinkClick('contact', 'wallet');

        if (!data.slug) {
            alert(t('Please save your card first to generate a wallet pass.'));
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/passes?type=apple&slug=${data.slug}`);

            if (!response.ok) {
                let errorMessage = `Server returned ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                        if (errorData.details) errorMessage += `: ${errorData.details}`;
                    }
                } catch (e) {
                    // unexpected content type, use status text
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${data.slug}.pkpass`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error generating pass:', error);
            alert(`Failed to generate Apple Wallet pass: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div
            className="relative w-full max-w-md mx-auto min-h-[600px] overflow-hidden rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-3xl"
            style={{ fontFamily: data.font || 'Inter' }}
        >
            {/* Background with dynamic gradient based on theme color */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black animate-gradient-slow"
                style={{
                    background: backgroundType === 'solid'
                        ? themeColor
                        : `linear-gradient(135deg, ${themeColor}, ${gradientColor || '#000000'})`
                }}
            />

            {/* Texture overlay (noise) for premium feel - Commented out as user perceived it as a watermark */}
            {/* <div className="absolute inset-0 opacity-20 contrast-125 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div> */}

            {/* Glassmorphism Container */}
            <div
                className={`relative z-10 h-full flex flex-col ${data.layoutMode === 'modern-left' ? 'items-start text-left' : 'items-center text-center'} justify-between p-8`}
                style={{ color: data.textColor || '#ffffff' }}
            >

                {/* Header / Avatar */}
                <div className={`flex flex-col ${data.layoutMode === 'modern-left' ? 'items-start' : 'items-center'} space-y-4 mt-8 w-full`}>
                    {logoUrl && (
                        <div className="mb-2">
                            <img
                                src={logoUrl}
                                alt="Company Logo"
                                className="h-16 w-auto object-contain drop-shadow-lg"
                            />
                        </div>
                    )}

                    {showPhoto && (
                        <div className={`relative group ${data.photoStyle === 'full' || data.layoutMode === 'hero' ? 'w-full mb-6 mx-0' : 'mx-auto'}`}>
                            {data.photoStyle !== 'full' && data.layoutMode !== 'hero' && (
                                <div className={`absolute -inset-1 bg-gradient-to-r from-pink-500 to-violet-500 blur opacity-25 group-hover:opacity-75 transition duration-500 ${data.photoStyle === 'rounded' ? 'rounded-[2rem]' : 'rounded-full'}`}></div>
                            )}
                            <div className={`relative overflow-hidden bg-white/5 ${data.layoutMode === 'hero'
                                ? 'w-full aspect-video rounded-2xl shadow-lg mx-auto'
                                : data.photoStyle === 'full'
                                    ? 'w-full aspect-[4/3] rounded-none shadow-none'
                                    : data.photoStyle === 'rounded'
                                        ? 'w-32 h-32 rounded-3xl border-4 border-white/10 shadow-xl mx-auto'
                                        : 'w-32 h-32 rounded-full border-4 border-white/10 shadow-xl mx-auto'
                                }`}>
                                <img
                                    src={avatarUrl}
                                    alt={fullName}
                                    className="w-full h-full object-cover transition-transform will-change-transform"
                                    style={{
                                        transform: `scale(${data.avatarScale || 1}) translate(${data.avatarPosition?.x || 0}px, ${data.avatarPosition?.y || 0}px)`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className={`${data.layoutMode === 'modern-left' ? 'text-left' : 'text-center'} space-y-1 w-full`}>
                        <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
                        <p className="text-lg font-medium opacity-80">{jobTitle}</p>
                        {!logoUrl && (
                            <p className="text-sm font-light uppercase tracking-widest opacity-60">{company}</p>
                        )}
                    </div>
                </div>

                {/* Bio */}
                <div className={`${data.layoutMode === 'modern-left' ? 'text-left' : 'text-center'} max-w-xs`}>
                    <p className="leading-relaxed font-light opacity-90">{bio}</p>
                </div>

                {/* Social Links */}
                <div className="w-full">
                    <SocialLinks
                        links={socialLinks}
                        className="mb-8"
                        iconColor={data.textColor}
                        onLinkClick={(platform, url) => {
                            const target = platform === 'custom' ? url : platform;
                            onLinkClick?.('social', target);
                        }}
                    />
                </div>

                {/* Phone Numbers */}
                {(phoneNumbers || []).length > 0 && (
                    <div className="w-full flex flex-col gap-3 mb-8">
                        {phoneNumbers?.map((phone) => (
                            <a
                                key={phone.id}
                                href={`tel:${phone.number}`}
                                onClick={() => onLinkClick?.('contact', 'phone')}
                                className="flex items-center gap-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-4 rounded-2xl transition-all hover:scale-[1.02] group"
                            >
                                <div className="bg-white/20 p-2.5 rounded-full group-hover:bg-white/30 transition-colors">
                                    <Phone className="w-5 h-5" style={{ color: data.textColor || '#ffffff' }} />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-xs font-medium uppercase tracking-wider opacity-60">{t(phone.label)}</span>
                                    <span className="font-medium text-lg">{phone.number}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}

                {/* Actions & QR Code */}
                <div className={`w-full space-y-4 mb-4 ${data.stickyActionBar ? 'pb-24' : ''}`}>
                    {/* Rich Media Embeds */}
                    {(embeds || []).map((embed, index) => {
                        let embedUrl = embed.url;
                        if (!embedUrl) return null;

                        // Improved extraction logic for various platforms
                        if (embed.type === 'youtube') {
                            if (embedUrl.includes('youtu.be/')) {
                                embedUrl = `https://www.youtube.com/embed/${embedUrl.split('youtu.be/')[1]?.split('?')[0]}`;
                            } else if (embedUrl.includes('youtube.com/watch')) {
                                const v = new URLSearchParams(embedUrl.split('?')[1]).get('v');
                                if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
                            }
                        } else if (embed.type === 'spotify') {
                            if (embedUrl.includes('open.spotify.com') && !embedUrl.includes('/embed')) {
                                embedUrl = embedUrl.replace('open.spotify.com', 'open.spotify.com/embed');
                            }
                        } else if (embed.type === 'vimeo') {
                            const vimeoId = embedUrl.split('vimeo.com/')[1]?.split('/')[0];
                            if (vimeoId) embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
                        } else if (embed.type === 'tiktok') {
                            // Extract video ID from TikTok URL
                            const tiktokId = embedUrl.split('/video/')[1]?.split('?')[0];
                            if (tiktokId) embedUrl = `https://www.tiktok.com/embed/v2/${tiktokId}`;
                        } else if (embed.type === 'instagram') {
                            // Convert standard Reels URL to embed URL
                            if (embedUrl.includes('instagram.com/reel/') || embedUrl.includes('instagram.com/reels/')) {
                                const reelId = embedUrl.split('/reel/')[1]?.split('/')[0] || embedUrl.split('/reels/')[1]?.split('/')[0];
                                if (reelId) embedUrl = `https://www.instagram.com/reel/${reelId}/embed/`;
                            }
                        }

                        if (!embedUrl) return null;

                        return (
                            <div
                                key={embed.id || `embed-${index}`}
                                className="media-embed-container w-full mb-6 overflow-hidden rounded-2xl shadow-lg border border-white/10 bg-black/20"
                                data-embed-type={embed.type}
                                data-embed-id={embed.id || `embed-${index}`}
                            >
                                {embed.title && <div className="px-4 py-2 text-sm font-medium text-white/80 bg-black/40">{embed.title}</div>}
                                {embed.type === 'youtube' ? (
                                    <iframe
                                        src={embedUrl}
                                        className="w-full aspect-video"
                                        title={embed.title || "YouTube video player"}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : embed.type === 'vimeo' ? (
                                    <iframe
                                        src={embedUrl}
                                        className="w-full aspect-video"
                                        title={embed.title || "Vimeo video player"}
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : embed.type === 'tiktok' ? (
                                    <div className="w-full flex justify-center bg-black">
                                        <iframe
                                            src={embedUrl}
                                            className="w-full aspect-[9/16] h-[580px] border-0"
                                            allow="encrypted-media;"
                                            title={embed.title || "TikTok embed"}
                                        ></iframe>
                                    </div>
                                ) : embed.type === 'instagram' ? (
                                    <div className="w-full flex justify-center bg-black overflow-hidden">
                                        <iframe
                                            src={embedUrl}
                                            className="w-full aspect-[4/5] min-h-[450px] border-0"
                                            allow="autoplay; encrypted-media"
                                            allowFullScreen
                                            title={embed.title || "Instagram Reels embed"}
                                        ></iframe>
                                    </div>
                                ) : (
                                    <iframe
                                        src={embedUrl}
                                        className="w-full h-[152px]"
                                        title={embed.title || "Spotify player"}
                                        allow="encrypted-media"
                                        loading="lazy"
                                    ></iframe>
                                )}
                            </div>
                        );
                    })}

                    {data.stickyActionBar ? (
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-50 backdrop-blur-sm">
                            <div className="flex gap-3 max-w-md mx-auto">
                                <button
                                    onClick={handleConnect}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 py-3.5 rounded-xl transition-all active:scale-95 font-bold shadow-lg cursor-pointer"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{t('Connect')}</span>
                                </button>
                                <button
                                    onClick={handleDownloadVCard}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-100 py-3.5 rounded-xl transition-all active:scale-95 font-bold shadow-lg cursor-pointer"
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
                                <span>{t('Connect with {{name}}', { name: fullName.split(' ')[0] })}</span>
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
                        ownerName={fullName.split(' ')[0]}
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
        </div>
    );
}


