import { type SocialLink } from '../types';
import {
    Linkedin,
    Twitter,
    Github,
    Globe,
    Mail,
    Phone,
    Instagram,
    Youtube,
    Facebook,
    ExternalLink,
    Link as LinkIcon
} from 'lucide-react';
import {
    TikTok,
    Pinterest,
    Spotify,
    SoundCloud,
    Bandcamp,
    BandLab,
    Tidal,
    Deezer,
    Pandora,
    IHeartRadio,
    AmazonMusic
} from './BrandIcons';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = {
    linkedin: Linkedin,
    twitter: Twitter,
    github: Github,
    website: Globe,
    email: Mail,
    phone: Phone,
    instagram: Instagram,
    youtube: Youtube,
    facebook: Facebook,
    tiktok: TikTok,
    pinterest: Pinterest,
    spotify: Spotify,
    soundcloud: SoundCloud,
    bandcamp: Bandcamp,
    bandlab: BandLab,
    tidal: Tidal,
    deezer: Deezer,
    pandora: Pandora,
    iheartradio: IHeartRadio,
    amazonmusic: AmazonMusic
};

interface SocialLinksProps {
    links: SocialLink[];
    className?: string;
    iconColor?: string;
    bgColor?: string;
    onLinkClick?: (platform: string, url: string) => void;
}

// Base URLs for platforms that support username-only input
const platformBaseUrls: Record<string, string> = {
    instagram: 'https://instagram.com/',
    tiktok: 'https://www.tiktok.com/@',
    twitter: 'https://twitter.com/',
    github: 'https://github.com/',
    linkedin: 'https://www.linkedin.com/in/',
    youtube: 'https://www.youtube.com/@', // Modern handle format
    facebook: 'https://facebook.com/',
    soundcloud: 'https://soundcloud.com/',
    pinterest: 'https://www.pinterest.com/',
    spotify: 'https://open.spotify.com/user/', // Assuming user profile for "username"
};

export function SocialLinks({ links, className = '', iconColor, bgColor, onLinkClick }: SocialLinksProps) {
    if (!links || !links.length) return null;

    return (
        <div className={`flex flex-wrap gap-3 justify-center ${className}`}>
            {links.map((link) => {
                const isCustom = link.platform === 'custom';
                const Icon = isCustom ? LinkIcon : (iconMap[link.platform] || ExternalLink);

                let formattedUrl = link.url;

                // 1. Email handling
                if (link.platform === 'email') {
                    if (!formattedUrl.startsWith('mailto:')) {
                        formattedUrl = `mailto:${formattedUrl}`;
                    }
                }
                // 2. Phone handling
                else if (link.platform === 'phone') {
                    if (!formattedUrl.startsWith('tel:')) {
                        formattedUrl = `tel:${formattedUrl}`;
                    }
                }
                // 3. Platform username handling (if not a full URL)
                else if (!formattedUrl.startsWith('http') && !formattedUrl.startsWith('mailto:') && !formattedUrl.startsWith('tel:')) {
                    const baseUrl = platformBaseUrls[link.platform];

                    if (baseUrl) {
                        // Strip leading '@' if the user added it, to avoid double @@ (except for custom logic if needed)
                        // But mostly we just want to cleaner username.
                        const cleanUsername = formattedUrl.startsWith('@') ? formattedUrl.slice(1) : formattedUrl;
                        formattedUrl = `${baseUrl}${cleanUsername}`;
                    } else {
                        // generic fallback for custom links or unknown platforms
                        // Check if it looks like an email
                        if (formattedUrl.includes('@') && !formattedUrl.includes('/')) {
                            formattedUrl = `mailto:${formattedUrl}`;
                        } else {
                            formattedUrl = `https://${formattedUrl}`;
                        }
                    }
                }

                return (
                    <a
                        key={link.id}
                        href={formattedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onLinkClick?.(link.platform, link.url)}
                        className={`p-3 backdrop-blur-sm rounded-full transition-all duration-300 group shadow-lg hover:shadow-xl hover:-translate-y-1 relative flex items-center justify-center w-12 h-12 box-border ${!bgColor ? 'bg-white/10 border border-white/10' : ''}`}
                        style={{ backgroundColor: bgColor || undefined }}
                        aria-label={link.label || link.platform}
                        title={link.label || link.platform}
                    >
                        {isCustom && link.customIconUrl ? (
                            <img
                                src={link.customIconUrl}
                                alt={link.label || "Custom Link"}
                                className="w-5 h-5 object-contain"
                            />
                        ) : (
                            <Icon
                                className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity"
                                style={{ color: iconColor || '#ffffff' }}
                            />
                        )}
                    </a>
                );
            })}
        </div>
    );
}
