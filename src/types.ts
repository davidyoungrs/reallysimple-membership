export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook' | 'github' | 'website' | 'email' | 'phone' | 'instagram' | 'youtube' | 'tiktok' | 'pinterest' | 'spotify' | 'soundcloud' | 'bandcamp' | 'bandlab' | 'tidal' | 'deezer' | 'pandora' | 'iheartradio' | 'amazonmusic' | 'custom';

export interface PhoneNumber {
    id: string;
    label: string;
    number: string;
}

export interface SocialLink {
    id: string;
    platform: SocialPlatform;
    url: string;
    label?: string;
    customIconUrl?: string; // Base64 or URL for custom icon
}

export interface CardData {
    fullName: string;
    jobTitle: string;
    company: string;
    bio: string;
    avatarUrl: string;
    logoUrl?: string;
    themeColor: string;
    textColor: string;
    gradientColor?: string;
    buttonColor?: string;
    backgroundType: 'solid' | 'gradient';
    showPhoto: boolean;
    photoStyle?: 'circle' | 'rounded' | 'full';
    avatarScale?: number;
    avatarPosition?: { x: number; y: number };
    font: string;
    phoneNumbers: PhoneNumber[];
    socialLinks: SocialLink[];
    slug?: string; // Custom URL slug
    layoutMode: 'classic' | 'modern-left' | 'hero';
    stickyActionBar: boolean;
    embeds: { id: string; type: 'youtube' | 'spotify' | 'vimeo' | 'tiktok' | 'instagram'; url: string; title?: string }[];
    sections?: Section[];
    wallet?: WalletData;
    removeBranding?: boolean; // Tiers above starter can remove "Powered by"
}

export interface WalletData {
    backgroundColor?: string;
    foregroundColor?: string;
    labelColor?: string;
    logoText?: string;
    showLogoText?: boolean;
    logoUrl?: string;
    stripImageUrl?: string;
    showRole?: boolean;
    showCompany?: boolean;
    showNameFields?: boolean;
    stripConfig?: StripConfig;
    enabled?: boolean;
    hideStripText?: boolean;
    showStripImage?: boolean;
}

export interface StripConfig {
    bgType: 'match' | 'color' | 'gradient' | 'image';
    bgColor: string;
    bgGradient: string[];
    bgFilters: { grayscale: number; sepia: number; opacity: number };
    bgImageUrl?: string;
    textConfig: {
        showName: boolean;
        nameColor: string;
        nameX: number;
        nameY: number;
        showTitle: boolean;
        titleColor: string;
        titleX: number;
        titleY: number;
        showTagline: boolean;
        tagline: string;
        taglineColor: string;
        taglineX: number;
        taglineY: number;
        align: 'left' | 'center' | 'right';
    };
    photoConfig: {
        show: boolean;
        position: 'left' | 'right';
        x: number;
        y: number;
        scale: number;
        border: 'none' | 'thin' | 'thick';
    };
}

export interface Section {
    id: string;
    title: string;
    links: SocialLink[];
    isOpen?: boolean;
}

export const initialCardData: CardData = {
    fullName: 'Sarah Jenkins',
    jobTitle: 'Chief Strategy Officer',
    company: 'Really Simple Apps',
    bio: 'Pioneering the future of digital connectivity.',
    avatarUrl: '/hero-home.png',
    themeColor: 'blue',
    textColor: '#ffffff',
    gradientColor: '#000000',
    buttonColor: '#2563eb',
    backgroundType: 'gradient',
    showPhoto: true,
    photoStyle: 'circle',
    avatarScale: 1,
    avatarPosition: { x: 0, y: 0 },
    font: 'Inter',
    phoneNumbers: [
        { id: '1', label: 'Office', number: '(555) 123-4567' },
        { id: '2', label: 'Mobile', number: '(123) 456-7890' }
    ],
    socialLinks: [
        { id: '1', platform: 'email', url: 'mailto:hello@reallysimpleapps.com', label: 'Email' },
        { id: '2', platform: 'website', url: 'https://reallysimpleapps.com', label: 'Website' },
    ],
    layoutMode: 'classic',
    stickyActionBar: true,
    embeds: [],
    sections: [],
    wallet: {
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        labelColor: '#000000',
        logoText: '',
        stripImageUrl: ''
    }
};
