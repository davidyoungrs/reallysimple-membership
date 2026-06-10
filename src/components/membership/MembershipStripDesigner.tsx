import { useRef, useState, useEffect } from 'react';
import { type StripConfig } from '../../types.js';
import { Upload, X } from 'lucide-react';

interface MembershipStripDesignerProps {
  memberName: string;
  memberPhoto?: string;
  initialStripConfig?: StripConfig;
  isAdmin: boolean;
  onSave: (dataUrl: string, config: StripConfig) => void;
  onCancel: () => void;
}

const DEFAULT_STRIP_CONFIG: StripConfig = {
  bgType: 'color',
  bgColor: '#2563eb',
  bgGradient: ['#2563eb', '#1d4ed8'],
  bgFilters: { grayscale: 0, sepia: 0, opacity: 100 },
  textConfig: {
    showName: true,
    nameColor: '#ffffff',
    nameX: 40,
    nameY: 50,
    showTitle: false,
    titleColor: '#ffffff',
    titleX: 50,
    titleY: 70,
    showTagline: false,
    tagline: '',
    taglineColor: '#ffffff',
    taglineX: 50,
    taglineY: 85,
    align: 'left',
  },
  photoConfig: {
    show: true,
    position: 'left',
    x: 26,
    y: 50,
    scale: 100,
    border: 'thin',
  },
};

export function MembershipStripDesigner({
  memberName,
  memberPhoto,
  initialStripConfig,
  isAdmin,
  onSave,
  onCancel,
}: MembershipStripDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [config, setConfig] = useState<StripConfig>(() => {
    let initial = initialStripConfig || DEFAULT_STRIP_CONFIG;
    if (initial.photoConfig && initial.photoConfig.x === 22) {
      initial = {
        ...initial,
        photoConfig: {
          ...initial.photoConfig,
          x: 26
        }
      };
    }
    return initial;
  });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [profileImage, setProfileImage] = useState<HTMLImageElement | null>(null);

  // Load profile photo
  useEffect(() => {
    if (memberPhoto) {
      const img = new Image();
      if (memberPhoto.startsWith('http://') || memberPhoto.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => setProfileImage(img);
      img.src = memberPhoto;
    } else {
      setProfileImage(null);
    }
  }, [memberPhoto]);

  // Load custom background image if applicable
  useEffect(() => {
    // If the config has a background image, we can try to pre-load it
    // Note: For now, if we upload in-session, bgImage state handles it.
  }, []);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1125;
    const height = 369;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background
    if (config.bgType === 'color') {
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, width, height);
    } else if (config.bgType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, config.bgGradient?.[0] || '#2563eb');
      grad.addColorStop(1, config.bgGradient?.[1] || '#1d4ed8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (config.bgType === 'image' && bgImage) {
      const scale = Math.max(width / bgImage.width, height / bgImage.height);
      const x = width / 2 - (bgImage.width / 2) * scale;
      const y = height / 2 - (bgImage.height / 2) * scale;

      ctx.save();
      const filters = config.bgFilters || { grayscale: 0, sepia: 0, opacity: 100 };
      ctx.filter = `grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) opacity(${filters.opacity}%)`;
      ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
      ctx.restore();
    } else {
      // Fallback
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Member Photo
    if (config.photoConfig?.show && profileImage) {
      const size = 280 * ((config.photoConfig.scale || 100) / 100);
      const posX = width * ((config.photoConfig.x || 15) / 100) - size / 2;
      const posY = height * ((config.photoConfig.y || 50) / 100) - size / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(posX + size / 2, posY + size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(profileImage, posX, posY, size, size);
      ctx.restore();

      if (config.photoConfig.border !== 'none') {
        ctx.beginPath();
        ctx.arc(posX + size / 2, posY + size / 2, size / 2, 0, Math.PI * 2);
        ctx.lineWidth = config.photoConfig.border === 'thin' ? 6 : 14;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }

    // 3. Draw Member Name Text
    if (config.textConfig?.showName) {
      ctx.save();
      ctx.textAlign = config.textConfig.align || 'left';
      ctx.font = 'bold 70px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = config.textConfig.nameColor || '#ffffff';
      
      // Shadow for readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const nameXVal = width * ((config.textConfig.nameX || 50) / 100);
      const nameYVal = height * ((config.textConfig.nameY || 50) / 100) + 16;

      // Calculate dynamic maxWidth to prevent text overflow
      let maxWidth = width * 0.65;
      if (config.textConfig.align === 'center') {
          maxWidth = width - 100;
      } else if (config.textConfig.align === 'left') {
          maxWidth = width - nameXVal - 50;
      } else if (config.textConfig.align === 'right') {
          maxWidth = nameXVal - 50;
      }

      const lineHeight = 80;
      const textVal = memberName || 'Member Name';
      const words = textVal.split(' ');
      let line = '';
      const lines = [];

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const totalHeight = lines.length * lineHeight;
      const startY = nameYVal - totalHeight / 2 + lineHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), nameXVal, startY + (i * lineHeight));
      }

      ctx.restore();
    }
  };

  useEffect(() => {
    draw();
  }, [config, bgImage, profileImage, memberName]);

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          setBgImage(img);
          setConfig(prev => ({ ...prev, bgType: 'image' }));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      onSave(canvas.toDataURL('image/png'), config);
    } catch (err) {
      console.error('Failed to export canvas in MembershipStripDesigner (SecurityError/Tainted canvas):', err);
      alert("Could not save the strip image containing external photos due to security restrictions. Try saving without photos or using uploaded local files.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Strip Image Designer</h2>
            <p className="text-sm text-gray-500">
              {isAdmin 
                ? 'Design the layout and background of the membership wallet strip' 
                : 'Preview your membership pass strip image'}
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-8 bg-gray-50">
          {/* Canvas Wrapper */}
          <div className="w-full max-w-[800px] bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
            <div className="relative w-full aspect-[1125/369] bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>
            <p className="text-center text-xs text-gray-400 mt-2 font-medium">
              High Resolution Retina Canvas (1125 x 369)
            </p>
          </div>

          {/* Controls Panel */}
          {isAdmin && (
            <div className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Left Column: Background Controls */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-wider">
                  Background Settings
                </h3>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, bgType: 'color' }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-semibold transition-all ${
                      config.bgType === 'color' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, bgType: 'image' }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-semibold transition-all ${
                      config.bgType === 'image' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Faded Image
                  </button>
                </div>

                {config.bgType === 'color' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Pick Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={config.bgColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.bgColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                )}

                {config.bgType === 'image' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-500">Upload Banner Image</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBgImageUpload}
                        className="hidden"
                        id="bg-image-uploader"
                      />
                      <label
                        htmlFor="bg-image-uploader"
                        className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors cursor-pointer text-sm font-bold border border-gray-300"
                      >
                        <Upload className="w-4 h-4" /> Choose File
                      </label>
                      {bgImage && <span className="text-xs text-green-600 font-medium">Image Loaded ✓</span>}
                    </div>

                    {bgImage && (
                      <div className="space-y-2 pt-2">
                        <div>
                          <div className="flex justify-between text-xs font-bold text-gray-500">
                            <span>Image Opacity</span>
                            <span>{config.bgFilters?.opacity || 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={config.bgFilters?.opacity || 100}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              bgFilters: { ...prev.bgFilters, opacity: Number(e.target.value) }
                            }))}
                            className="w-full accent-blue-600"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-bold text-gray-500">
                            <span>Fading Filter (Grayscale)</span>
                            <span>{config.bgFilters?.grayscale || 0}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={config.bgFilters?.grayscale || 0}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              bgFilters: { ...prev.bgFilters, grayscale: Number(e.target.value) }
                            }))}
                            className="w-full accent-blue-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Overlay Controls */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-wider">
                  Layout & Overlays
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-600">Show Profile Photo</label>
                    <input
                      type="checkbox"
                      checked={config.photoConfig?.show}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        photoConfig: { ...prev.photoConfig, show: e.target.checked }
                      }))}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </div>

                  {config.photoConfig?.show && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500">Photo Position X (%)</label>
                        <input
                          type="number"
                          value={config.photoConfig.x}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            photoConfig: { ...prev.photoConfig, x: Number(e.target.value) }
                          }))}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500">Photo Size Scale</label>
                        <input
                          type="number"
                          value={config.photoConfig.scale}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            photoConfig: { ...prev.photoConfig, scale: Number(e.target.value) }
                          }))}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500">Photo Border</label>
                        <select
                          value={config.photoConfig.border}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            photoConfig: { ...prev.photoConfig, border: e.target.value as any }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                        >
                          <option value="none">None</option>
                          <option value="thin">Thin White</option>
                          <option value="thick">Thick White</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-600">Show Member Name</label>
                    <input
                      type="checkbox"
                      checked={config.textConfig?.showName}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        textConfig: { ...prev.textConfig, showName: e.target.checked }
                      }))}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </div>

                  {config.textConfig?.showName && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500">Name Position X (%)</label>
                          <input
                            type="number"
                            value={config.textConfig.nameX}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              textConfig: { ...prev.textConfig, nameX: Number(e.target.value) }
                            }))}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500">Name Position Y (%)</label>
                          <input
                            type="number"
                            value={config.textConfig.nameY}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              textConfig: { ...prev.textConfig, nameY: Number(e.target.value) }
                            }))}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500">Text Align</label>
                          <select
                            value={config.textConfig.align}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              textConfig: { ...prev.textConfig, align: e.target.value as any }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500">Font Color</label>
                          <input
                            type="color"
                            value={config.textConfig.nameColor}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              textConfig: { ...prev.textConfig, nameColor: e.target.value }
                            }))}
                            className="w-full h-9 border border-gray-300 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isAdmin && (
            <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                🔒 Protected Design Template
              </span>
              <p className="text-xs text-gray-500">
                The strip background and text positioning are locked by the Club Administrator.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white shrink-0">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-semibold shadow-md shadow-blue-600/10"
          >
            Save Strip Design
          </button>
        </div>
      </div>
    </div>
  );
}
