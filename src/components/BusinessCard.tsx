import type { CardData } from '../types';
import { SocialLinks } from './SocialLinks';
import { Download, Wallet, Loader2, Phone, MessageSquare, ExternalLink, Youtube, Music, Instagram, Video } from 'lucide-react';
import { WhatsApp } from './BrandIcons';
import { LeadForm } from './leads/LeadForm';
import { QRCodeSVG } from 'qrcode.react';
import { downloadVCard } from '../utils/vcard';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { translateText } from '../utils/translation';

interface BusinessCardProps {
    data: CardData;
    onLinkClick?: (type: string, targetInfo: string) => void;
    onTranslate?: (translatedData: Partial<CardData>) => void;
    ownerTier?: 'starter' | 'pro' | 'pro_plus' | 'business' | 'grandfathered';
}

export function BusinessCard({ data, onLinkClick, onTranslate, ownerTier }: BusinessCardProps) {
    const { t, i18n } = useTranslation();
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

    // Translation state for custom text fields
    const [displayFullName, setDisplayFullName] = useState(fullName);
    const [displayBio, setDisplayBio] = useState(bio);
    const [displayJobTitle, setDisplayJobTitle] = useState(jobTitle);
    const [displayCompany, setDisplayCompany] = useState(company);
    const [isTranslating, setIsTranslating] = useState(false);

    // Sync state with props when data changes (e.g. in editor)
    useEffect(() => {
        setDisplayFullName(fullName);
        setDisplayBio(bio);
        setDisplayJobTitle(jobTitle);
        setDisplayCompany(company);
    }, [fullName, bio, jobTitle, company]);

    // Handle dynamic translation when language changes
    useEffect(() => {
        const translateContent = async () => {
            const targetLang = i18n.language;
            
            // Skip if language is English (assuming source is usually English or user wants original)
            // or if we're already the target. 
            // In a real app, you might want to store the card's native language.
            if (targetLang === 'en') {
                setDisplayFullName(fullName);
                setDisplayBio(bio);
                setDisplayJobTitle(jobTitle);
                setDisplayCompany(company);
                return;
            }

            setIsTranslating(true);
            try {
                const [newName, newBio, newJob, newComp] = await Promise.all([
                    translateText(fullName, targetLang),
                    translateText(bio, targetLang),
                    translateText(jobTitle, targetLang),
                    translateText(company, targetLang)
                ]);
                
                setDisplayFullName(newName);
                setDisplayBio(newBio);
                setDisplayJobTitle(newJob);
                setDisplayCompany(newComp);

                // Push back translated info if callback is provided
                if (onTranslate) {
                    onTranslate({
                        fullName: newName,
                        jobTitle: newJob,
                        company: newComp,
                        bio: newBio
                    });
                }
            } catch (error) {
                console.error('Translation failed:', error);
            } finally {
                setIsTranslating(false);
            }
        };

        translateContent();
    }, [i18n.language, fullName, bio, jobTitle, company, onTranslate]);


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
            className="relative w-full max-w-md mx-auto min-h-[600px] overflow-hidden rounded-3xl shadow-2xl transition-shadow duration-300 hover:shadow-3xl"
            style={{ fontFamily: data.font || 'Inter' }}
        >
            {/* Background with dynamic gradient based on theme color */}
            <div
                className="absolute inset-0"
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
                {/* Language Selector Overlay */}
                <div className="absolute top-4 right-4 z-50">
                    <LanguageSelector variant="card" textColor={data.textColor} />
                </div>

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
                                        loading="eager"
                                        decoding="async"
                                        className="w-full h-full object-cover transition-transform will-change-transform"
                                        style={{
                                            transform: `scale(${data.avatarScale || 1}) translate(${data.avatarPosition?.x || 0}px, ${data.avatarPosition?.y || 0}px)`
                                        }}
                                    />
                            </div>
                        </div>
                    )}

                    <div className={`${data.layoutMode === 'modern-left' ? 'text-left' : 'text-center'} space-y-1 w-full`}>
                        <h1 className={`text-3xl font-bold tracking-tight ${isTranslating ? 'animate-pulse' : ''}`}>
                            {displayFullName}
                        </h1>
                        <p className={`text-lg font-medium opacity-80 ${isTranslating ? 'animate-pulse' : ''}`}>
                            {displayJobTitle}
                        </p>
                        {!logoUrl && (
                            <p className={`text-sm font-light uppercase tracking-widest opacity-60 ${isTranslating ? 'animate-pulse' : ''}`}>
                                {displayCompany}
                            </p>
                        )}
                    </div>
                </div>

                {/* Bio */}
                <div className={`${data.layoutMode === 'modern-left' ? 'text-left' : 'text-center'} max-w-xs mt-6`}>
                    <p className={`leading-relaxed font-light opacity-90 ${isTranslating ? 'animate-pulse' : ''}`}>
                        {displayBio}
                    </p>
                </div>

                {/* Social Links */}
                <div className="w-full mt-6">
                    <SocialLinks
                        links={socialLinks}
                        className="mb-8"
                        iconColor={data.textColor}
                        bgColor={data.buttonColor}
                        onLinkClick={(platform, url) => {
                            const target = platform === 'custom' ? url : platform;
                            onLinkClick?.('social', target);
                        }}
                    />
                </div>

                {/* Phone Numbers */}
                {(phoneNumbers || []).length > 0 && (
                    <div className="w-full flex flex-col gap-3 mb-8">
                        {phoneNumbers?.map((phone) => {
                            const isWhatsApp = phone.label?.toLowerCase() === 'whatsapp';
                            const cleanNumber = phone.number.replace(/[^\d+]/g, '');
                            const href = isWhatsApp ? `https://wa.me/${cleanNumber.replace('+', '')}` : `tel:${cleanNumber}`;
                            const Icon = isWhatsApp ? WhatsApp : Phone;

                            return (
                                <a
                                    key={phone.id}
                                    href={href}
                                    target={isWhatsApp ? "_blank" : undefined}
                                    rel={isWhatsApp ? "noopener noreferrer" : undefined}
                                    onClick={() => onLinkClick?.('contact', isWhatsApp ? 'whatsapp' : 'phone')}
                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02] group ${!data.buttonColor ? 'bg-white/10 border border-white/10 hover:bg-white/20 backdrop-blur-md' : 'shadow-lg border border-white/10'}`}
                                    style={{ backgroundColor: data.buttonColor || undefined }}
                                >
                                    <div className="bg-white/20 p-2.5 rounded-full group-hover:bg-white/30 transition-colors">
                                        <Icon className="w-5 h-5" style={{ color: data.textColor || '#ffffff' }} />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs font-medium uppercase tracking-wider opacity-60">{t(phone.label)}</span>
                                        <span className="font-medium text-lg text-white" style={{ color: data.textColor || '#ffffff' }}>{phone.number}</span>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}

                {/* Actions & QR Code */}
                <div className={`w-full space-y-4 mb-4 ${data.stickyActionBar ? 'pb-24' : ''}`}>
                    {/* Rich Media Embeds */}
                    {(embeds || []).map((embed, index) => {
                        const getEmbedData = () => {
                            const url = embed.url;
                            if (!url) return null;

                            try {
                                if (embed.type === 'youtube') {
                                    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
                                    if (match?.[1]) return { embedUrl: `https://www.youtube.com/embed/${match[1]}`, id: match[1] };
                                } else if (embed.type === 'spotify') {
                                    const match = url.match(/spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i);
                                    if (match?.[1] && match?.[2]) return { embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}`, id: match[2] };
                                } else if (embed.type === 'vimeo') {
                                    const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
                                    if (match?.[1]) return { embedUrl: `https://player.vimeo.com/video/${match[1]}`, id: match[1] };
                                } else if (embed.type === 'tiktok') {
                                    const match = url.match(/(?:tiktok\.com\/.*video\/)(\d+)/i);
                                    if (match?.[1]) return { embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`, id: match[1] };
                                } else if (embed.type === 'instagram') {
                                    const match = url.match(/(?:instagram\.com\/(?:p|reels|reel)\/|instagr\.am\/(?:p|reels|reel)\/)([^/?#&]+)/i);
                                    if (match?.[1]) return { embedUrl: `https://www.instagram.com/reel/${match[1]}/embed/`, id: match[1] };
                                }
                            } catch (e) {
                                console.error('Error parsing embed URL:', e);
                            }
                            return null;
                        };

                        const embedData = getEmbedData();

                        return (
                            <div
                                key={embed.id || `embed-${index}`}
                                className="media-embed-container w-full mb-6 overflow-hidden rounded-2xl shadow-lg border border-white/10 bg-black/20"
                                data-embed-type={embed.type}
                            >
                                {embed.title && (
                                    <div className="px-4 py-2 text-sm font-medium text-white/80 bg-black/40 flex justify-between items-center">
                                        <span>{embed.title}</span>
                                        {!embedData && <span className="text-xs text-orange-400 font-normal">{t('Direct Link Only')}</span>}
                                    </div>
                                )}

                                {embedData ? (
                                    <>
                                        {embed.type === 'youtube' ? (
                                            <iframe
                                                src={embedData.embedUrl}
                                                className="w-full aspect-video border-0"
                                                title={embed.title || "YouTube video player"}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                                loading="lazy"
                                            ></iframe>
                                        ) : embed.type === 'vimeo' ? (
                                            <iframe
                                                src={embedData.embedUrl}
                                                className="w-full aspect-video border-0"
                                                title={embed.title || "Vimeo video player"}
                                                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                                                allowFullScreen
                                                loading="lazy"
                                            ></iframe>
                                        ) : embed.type === 'tiktok' ? (
                                            <div className="w-full flex justify-center bg-black">
                                                <iframe
                                                    src={embedData.embedUrl}
                                                    className="w-full aspect-[9/16] h-[580px] border-0"
                                                    allow="encrypted-media; picture-in-picture"
                                                    title={embed.title || "TikTok embed"}
                                                    loading="lazy"
                                                ></iframe>
                                            </div>
                                        ) : embed.type === 'instagram' ? (
                                            <div className="w-full flex justify-center bg-black overflow-hidden">
                                                <iframe
                                                    src={embedData.embedUrl}
                                                    className="w-full aspect-[4/5] min-h-[450px] border-0"
                                                    allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
                                                    allowFullScreen
                                                    title={embed.title || "Instagram Reels embed"}
                                                    loading="lazy"
                                                ></iframe>
                                            </div>
                                        ) : (
                                            <iframe
                                                src={embedData.embedUrl}
                                                className="w-full h-[152px] border-0"
                                                title={embed.title || "Spotify player"}
                                                allow="encrypted-media; picture-in-picture; clipboard-write"
                                                loading="lazy"
                                            ></iframe>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-8 flex flex-col items-center justify-center gap-4 bg-white/5">
                                        <div className="p-4 bg-white/10 rounded-full">
                                            {embed.type === 'youtube' ? <Youtube className="w-8 h-8 text-red-500" /> :
                                                embed.type === 'spotify' ? <Music className="w-8 h-8 text-green-500" /> :
                                                    embed.type === 'instagram' ? <Instagram className="w-8 h-8 text-pink-500" /> :
                                                        <Video className="w-8 h-8 text-blue-400" />}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-white/70 mb-4 px-4">
                                                {t('This link cannot be embedded directly. Tap below to view on ')} {embed.type.charAt(0).toUpperCase() + embed.type.slice(1)}
                                            </p>
                                            <a
                                                href={embed.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-white font-medium transition-all active:scale-95 shadow-lg ${!data.buttonColor ? 'bg-white/10 hover:bg-white/20' : ''}`}
                                                style={{ backgroundColor: data.buttonColor || undefined }}
                                            >
                                                <span>{t('View Content')}</span>
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {/* Action Bar (Only for non-starter tiers) */}
                    {ownerTier !== 'starter' && (data.stickyActionBar ? (
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-50 backdrop-blur-sm">
                            <div className="flex gap-3 max-w-md mx-auto">
                                <button
                                    onClick={handleConnect}
                                    style={{ backgroundColor: data.buttonColor || '#2563eb' }}
                                    className="flex-1 flex items-center justify-center gap-2 text-white py-3.5 rounded-xl transition-all active:scale-95 font-bold shadow-lg cursor-pointer"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{t('Connect')}</span>
                                </button>
                                <button
                                    onClick={handleDownloadVCard}
                                    style={{ backgroundColor: data.buttonColor || undefined }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all active:scale-95 font-bold shadow-lg cursor-pointer ${!data.buttonColor ? 'bg-white text-black hover:bg-gray-100' : 'text-white'}`}
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('Save')}</span>
                                </button>
                                <button
                                    onClick={handleAddToWallet}
                                    disabled={loading}
                                    style={{ backgroundColor: data.buttonColor || undefined }}
                                    className={`flex-1 flex items-center justify-center gap-2 border border-white/10 py-3.5 rounded-xl transition-all active:scale-95 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md ${!data.buttonColor ? 'bg-black/80 hover:bg-black text-white' : 'text-white'}`}
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
                                style={{ backgroundColor: data.buttonColor || '#2563eb' }}
                                className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl transition-all active:scale-95 font-bold shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span>{t('Connect with {{name}}', { name: fullName.split(' ')[0] })}</span>
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDownloadVCard}
                                    style={{ backgroundColor: data.buttonColor || undefined }}
                                    className={`flex-1 flex items-center justify-center gap-2 border border-white/20 py-3 rounded-xl transition-all active:scale-95 font-medium cursor-pointer ${!data.buttonColor ? 'bg-white/10 hover:bg-white/20 backdrop-blur-md' : 'text-white'}`}
                                >
                                    <Download className="w-4 h-4" />
                                    <span>{t('Save Contact')}</span>
                                </button>
                                <button
                                    onClick={handleAddToWallet}
                                    disabled={loading}
                                    style={{ backgroundColor: data.buttonColor || undefined }}
                                    className={`flex-1 flex items-center justify-center gap-2 backdrop-blur-md border border-white/10 py-3 rounded-xl transition-all active:scale-95 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${!data.buttonColor ? 'bg-black/40 hover:bg-black/60 text-white/90' : 'text-white'}`}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                                    <span>{loading ? t('Creating...') : t('Wallet Pass')}</span>
                                </button>
                            </div>
                        </div>
                    ))}

                </div>
            </div>

            {/* Lead Form Modal */}
            <LeadForm
                cardId={data.slug || 'unknown'}
                isOpen={isLeadFormOpen}
                onClose={() => setIsLeadFormOpen(false)}
                ownerName={fullName.split(' ')[0]}
                buttonColor={data.buttonColor}
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
    );
}


