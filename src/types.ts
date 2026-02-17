export type SocialPlatform = 'linkedin' | 'twitter' | 'github' | 'website' | 'email' | 'phone' | 'instagram' | 'youtube' | 'tiktok' | 'pinterest' | 'spotify' | 'soundcloud' | 'bandcamp' | 'bandlab' | 'tidal' | 'deezer' | 'pandora' | 'iheartradio' | 'amazonmusic' | 'custom';

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
    embeds: { type: 'youtube' | 'spotify' | 'vimeo' | 'tiktok' | 'instagram'; url: string; title?: string }[];
    sections?: Section[];
    wallet?: WalletData;
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
}

export interface Section {
    id: string;
    title: string;
    links: SocialLink[];
    isOpen?: boolean;
}

export const initialCardData: CardData = {
    fullName: 'David Young',
    jobTitle: 'Software Engineer',
    company: 'REALLY SIMPLE APPS',
    bio: 'Building digital experiences that matter.',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    themeColor: 'blue',
    textColor: '#ffffff',
    gradientColor: '#000000',
    backgroundType: 'gradient',
    showPhoto: true,
    photoStyle: 'circle',
    avatarScale: 1,
    avatarPosition: { x: 0, y: 0 },
    font: 'Inter',
    phoneNumbers: [
        { id: '1', label: 'Office', number: '+1 (555) 123-4567' },
        { id: '2', label: 'Mobile', number: '+1 (555) 987-6543' }
    ],
    socialLinks: [
        { id: '1', platform: 'email', url: 'mailto:david@example.com', label: 'Email' },
        { id: '2', platform: 'website', url: 'https://reallysimpleapps.com', label: 'Website' },
        { id: '3', platform: 'linkedin', url: 'https://linkedin.com/in/davidyoung', label: 'LinkedIn' },
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
