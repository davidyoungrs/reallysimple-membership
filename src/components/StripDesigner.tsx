import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Image as ImageIcon, Type, Check, Palette } from 'lucide-react';
import { type CardData } from '../types';

interface StripDesignerProps {
    cardData: CardData;
    initialWalletData: any;
    onSave: (dataUrl: string) => void;
    onClose: () => void;
}

export function StripDesigner({ cardData, initialWalletData, onSave, onClose }: StripDesignerProps) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State
    const [bgType, setBgType] = useState<'match' | 'color' | 'gradient' | 'image'>('match');
    const [bgColor, setBgColor] = useState(initialWalletData.backgroundColor || '#ffffff');
    const [bgGradient, setBgGradient] = useState(['#4f46e5', '#9333ea']); // Default gradient
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
    const [bgFilters, setBgFilters] = useState({ grayscale: 0, sepia: 0, opacity: 100 });

    const [textConfig, setTextConfig] = useState({
        showName: true,
        nameColor: initialWalletData.foregroundColor || '#000000',
        showTitle: true,
        titleColor: initialWalletData.labelColor || '#666666',
        showTagline: false,
        tagline: '',
        taglineColor: initialWalletData.labelColor || '#666666',
    });

    const [photoConfig, setPhotoConfig] = useState({
        show: true,
        position: 'left' as 'left' | 'right',
        scale: 100,
        border: 'none' as 'none' | 'thin' | 'thick',
    });

    const [profileImage, setProfileImage] = useState<HTMLImageElement | null>(null);

    // Load Profile Image
    useEffect(() => {
        if (cardData.avatarUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = cardData.avatarUrl;
            img.onload = () => setProfileImage(img);
        }
    }, [cardData.avatarUrl]);

    // Draw Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Strip Dimensions (Double density for retina)
        const width = 1125;
        const height = 369; // ~3.05 aspect ratio typical for strip
        canvas.width = width;
        canvas.height = height;

        // 1. Background
        if (bgType === 'match') {
            ctx.fillStyle = initialWalletData.backgroundColor || '#ffffff';
            ctx.fillRect(0, 0, width, height);
        } else if (bgType === 'color') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);
        } else if (bgType === 'gradient') {
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, bgGradient[0]);
            grad.addColorStop(1, bgGradient[1]);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        } else if (bgType === 'image' && bgImage) {
            // Draw image with aspect fill
            const scale = Math.max(width / bgImage.width, height / bgImage.height);
            const x = (width / 2) - (bgImage.width / 2) * scale;
            const y = (height / 2) - (bgImage.height / 2) * scale;

            ctx.save();
            ctx.filter = `grayscale(${bgFilters.grayscale}%) sepia(${bgFilters.sepia}%) opacity(${bgFilters.opacity}%)`;
            ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
            ctx.restore();
        }

        // 2. Photo
        if (photoConfig.show && profileImage) {
            const size = 280 * (photoConfig.scale / 100);
            const y = (height - size) / 2;
            const x = photoConfig.position === 'left' ? 60 : width - size - 60;

            ctx.save();
            // Circular clip
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(profileImage, x, y, size, size);
            ctx.restore();

            // Border
            if (photoConfig.border !== 'none') {
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                ctx.lineWidth = photoConfig.border === 'thin' ? 4 : 12;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }
        }

        // 3. Text
        ctx.textAlign = photoConfig.position === 'left' ? 'left' : 'right';
        const textX = photoConfig.position === 'left' ? (photoConfig.show ? 400 : 60) : (photoConfig.show ? width - 400 : width - 60);
        const centerY = height / 2;

        let cursorY = centerY;

        const totalHeight = (textConfig.showName ? 80 : 0) + (textConfig.showTitle ? 50 : 0) + (textConfig.showTagline ? 50 : 0);
        cursorY = (height - totalHeight) / 2 + 60; // Start position

        if (textConfig.showName) {
            ctx.font = 'bold 70px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = textConfig.nameColor;
            ctx.fillText(cardData.fullName || 'Your Name', textX, cursorY);
            cursorY += 70;
        }

        if (textConfig.showTitle) {
            ctx.font = '500 40px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = textConfig.titleColor;
            ctx.fillText(cardData.jobTitle || 'Job Title', textX, cursorY);
            cursorY += 50;
        }

        if (textConfig.showTagline && textConfig.tagline) {
            ctx.font = 'italic 36px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = textConfig.taglineColor;
            ctx.fillText(textConfig.tagline, textX, cursorY + 10);
        }

    }, [bgType, bgColor, bgGradient, bgImage, bgFilters, textConfig, photoConfig, profileImage, initialWalletData, cardData]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    setBgImage(img);
                    setBgType('image');
                };
                img.src = ev.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t('Strip Image Designer')}</h2>
                        <p className="text-sm text-gray-500">{t('Create a custom banner for your Apple Wallet pass')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Preview Area */}
                    <div className="flex-1 bg-gray-100 p-8 flex flex-col items-center justify-center overflow-auto">
                        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                            {/* Canvas Display */}
                            <canvas
                                ref={canvasRef}
                                className="w-full h-auto block"
                                style={{ maxHeight: '400px' }}
                            />
                        </div>
                        <p className="mt-4 text-xs text-gray-400 font-medium uppercase tracking-wide">
                            {t('Preview')}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="w-full md:w-96 bg-white border-l border-gray-100 flex flex-col h-full overflow-y-auto">

                        {/* Background Controls */}
                        <div className="p-6 border-b border-gray-100 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Palette className="w-4 h-4 text-blue-600" />
                                <h3 className="text-sm font-bold text-gray-900">{t('Background')}</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setBgType('match')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${bgType === 'match' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    {t('Match Pass')}
                                </button>
                                <button
                                    onClick={() => setBgType('color')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${bgType === 'color' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    {t('Solid Color')}
                                </button>
                                <button
                                    onClick={() => setBgType('image')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${bgType === 'image' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    {t('Image')}
                                </button>
                                <button
                                    onClick={() => setBgType('gradient')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${bgType === 'gradient' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    {t('Gradient')}
                                </button>
                            </div>

                            {bgType === 'color' && (
                                <input
                                    type="color"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="w-full h-10 rounded-lg cursor-pointer"
                                />
                            )}

                            {bgType === 'gradient' && (
                                <div className="flex gap-2">
                                    <input type="color" value={bgGradient[0]} onChange={(e) => setBgGradient([e.target.value, bgGradient[1]])} className="flex-1 h-10 rounded-lg cursor-pointer" />
                                    <input type="color" value={bgGradient[1]} onChange={(e) => setBgGradient([bgGradient[0], e.target.value])} className="flex-1 h-10 rounded-lg cursor-pointer" />
                                </div>
                            )}

                            {bgType === 'image' && (
                                <div className="space-y-3">
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    {bgImage && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span>Grayscale</span>
                                                <span>{bgFilters.grayscale}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={bgFilters.grayscale} onChange={(e) => setBgFilters({ ...bgFilters, grayscale: parseInt(e.target.value) })} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />

                                            <div className="flex justify-between text-xs mt-2">
                                                <span>Sepia</span>
                                                <span>{bgFilters.sepia}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={bgFilters.sepia} onChange={(e) => setBgFilters({ ...bgFilters, sepia: parseInt(e.target.value) })} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />

                                            <div className="flex justify-between text-xs mt-2">
                                                <span>Opacity</span>
                                                <span>{bgFilters.opacity}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={bgFilters.opacity} onChange={(e) => setBgFilters({ ...bgFilters, opacity: parseInt(e.target.value) })} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Text Controls */}
                        <div className="p-6 border-b border-gray-100 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Type className="w-4 h-4 text-purple-600" />
                                <h3 className="text-sm font-bold text-gray-900">{t('Text Overlays')}</h3>
                            </div>

                            <label className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Name</span>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={textConfig.nameColor} onChange={(e) => setTextConfig({ ...textConfig, nameColor: e.target.value })} className="w-6 h-6 rounded overflow-hidden p-0 border-0" />
                                    <input type="checkbox" checked={textConfig.showName} onChange={(e) => setTextConfig({ ...textConfig, showName: e.target.checked })} className="rounded text-blue-600" />
                                </div>
                            </label>

                            <label className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Title</span>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={textConfig.titleColor} onChange={(e) => setTextConfig({ ...textConfig, titleColor: e.target.value })} className="w-6 h-6 rounded overflow-hidden p-0 border-0" />
                                    <input type="checkbox" checked={textConfig.showTitle} onChange={(e) => setTextConfig({ ...textConfig, showTitle: e.target.checked })} className="rounded text-blue-600" />
                                </div>
                            </label>

                            <div className="space-y-2">
                                <label className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Tagline</span>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={textConfig.taglineColor} onChange={(e) => setTextConfig({ ...textConfig, taglineColor: e.target.value })} className="w-6 h-6 rounded overflow-hidden p-0 border-0" />
                                        <input type="checkbox" checked={textConfig.showTagline} onChange={(e) => setTextConfig({ ...textConfig, showTagline: e.target.checked })} className="rounded text-blue-600" />
                                    </div>
                                </label>
                                {textConfig.showTagline && (
                                    <input
                                        type="text"
                                        value={textConfig.tagline}
                                        onChange={(e) => setTextConfig({ ...textConfig, tagline: e.target.value })}
                                        placeholder="Add a tagline..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Photo Controls */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ImageIcon className="w-4 h-4 text-green-600" />
                                <h3 className="text-sm font-bold text-gray-900">{t('Photo')}</h3>
                            </div>

                            <label className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Show Profile Photo</span>
                                <input type="checkbox" checked={photoConfig.show} onChange={(e) => setPhotoConfig({ ...photoConfig, show: e.target.checked })} className="rounded text-blue-600" />
                            </label>

                            {photoConfig.show && (
                                <div className="space-y-4">
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setPhotoConfig({ ...photoConfig, position: 'left' })}
                                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${photoConfig.position === 'left' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                        >
                                            Left
                                        </button>
                                        <button
                                            onClick={() => setPhotoConfig({ ...photoConfig, position: 'right' })}
                                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${photoConfig.position === 'right' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                        >
                                            Right
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-500">Size</span>
                                        <input
                                            type="range"
                                            min="50"
                                            max="150"
                                            value={photoConfig.scale}
                                            onChange={(e) => setPhotoConfig({ ...photoConfig, scale: parseInt(e.target.value) })}
                                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-500">Border</span>
                                        <div className="flex gap-2">
                                            {['none', 'thin', 'thick'].map((b) => (
                                                <button
                                                    key={b}
                                                    onClick={() => setPhotoConfig({ ...photoConfig, border: b as any })}
                                                    className={`px-3 py-1.5 rounded-lg border text-xs capitalize ${photoConfig.border === b ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white z-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        onClick={() => {
                            if (canvasRef.current) {
                                onSave(canvasRef.current.toDataURL('image/png'));
                            }
                        }}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {t('Save Strip Image')}
                    </button>
                </div>
            </div>
        </div>
    );
}
