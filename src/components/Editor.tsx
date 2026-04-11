import { type CardData, type SocialLink, type SocialPlatform, type PhoneNumber } from '../types';
import { Plus, Trash2, GripVertical, Upload, X, Music, Youtube, Instagram, Video, Lock, Languages, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../utils/translation';
import { SlugCustomizer } from './SlugCustomizer';
import { ImageCropper } from './ImageCropper';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTier } from '../contexts/TierContext';
import { Link } from 'react-router-dom';
import { ProBadge } from './ui/pro-badge';
import { UpgradeModal } from './UpgradeModal';
import { PhoneInput } from './ui/phone-input';

interface SortableSocialLinkProps {
    link: SocialLink;
    handleSocialChange: (id: string, field: keyof SocialLink, value: string) => void;
    removeSocialLink: (id: string) => void;
    t: (key: string) => string;
}

function SortableSocialLink({ link, handleSocialChange, removeSocialLink, t }: SortableSocialLinkProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: link.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="group flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
            <div className="flex items-center gap-2">
                <div {...attributes} {...listeners} className="touch-none">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move hidden sm:block" />
                </div>
                <span className="sm:hidden text-xs text-gray-400 font-medium px-1">Link</span>

                <select
                    value={link.platform}
                    onChange={(e) => handleSocialChange(link.id, 'platform', e.target.value as SocialPlatform)}
                    className="flex-1 sm:flex-none bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                >
                    <option value="email">{t('Email')}</option>
                    <option value="website">{t('Website')}</option>
                    <option value="linkedin">{t('LinkedIn')}</option>
                    <option value="amazonmusic">Amazon Music</option>
                    <option value="bandcamp">Bandcamp</option>
                    <option value="bandlab">BandLab</option>
                    <option value="deezer">Deezer</option>
                    <option value="facebook">Facebook</option>
                    <option value="github">GitHub</option>
                    <option value="instagram">Instagram</option>
                    <option value="iheartradio">iHeartRadio</option>
                    <option value="pandora">Pandora</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="soundcloud">SoundCloud</option>
                    <option value="spotify">Spotify</option>
                    <option value="tidal">Tidal</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter</option>
                    <option value="youtube">YouTube</option>
                    <option value="custom">{t('Custom Link')}</option>
                </select>
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <input
                    type={link.platform === 'email' ? 'email' : 'url'}
                    inputMode={link.platform === 'email' ? 'email' : 'url'}
                    placeholder={link.platform === 'email' ? t('Email Address') : t('URL')}
                    value={link.url}
                    onChange={(e) => handleSocialChange(link.id, 'url', e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                />
                {link.platform === 'custom' && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder={t('Label')}
                            value={link.label || ''}
                            onChange={(e) => handleSocialChange(link.id, 'label', e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`icon-${link.id}`}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            handleSocialChange(link.id, 'customIconUrl', reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <label
                                htmlFor={`icon-${link.id}`}
                                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors cursor-pointer text-sm h-full"
                                title="Upload Custom Icon"
                            >
                                {link.customIconUrl ? <img src={link.customIconUrl} className="w-5 h-5 object-contain" /> : <Upload className="w-4 h-4" />}
                                <span className="hidden sm:inline">{link.customIconUrl ? t('Change') : t('Icon')}</span>
                            </label>
                            {link.customIconUrl && (
                                <button
                                    onClick={() => handleSocialChange(link.id, 'customIconUrl', '')}
                                    className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow border border-gray-200 text-red-500 hover:bg-red-50"
                                    title="Remove Icon"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={() => removeSocialLink(link.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors self-start sm:self-center mt-1 sm:mt-0"
                aria-label="Remove link"
            >
                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
        </div>
    );
}

interface SortablePhoneNumberProps {
    phone: PhoneNumber;
    handlePhoneChange: (id: string, field: keyof PhoneNumber, value: string) => void;
    removePhoneNumber: (id: string) => void;
    t: (key: string) => string;
}

function SortablePhoneNumber({ phone, handlePhoneChange, removePhoneNumber, t }: SortablePhoneNumberProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: phone.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="group flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
            <div {...attributes} {...listeners} className="touch-none">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-1/3">
                        <select
                            value={['Office', 'Mobile', 'Home', 'WhatsApp'].includes(phone.label) ? phone.label : 'Other'}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'Other') {
                                    handlePhoneChange(phone.id, 'label', '');
                                } else {
                                    handlePhoneChange(phone.id, 'label', val);
                                }
                            }}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                        >
                            <option value="Office">{t('Office')}</option>
                            <option value="Mobile">{t('Mobile')}</option>
                            <option value="Home">{t('Home')}</option>
                            <option value="WhatsApp">{t('WhatsApp')}</option>
                            <option value="Other">{t('Other')}</option>
                        </select>
                        {!['Office', 'Mobile', 'Home', 'WhatsApp'].includes(phone.label) && (
                            <input
                                type="text"
                                placeholder={t('Custom Label')}
                                value={phone.label}
                                onChange={(e) => handlePhoneChange(phone.id, 'label', e.target.value)}
                                className="w-full mt-2 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                autoFocus
                            />
                        )}
                </div>
                <PhoneInput
                    value={phone.number}
                    onChange={(_, formattedValue) => handlePhoneChange(phone.id, 'number', formattedValue)}
                    className="w-full sm:w-2/3 self-start bg-white border border-gray-300 rounded-lg"
                    placeholder={t('Number Placeholder')}
                />
            </div>
            <button
                onClick={() => removePhoneNumber(phone.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

interface EditorProps {
    data: CardData;
    onChange: (data: CardData) => void;
    currentCardId?: number | null;
    onSlugStatusChange?: (status: 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid') => void;
}

function SortableEmbed({ embed, handleEmbedChange, removeEmbed, t }: { embed: any, handleEmbedChange: any, removeEmbed: any, t: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: embed.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 group">
            <div className="flex items-center gap-2">
                <div {...attributes} {...listeners} className="touch-none">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                </div>
                <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500">
                    {embed.type === 'youtube' ? <Youtube className="w-4 h-4" /> :
                        embed.type === 'spotify' ? <Music className="w-4 h-4" /> :
                            embed.type === 'instagram' ? <Instagram className="w-4 h-4" /> :
                                <Video className="w-4 h-4" />}
                </div>
                <select
                    value={embed.type}
                    onChange={(e) => handleEmbedChange(embed.id, 'type', e.target.value)}
                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                >
                    <option value="youtube">{t('YouTube Video')}</option>
                    <option value="vimeo">{t('Vimeo Video')}</option>
                    <option value="tiktok">{t('TikTok Video')}</option>
                    <option value="instagram">{t('Instagram Post')}</option>
                    <option value="spotify">{t('Spotify Track')}</option>
                </select>
                <div className="flex-1"></div>
                <button
                    onClick={() => removeEmbed(embed.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <input
                type="text"
                placeholder={
                    embed.type === 'youtube' ? t('YouTube Video') :
                        embed.type === 'vimeo' ? t('Vimeo Video') :
                            embed.type === 'tiktok' ? t('TikTok Video') :
                                embed.type === 'instagram' ? t('Instagram Post') :
                                    t('Spotify Track')
                }
                value={embed.url}
                onChange={(e) => handleEmbedChange(embed.id, 'url', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
            <input
                type="text"
                placeholder="Optional Title"
                value={embed.title || ''}
                onChange={(e) => handleEmbedChange(embed.id, 'title', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
        </div>
    );
}

export function Editor({ data, onChange, currentCardId, onSlugStatusChange }: EditorProps) {
    const { t, i18n } = useTranslation();
    const { isFeatureEnabled, tier } = useTier();

    // Feature gates
    const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [cropTarget, setCropTarget] = useState<'avatarUrl' | 'logoUrl' | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = (data.socialLinks || []).findIndex((link) => link.id === active.id);
            const newIndex = (data.socialLinks || []).findIndex((link) => link.id === over.id);

            handleChange('socialLinks', arrayMove(data.socialLinks || [], oldIndex, newIndex));
        }
    };

    const handlePhoneDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = (data.phoneNumbers || []).findIndex((p) => p.id === active.id);
            const newIndex = (data.phoneNumbers || []).findIndex((p) => p.id === over.id);

            handleChange('phoneNumbers', arrayMove(data.phoneNumbers || [], oldIndex, newIndex));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'logoUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCroppingImage(reader.result as string);
                setCropTarget(field);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedImage: string) => {
        if (cropTarget) {
            handleChange(cropTarget, croppedImage);
        }
        setCroppingImage(null);
        setCropTarget(null);
    };

    const handleCropCancel = () => {
        setCroppingImage(null);
        setCropTarget(null);
    };

    const handleChange = (field: keyof CardData, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const handleSocialChange = (id: string, field: keyof SocialLink, value: string) => {
        const newLinks = (data.socialLinks || []).map(link =>
            link.id === id ? { ...link, [field]: value } : link
        );
        handleChange('socialLinks', newLinks);
    };

    const addSocialLink = () => {
        const currentCount = (data.socialLinks || []).length;
        if (tier === 'starter' && currentCount >= 3) {
            setUpgradeModalFeature('Social Links (Max 3 on Starter)');
            return;
        }
        const newLink: SocialLink = {
            id: Date.now().toString(),
            platform: 'website',
            url: '',
            label: ''
        };
        handleChange('socialLinks', [...(data.socialLinks || []), newLink]);
    };

    const removeSocialLink = (id: string) => {
        handleChange('socialLinks', (data.socialLinks || []).filter(link => link.id !== id));
    };

    const addPhoneNumber = () => {
        const currentCount = (data.phoneNumbers || []).length;
        if (tier === 'starter' && currentCount >= 2) {
            setUpgradeModalFeature('Phone Numbers (Max 2 on Starter)');
            return;
        }
        const newPhone: PhoneNumber = {
            id: Date.now().toString(),
            label: 'Mobile',
            number: ''
        };
        handleChange('phoneNumbers', [...(data.phoneNumbers || []), newPhone]);
    };

    const removePhoneNumber = (id: string) => {
        handleChange('phoneNumbers', (data.phoneNumbers || []).filter(p => p.id !== id));
    };

    const handlePhoneChange = (id: string, field: keyof PhoneNumber, value: string) => {
        const newPhones = (data.phoneNumbers || []).map(p =>
            p.id === id ? { ...p, [field]: value } : p
        );
        handleChange('phoneNumbers', newPhones);
    };

    const addEmbed = () => {
        const newEmbed = { id: Date.now().toString(), type: 'youtube' as const, url: '' };
        handleChange('embeds', [...(data.embeds || []), newEmbed]);
    };

    const removeEmbed = (id: string) => {
        handleChange('embeds', (data.embeds || []).filter(e => e.id !== id));
    };

    const handleEmbedChange = (id: string, field: string, value: string) => {
        const processedValue = field === 'url' ? value.trim() : value;
        const newEmbeds = (data.embeds || []).map(embed =>
            embed.id === id ? { ...embed, [field]: processedValue } : embed
        );
        handleChange('embeds', newEmbeds);
    };

    const handleEmbedDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = (data.embeds || []).findIndex((e) => e.id === active.id);
            const newIndex = (data.embeds || []).findIndex((e) => e.id === over.id);
            handleChange('embeds', arrayMove(data.embeds || [], oldIndex, newIndex));
        }
    };

    // Section Management
    /*
    const addSection = () => {
        const newSection = {
            id: Date.now().toString(),
            title: 'New Section',
            links: []
        };
        handleChange('sections', [...(data.sections || []), newSection]);
    };

    const removeSection = (sectionId: string) => {
        handleChange('sections', (data.sections || []).filter(s => s.id !== sectionId));
    };

    const updateSectionTitle = (sectionId: string, title: string) => {
        const newSections = (data.sections || []).map(s =>
            s.id === sectionId ? { ...s, title } : s
        );
        handleChange('sections', newSections);
    };

    const addLinkToSection = (sectionId: string) => {
        const newLink: SocialLink = {
            id: Date.now().toString(),
            platform: 'website',
            url: '',
            label: ''
        };
        const newSections = (data.sections || []).map(s =>
            s.id === sectionId ? { ...s, links: [...s.links, newLink] } : s
        );
        handleChange('sections', newSections);
    };

    const removeLinkFromSection = (sectionId: string, linkId: string) => {
        const newSections = (data.sections || []).map(s =>
            s.id === sectionId ? { ...s, links: (s.links || []).filter(l => l.id !== linkId) } : s
        );
        handleChange('sections', newSections);
    };

    const handleSectionLinkChange = (sectionId: string, linkId: string, field: keyof SocialLink, value: string) => {
        const newSections = (data.sections || []).map(s =>
            s.id === sectionId ? {
                ...s,
                links: (s.links || []).map(l => l.id === linkId ? { ...l, [field]: value } : l)
            } : s
        );
        handleChange('sections', newSections);
    };
    */
 
    const handleAutoTranslate = async () => {
        const targetLang = i18n.language;
        if (targetLang === 'en') return;

        setIsTranslating(true);
        try {
            const [newName, newJob, newComp, newBio] = await Promise.all([
                translateText(data.fullName, targetLang),
                translateText(data.jobTitle, targetLang),
                translateText(data.company, targetLang),
                translateText(data.bio, targetLang)
            ]);

            onChange({
                ...data,
                fullName: newName,
                jobTitle: newJob,
                company: newComp,
                bio: newBio
            });
        } catch (error) {
            console.error('Manual translation failed:', error);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 md:pt-20 space-y-8 h-full overflow-y-auto">
            <div>
                <img src="/logo.png" alt="Really Simple Apps" className="w-[180px] mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('Edit Profile')}</h2>
                <p className="text-gray-500 text-sm">{t('Update Info')}</p>
            </div>

            {/* Personal Info */}
            <div className="space-y-4" data-tour="profile">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('Personal Info')}</h3>
                    {i18n.language !== 'en' && (
                        <button
                            onClick={handleAutoTranslate}
                            disabled={isTranslating}
                            className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold py-1.5 px-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            {isTranslating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Languages className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            )}
                            {isTranslating ? t('Translating...') : `${t('Translate to')} ${i18n.language.toUpperCase()}`}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('Full Name')}</label>
                        <input
                            type="text"
                            value={data.fullName}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('Job Title')}</label>
                        <input
                            type="text"
                            value={data.jobTitle}
                            onChange={(e) => handleChange('jobTitle', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('Company')}</label>
                        <input
                            type="text"
                            value={data.company}
                            onChange={(e) => handleChange('company', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">{t('Bio')}</label>
                            <span className={`text-xs ${data.bio?.length > 150 ? 'text-red-500' : 'text-gray-400'}`}>
                                {data.bio?.length || 0} / 150
                            </span>
                        </div>
                        <textarea
                            value={data.bio}
                            onChange={(e) => {
                                if (e.target.value.length <= 150) {
                                    handleChange('bio', e.target.value);
                                }
                            }}
                            rows={3}
                            maxLength={150}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        {/* We use ProBadge manually if needed, or pass it into SlugCustomizer if it wraps the label. Here SlugCustomizer renders its own label, but let's just let it handle it or add ProBadge above. Actually SlugCustomizer has its own label. Let's pass an onUpgradeClick prop to it. */}
                    </div>
                    <SlugCustomizer
                        value={data.slug}
                        onChange={(slug) => handleChange('slug', slug)}
                        fullName={data.fullName}
                        currentCardId={currentCardId}
                        onStatusChange={onSlugStatusChange}
                        disabled={!isFeatureEnabled('custom_slug')}
                        tier={tier}
                        onUpgradeClick={() => setUpgradeModalFeature('Custom URLs')}
                    />
                </div>
            </div>

            {/* Phone Numbers */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('Phone Numbers')}</h3>
                    <button
                        onClick={addPhoneNumber}
                        className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium py-2 px-3 hover:bg-blue-50 rounded-lg transition-colors group"
                    >
                        <Plus className="w-4 h-4" /> {t('Add Phone')}
                        {tier === 'starter' && (
                            <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                {(data.phoneNumbers || []).length}/2
                            </span>
                        )}
                    </button>
                </div>

                <div className="space-y-3">
                    <DndContext
                        id="phone-dnd"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handlePhoneDragEnd}
                    >
                        <SortableContext
                            items={data.phoneNumbers || []}
                            strategy={verticalListSortingStrategy}
                        >
                            {(data.phoneNumbers || []).map((phone) => (
                                <SortablePhoneNumber
                                    key={phone.id}
                                    phone={phone}
                                    handlePhoneChange={handlePhoneChange}
                                    removePhoneNumber={removePhoneNumber}
                                    t={t}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Hidden items notice for Starter downgrade */}
                {tier === 'starter' && (data.phoneNumbers || []).length > 2 && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        <span className="text-base">🔒</span>
                        <span>
                            <strong>{(data.phoneNumbers || []).length - 2} phone number{(data.phoneNumbers || []).length - 2 > 1 ? 's' : ''} hidden</strong> on your public card.
                            {' '}They are safely stored and will reappear when you upgrade.
                        </span>
                    </div>
                )}
            </div>

            {/* Social Links */}
            <div className="space-y-4" data-tour="links">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('Social Links')}</h3>
                    <button
                        onClick={addSocialLink}
                        className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium py-2 px-3 hover:bg-blue-50 rounded-lg transition-colors group"
                    >
                        <Plus className="w-4 h-4" /> {t('Add Link')}
                        {tier === 'starter' && (
                            <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                {(data.socialLinks || []).length}/5
                            </span>
                        )}
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="space-y-3">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={data.socialLinks || []}
                                strategy={verticalListSortingStrategy}
                            >
                                {(data.socialLinks || []).map((link) => (
                                    <SortableSocialLink
                                        key={link.id}
                                        link={link}
                                        handleSocialChange={handleSocialChange}
                                        removeSocialLink={removeSocialLink}
                                        t={t}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>

                    {/* Hidden items notice for Starter downgrade */}
                    {tier === 'starter' && (data.socialLinks || []).length > 5 && (
                        <div className="flex items-center gap-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                            <span className="text-base">🔒</span>
                            <span>
                                <strong>{(data.socialLinks || []).length - 5} social link{(data.socialLinks || []).length - 5 > 1 ? 's' : ''} hidden</strong> on your public card.
                                {' '}They are safely stored and will reappear when you upgrade.
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Rich Visual Media Embeds */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        {t('Rich Visual Media')}
                        {!isFeatureEnabled('rich_media') && <ProBadge />}
                    </h3>
                    {isFeatureEnabled('rich_media') ? (
                        <button
                            onClick={addEmbed}
                            className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium py-2 px-3 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" /> {t('Add Embed')}
                        </button>
                    ) : (
                        <button
                            onClick={() => setUpgradeModalFeature('Rich Media Embeds')}
                            className="text-sm flex items-center gap-1 text-indigo-600 font-bold py-2 px-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                            <Lock className="w-4 h-4" /> {t('Unlock')}
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    <DndContext
                        id="embed-dnd"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleEmbedDragEnd}
                    >
                        <SortableContext
                            items={data.embeds || []}
                            strategy={verticalListSortingStrategy}
                        >
                            {(data.embeds || []).map((embed) => (
                                <SortableEmbed
                                    key={embed.id}
                                    embed={embed}
                                    handleEmbedChange={handleEmbedChange}
                                    removeEmbed={removeEmbed}
                                    t={t}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    {(data.embeds || []).length === 0 && (
                        <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                            No active embeds. Add YouTube videos or Spotify tracks.
                        </div>
                    )}
                </div>
            </div>

            {/* Accordion Sections - Temporarily Disabled
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('Accordion Sections')}</h3>
                    <button
                        onClick={addSection}
                        className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium py-2 px-3 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> {t('Add Section')}
                    </button>
                </div>

                <div className="space-y-6">
                    {(data.sections || []).map((section) => (
                        <div key={section.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-gray-100/50">
                                <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                    className="flex-1 bg-transparent font-medium text-gray-900 placeholder-gray-500 outline-none hover:bg-white/50 focus:bg-white px-2 py-1 rounded transition-colors"
                                    placeholder="Section Title"
                                />
                                <button
                                    onClick={() => removeSection(section.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete Section"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 space-y-3">
                                <DndContext
                                    id={`section-dnd-${section.id}`}
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(event) => {
                                        const { active, over } = event;
                                        if (over && active.id !== over.id) {
                                            const oldIndex = section.links.findIndex((link) => link.id === active.id);
                                            const newIndex = section.links.findIndex((link) => link.id === over.id);
                                            const newLinks = arrayMove(section.links, oldIndex, newIndex);
                                            const newSections = (data.sections || []).map(s =>
                                                s.id === section.id ? { ...s, links: newLinks } : s
                                            );
                                            handleChange('sections', newSections);
                                        }
                                    }}
                                >
                                    <SortableContext
                                        items={section.links || []}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {(section.links || []).map((link) => (
                                            <SortableSocialLink
                                                key={link.id}
                                                link={link}
                                                handleSocialChange={(linkId, field, value) => handleSectionLinkChange(section.id, linkId, field, value)}
                                                removeSocialLink={(linkId) => removeLinkFromSection(section.id, linkId)}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>

                                <button
                                    onClick={() => addLinkToSection(section.id)}
                                    className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" /> {t('Add Link to Section')}
                                </button>
                            </div>
                        </div>
                    ))}
                    {(data.sections || []).length === 0 && (
                        <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                            {t('No sections yet. Group your links into collapsible sections.')}
                        </div>
                    )}
                </div>
            </div>
            */}

            {/* Branding */}
            <div className="space-y-4" data-tour="branding">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('Branding')}</h3>

                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('Logo')}</label>
                    <div className="flex items-center gap-4">
                        {data.logoUrl ? (
                            <div className="relative w-16 h-16 rounded-lg border border-gray-200 p-2 flex items-center justify-center bg-gray-50">
                                <img src={data.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                <button
                                    onClick={() => handleChange('logoUrl', undefined)}
                                    className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-200 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => logoInputRef.current?.click()}
                                className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors text-xs gap-1"
                            >
                                <Upload className="w-5 h-5" />
                                <span>{t('Upload')}</span>
                            </button>
                        )}
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, 'logoUrl')}
                        />
                        <div className="text-xs text-gray-500 flex-1">
                            {t('Logo Helper')}
                        </div>
                    </div>
                </div>

                {/* Photo Settings */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">{t('Profile Photo')}</label>
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                            <button
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${data.showPhoto ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => handleChange('showPhoto', true)}
                            >
                                {t('Show')}
                            </button>
                            <button
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!data.showPhoto ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => handleChange('showPhoto', false)}
                            >
                                {t('Hide')}
                            </button>
                        </div>
                    </div>

                    {data.showPhoto && (
                        <div className="space-y-4">
                            {/* Photo Shape Selection */}
                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => handleChange('photoStyle', 'circle')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${data.photoStyle === 'circle' || !data.photoStyle ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {t('Circle')}
                                </button>
                                <button
                                    onClick={() => handleChange('photoStyle', 'rounded')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${data.photoStyle === 'rounded' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {t('Rounded')}
                                </button>
                                <button
                                    onClick={() => handleChange('photoStyle', 'full')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${data.photoStyle === 'full' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {t('Full Width')}
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-50 ${data.photoStyle === 'circle' || !data.photoStyle ? 'rounded-full' : data.photoStyle === 'rounded' ? 'rounded-xl' : 'rounded-none w-full h-16'}`}>
                                    <img
                                        src={data.avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        style={{
                                            transform: `scale(${data.avatarScale || 1}) translate(${data.avatarPosition?.x || 0}px, ${data.avatarPosition?.y || 0}px)`
                                        }}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">{t('Image URL')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={data.avatarUrl}
                                            onChange={(e) => handleChange('avatarUrl', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="https://..."
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, 'avatarUrl')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Scale and Position Controls */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                                {/* Scale Control */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-medium text-gray-700">{t('Zoom / Scale')}</label>
                                        <span className="text-xs text-gray-500">{data.avatarScale || 1}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="3"
                                        step="0.1"
                                        value={data.avatarScale || 1}
                                        onChange={(e) => handleChange('avatarScale', parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                {/* Position Controls */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-medium text-gray-700">{t('Position Adjustment')}</label>
                                        <button
                                            onClick={() => {
                                                handleChange('avatarScale', 1);
                                                handleChange('avatarPosition', { x: 0, y: 0 });
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            {t('Reset')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">{t('Horizontal (X)')}</label>
                                            <input
                                                type="range"
                                                min="-100"
                                                max="100"
                                                step="1"
                                                value={data.avatarPosition?.x || 0}
                                                onChange={(e) => handleChange('avatarPosition', { ...(data.avatarPosition || { x: 0, y: 0 }), x: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">{t('Vertical (Y)')}</label>
                                            <input
                                                type="range"
                                                min="-100"
                                                max="100"
                                                step="1"
                                                value={data.avatarPosition?.y || 0}
                                                onChange={(e) => handleChange('avatarPosition', { ...(data.avatarPosition || { x: 0, y: 0 }), y: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Layout & Interface Settings */}
                <div className="pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">{t('Start Layout & Interface')}</h3>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Card Layout')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleChange('layoutMode', 'classic')}
                                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all h-auto min-h-[40px] flex items-center justify-center text-center break-words whitespace-normal leading-tight ${data.layoutMode === 'classic' || !data.layoutMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                {t('Classic')}
                            </button>
                            <button
                                onClick={() => handleChange('layoutMode', 'modern-left')}
                                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all h-auto min-h-[40px] flex items-center justify-center text-center break-words whitespace-normal leading-tight ${data.layoutMode === 'modern-left' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                {t('Modern Left')}
                            </button>
                            <button
                                onClick={() => handleChange('layoutMode', 'hero')}
                                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all h-auto min-h-[40px] flex items-center justify-center text-center break-words whitespace-normal leading-tight ${data.layoutMode === 'hero' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                {t('Hero')}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('Sticky Action Bar')}</label>
                            <p className="text-xs text-gray-500">{t('Pin actions to bottom of screen')}</p>
                        </div>
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                            <button
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${data.stickyActionBar ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => handleChange('stickyActionBar', true)}
                            >
                                {t('On')}
                            </button>
                            <button
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!data.stickyActionBar ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => handleChange('stickyActionBar', false)}
                            >
                                {t('Off')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Background Settings */}
                <div className="pt-2 border-t border-gray-100 relative">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">{t('Background Style')}</label>
                        {!isFeatureEnabled('custom_theme') && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400 font-medium">BASIC TEMPLATES ENABLED</span>
                                <Link to="/pricing" className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded">
                                    <Lock className="w-2.5 h-2.5" /> UPGRADE
                                </Link>
                            </div>
                        )}
                    </div>

                    <div>
                        {/* Cool Palettes - Standard Templates for Starter */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">{t('Cool Palettes')}</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { name: 'Midnight', theme: '#000000', gradient: '#1a1a1a', text: '#ffffff', button: '#3b82f6' },
                                    { name: 'Ocean', theme: '#0ea5e9', gradient: '#000000', text: '#ffffff', button: '#0284c7' },
                                    { name: 'Forest', theme: '#059669', gradient: '#000000', text: '#ffffff', button: '#10b981' },
                                    { name: 'Royal', theme: '#4f46e5', gradient: '#000000', text: '#ffffff', button: '#6366f1' },
                                    { name: 'Sunset', theme: '#f43f5e', gradient: '#fbbf24', text: '#ffffff', button: '#f97316' },
                                    { name: 'Lava', theme: '#ef4444', gradient: '#000000', text: '#ffffff', button: '#dc2626' },
                                    { name: 'Cloud', theme: '#f8fafc', gradient: '#e2e8f0', text: '#1e293b', button: '#2563eb' },
                                    { name: 'Glass', theme: '#6366f1', gradient: '#a855f7', text: '#ffffff', button: '#ffffff' },
                                    { name: 'Copper', theme: '#92400e', gradient: '#b45309', text: '#fef3c7', button: '#d97706' },
                                    { name: 'Neo Mint', theme: '#10b981', gradient: '#0d9488', text: '#ecfdf5', button: '#14b8a6' },
                                    { name: 'Aurora', theme: '#8b5cf6', gradient: '#06b6d4', text: '#ffffff', button: '#c084fc' },
                                    { name: 'Blush', theme: '#ec4899', gradient: '#f43f5e', text: '#ffffff', button: '#fb7185' },
                                    { name: 'Slate', theme: '#334155', gradient: '#0f172a', text: '#e2e8f0', button: '#64748b' },
                                    { name: 'Gold', theme: '#ca8a04', gradient: '#92400e', text: '#fefce8', button: '#eab308' }
                                ].map((p) => (
                                    <button
                                        key={p.name}
                                        onClick={() => {
                                            onChange({
                                                ...data,
                                                themeColor: p.theme,
                                                gradientColor: p.gradient,
                                                textColor: p.text,
                                                buttonColor: p.button,
                                                backgroundType: 'gradient'
                                            });
                                        }}
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                        title={p.name}
                                    >
                                        <div className="flex -space-x-1">
                                            <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: p.theme }} />
                                            <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: p.gradient }} />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-600 group-hover:text-blue-700">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Colors - Gated for Pro+ */}
                        <div className={!isFeatureEnabled('custom_theme') ? 'opacity-50 pointer-events-none' : ''}>
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => handleChange('backgroundType', 'solid')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${data.backgroundType === 'solid' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {t('Solid Color')}
                                </button>
                                <button
                                    onClick={() => handleChange('backgroundType', 'gradient')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${data.backgroundType === 'gradient' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {t('Gradient')}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        {data.backgroundType === 'solid' ? t('Background Color') : t('Start Color')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={data.themeColor}
                                            onChange={(e) => handleChange('themeColor', e.target.value)}
                                            className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                        />
                                        <span className="text-gray-500 text-xs uppercase">{data.themeColor}</span>
                                    </div>
                                </div>

                                {data.backgroundType === 'solid' ? (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('Button Color')}</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={data.buttonColor || '#2563eb'}
                                                onChange={(e) => handleChange('buttonColor', e.target.value)}
                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                            />
                                            <span className="text-gray-500 text-xs uppercase">{data.buttonColor || '#2563eb'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('End Color')}</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={data.gradientColor || '#000000'}
                                                onChange={(e) => handleChange('gradientColor', e.target.value)}
                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                            />
                                            <span className="text-gray-500 text-xs uppercase">{data.gradientColor || '#000000'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {data.backgroundType === 'gradient' && (
                                <div className="mt-4">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('Button Color')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={data.buttonColor || '#2563eb'}
                                            onChange={(e) => handleChange('buttonColor', e.target.value)}
                                            className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
                                        />
                                        <span className="text-gray-500 text-xs uppercase">{data.buttonColor || '#2563eb'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Font & Color Selection */}
                <div className="pt-4 border-t border-gray-200 relative">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            {t('Typography & Colors')}
                            {!isFeatureEnabled('custom_theme') && (
                                <Link to="/pricing" className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                    <Lock className="w-2.5 h-2.5" /> PRO
                                </Link>
                            )}
                        </h3>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!isFeatureEnabled('custom_theme') ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Font Family')}</label>
                            <select
                                value={data.font || 'Inter'}
                                onChange={(e) => handleChange('font', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                style={{ fontFamily: data.font || 'Inter' }}
                            >
                                <option value="Bebas Neue" style={{ fontFamily: 'Bebas Neue' }}>Bebas Neue</option>
                                <option value="Dancing Script" style={{ fontFamily: 'Dancing Script' }}>Dancing Script</option>
                                <option value="Inter" style={{ fontFamily: 'Inter' }}>Inter</option>
                                <option value="Lato" style={{ fontFamily: 'Lato' }}>Lato</option>
                                <option value="Lobster" style={{ fontFamily: 'Lobster' }}>Lobster</option>
                                <option value="Lora" style={{ fontFamily: 'Lora' }}>Lora</option>
                                <option value="Merriweather" style={{ fontFamily: 'Merriweather' }}>Merriweather</option>
                                <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</option>
                                <option value="Nunito" style={{ fontFamily: 'Nunito' }}>Nunito</option>
                                <option value="Open Sans" style={{ fontFamily: 'Open Sans' }}>Open Sans</option>
                                <option value="Oswald" style={{ fontFamily: 'Oswald' }}>Oswald</option>
                                <option value="Pacifico" style={{ fontFamily: 'Pacifico' }}>Pacifico</option>
                                <option value="Playfair Display" style={{ fontFamily: 'Playfair Display' }}>Playfair Display</option>
                                <option value="Poppins" style={{ fontFamily: 'Poppins' }}>Poppins</option>
                                <option value="PT Serif" style={{ fontFamily: 'PT Serif' }}>PT Serif</option>
                                <option value="Raleway" style={{ fontFamily: 'Raleway' }}>Raleway</option>
                                <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
                                <option value="Roboto Mono" style={{ fontFamily: 'Roboto Mono' }}>Roboto Mono</option>
                                <option value="Rubik" style={{ fontFamily: 'Rubik' }}>Rubik</option>
                                <option value="Source Sans 3" style={{ fontFamily: 'Source Sans 3' }}>Source Sans 3</option>
                                <option value="Ubuntu" style={{ fontFamily: 'Ubuntu' }}>Ubuntu</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Text Color')}</label>
                            <div className="flex items-center gap-2 h-[38px]">
                                <input
                                    type="color"
                                    value={data.textColor || '#ffffff'}
                                    onChange={(e) => handleChange('textColor', e.target.value)}
                                    className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0 shadow-sm"
                                />
                                <span className="text-gray-500 text-xs font-mono">{data.textColor || '#ffffff'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Remove Branding Setting */}
                <div className="pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('Remove Branding')}</label>
                            <p className="text-xs text-gray-500">{t('Hide "Powered by" footer on public card')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                <button
                                    disabled={!isFeatureEnabled('remove_branding')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${data.removeBranding ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'} ${!isFeatureEnabled('remove_branding') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => handleChange('removeBranding', true)}
                                >
                                    {t('On')}
                                </button>
                                <button
                                    disabled={!isFeatureEnabled('remove_branding')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!data.removeBranding ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'} ${!isFeatureEnabled('remove_branding') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => handleChange('removeBranding', false)}
                                >
                                    {t('Off')}
                                </button>
                            </div>
                            {!isFeatureEnabled('remove_branding') && (
                                <Link to="/pricing" className="text-[10px] text-blue-600 font-bold hover:underline">
                                    {t('UPGRADE TO REMOVE')}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Cropper Modal */}
            {croppingImage && (
                <ImageCropper
                    image={croppingImage}
                    aspect={cropTarget === 'avatarUrl' ? 1 : 16 / 9}
                    circular={cropTarget === 'avatarUrl'}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}

            {/* Upsell Modal */}
            <UpgradeModal
                isOpen={!!upgradeModalFeature}
                onClose={() => setUpgradeModalFeature(null)}
                featureName={upgradeModalFeature || ''}
            />
        </div>
    );
}
