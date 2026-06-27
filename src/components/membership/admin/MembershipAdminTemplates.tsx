import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Loader2, Plus, Edit2, Layers, X, ShieldAlert, Upload, Trash2 } from 'lucide-react';
import { type ClubBrandingConfig } from '../../../types/membershipTypes.js';
import { Tooltip } from '../../Tooltip';

export function MembershipAdminTemplates() {
  const { club, branding, templates, fetchTemplates, loadingTemplates } = useOutletContext<{
    club: any;
    branding: ClubBrandingConfig;
    templates: any[];
    fetchTemplates: () => Promise<void>;
    loadingTemplates: boolean;
  }>();
  
  const { getToken } = useAuth();
  const { user } = useUser();
  const isSuperUser = user?.publicMetadata?.role === 'admin';

  // Edit / Create Form States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  
  // Fields
  const [name, setName] = useState('');
  const [membershipType, setMembershipType] = useState('Gold');
  const [durationMonths, setDurationMonths] = useState(12);
  const [isActive, setIsActive] = useState(true);
  
  // Design Fields
  const [walletBgColor, setWalletBgColor] = useState('#2563eb');
  const [walletFgColor, setWalletFgColor] = useState('#ffffff');
  const [walletLabelColor, setWalletLabelColor] = useState('#cccccc');
  const [showMemberPhoto, setShowMemberPhoto] = useState(true);
  const [showMemberName, setShowMemberName] = useState(true);
  const [showMembershipType, setShowMembershipType] = useState(true);
  const [showMembershipNumber, setShowMembershipNumber] = useState(true);
  const [showClubLogo, setShowClubLogo] = useState(true);
  const [showClubName, setShowClubName] = useState(true);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strip background configuration states
  const [stripBgType, setStripBgType] = useState<'match' | 'color' | 'image'>('match');
  const [stripBgColor, setStripBgColor] = useState('#2563eb');
  const [stripBgImageUrl, setStripBgImageUrl] = useState('');
  const [uploadingStripImage, setUploadingStripImage] = useState(false);
  const [backFields, setBackFields] = useState<Array<{ label: string; value: string; isLink?: boolean; linkText?: string; linkUrl?: string }>>([]);

  const updateBackField = (index: number, updates: any) => {
    setBackFields(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const newItem = { ...item, ...updates };
      if (updates.isLink === false) {
        newItem.value = newItem.linkText || '';
        newItem.linkText = '';
        newItem.linkUrl = '';
      } else if (newItem.isLink) {
        newItem.value = `[${newItem.linkText || ''}](${newItem.linkUrl || ''})`;
      }
      return newItem;
    }));
  };

  const handleStripImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingStripImage(true);
      setError(null);
      const token = await getToken();
      const uploadRes = await fetch(`/api/membership?action=upload&filename=strip_bg_${Date.now()}_${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: file
      });
      const data = await uploadRes.json();
      if (data.success && data.publicUrl) {
        setStripBgImageUrl(data.publicUrl);
      } else {
        throw new Error(data.error || 'Failed to upload strip background image');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingStripImage(false);
    }
  };


  const loading = loadingTemplates && templates.length === 0;

  const handleOpenCreate = () => {
    if (templates.length >= 6) return;
    setEditingTemplate(null);
    setName('');
    setMembershipType('Gold');
    setDurationMonths(12);
    setIsActive(true);
    setWalletBgColor('#2563eb');
    setWalletFgColor('#ffffff');
    setWalletLabelColor('#cccccc');
    setShowMemberPhoto(true);
    setShowMemberName(true);
    setShowMembershipType(true);
    setShowMembershipNumber(true);
    setShowClubLogo(true);
    setShowClubName(true);
    setFontFamily('Inter');
    setSelectedLocations([]);
    setStripBgType('match');
    setStripBgColor('#2563eb');
    setStripBgImageUrl('');
    setBackFields([]);
    setShowFormModal(true);
    setError(null);
  };

  const handleOpenEdit = (t: any) => {
    setEditingTemplate(t);
    setName(t.name);
    setMembershipType(t.membershipType);
    setDurationMonths(t.durationMonths);
    setIsActive(t.isActive);
    
    const config = t.cardConfig || {};
    setWalletBgColor(config.walletBackgroundColor || '#2563eb');
    setWalletFgColor(config.walletForegroundColor || '#ffffff');
    setWalletLabelColor(config.walletLabelColor || '#cccccc');
    setShowMemberPhoto(config.showMemberPhoto !== false);
    setShowMemberName(config.showMemberName !== false);
    setShowMembershipType(config.showMembershipType !== false);
    setShowMembershipNumber(config.showMembershipNumber !== false);
    setShowClubLogo(config.showClubLogo !== false);
    setShowClubName(config.showClubName !== false);
    setFontFamily(config.fontFamily || 'Inter');
    setSelectedLocations(config.locations || []);
    
    const s = config.stripConfig || {};
    setStripBgType(s.bgType || 'match');
    setStripBgColor(s.bgColor || '#2563eb');
    setStripBgImageUrl(s.bgImageUrl || '');
    
    const rawBackFields = config.backFields || [];
    const mappedBackFields = rawBackFields.map((field: any) => {
      const cleanValue = (field.value || '').trim();
      const mdLinkRegex = /^\[([^\]]+)\]\(((https?:\/\/[^\)]+)|(mailto:[^\)]+)|(tel:[^\)]+))\)$/;
      const match = cleanValue.match(mdLinkRegex);
      if (match) {
        return {
          label: field.label,
          value: cleanValue,
          isLink: true,
          linkText: match[1],
          linkUrl: match[2],
        };
      }
      return {
        label: field.label,
        value: cleanValue,
        isLink: false,
        linkText: '',
        linkUrl: '',
      };
    });
    setBackFields(mappedBackFields);

    setShowFormModal(true);
    setError(null);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !membershipType) return;

    try {
      setSaving(true);
      setError(null);
      const token = await getToken();

      const cardConfig = {
        walletBackgroundColor: walletBgColor,
        walletForegroundColor: walletFgColor,
        walletLabelColor: walletLabelColor,
        showMemberPhoto,
        showMemberName,
        showMembershipType,
        showMembershipNumber,
        showClubLogo,
        showClubName,
        fontFamily,
        locations: selectedLocations,
        backFields: backFields.map(f => ({ label: f.label, value: f.value })),
        stripConfig: (() => {
          let sConfig = editingTemplate?.cardConfig?.stripConfig || {
            bgType: 'color',
            bgColor: walletBgColor,
            bgGradient: [],
            bgFilters: { grayscale: 0, sepia: 0, opacity: 100 },
            textConfig: {
              showName: showMemberName,
              nameColor: walletFgColor,
              nameX: 40,
              nameY: 50,
              showTitle: false,
              titleColor: walletFgColor,
              titleX: 50,
              titleY: 70,
              showTagline: false,
              tagline: '',
              taglineColor: walletFgColor,
              taglineX: 50,
              taglineY: 85,
              align: 'left',
            },
            photoConfig: {
              show: showMemberPhoto,
              position: 'left',
              x: 23,
              y: 50,
              scale: 90,
              border: 'thin',
            },
          };

          // Apply user selections for strip background
          sConfig.bgType = stripBgType === 'match' ? 'color' : stripBgType;
          sConfig.bgColor = stripBgType === 'match' ? walletBgColor : stripBgColor;
          sConfig.bgImageUrl = stripBgType === 'image' ? stripBgImageUrl : undefined;

          // Sync options
          if (sConfig.textConfig) {
            sConfig.textConfig.showName = showMemberName;
            sConfig.textConfig.nameColor = walletFgColor;
          }
          if (sConfig.photoConfig) {
            sConfig.photoConfig.show = showMemberPhoto;
          }

          if (sConfig.photoConfig && [22, 23, 26, 32].includes(sConfig.photoConfig.x)) {
            sConfig = {
              ...sConfig,
              photoConfig: {
                ...sConfig.photoConfig,
                x: 23,
                scale: sConfig.photoConfig.scale === 100 ? 90 : sConfig.photoConfig.scale
              }
            };
          }
          if (sConfig.textConfig && [38, 40, 48].includes(sConfig.textConfig.nameX)) {
            sConfig = {
              ...sConfig,
              textConfig: {
                ...sConfig.textConfig,
                nameX: 40
              }
            };
          }
          return sConfig;
        })()
      };

      const payload = {
        id: editingTemplate?.id,
        clubId: club.id,
        name,
        membershipType,
        durationMonths,
        isActive,
        cardConfig,
      };

      const url = '/api/membership?resource=templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save template');

      setShowFormModal(false);
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template: any) => {
    if (!isSuperUser) return;
    try {
      const token = await getToken();
      const res = await fetch('/api/membership?resource=templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: template.id,
          isActive: !template.isActive
        })
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (template: any) => {
    if (!isSuperUser) return;
    if (!window.confirm(`Are you sure you want to delete the template "${template.name}"?\n\nWARNING: This will permanently delete the template and all membership cards associated with it. This action cannot be undone.`)) {
      return;
    }
    
    try {
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=templates&id=${template.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      } else {
        throw new Error(data.error || 'Failed to delete template');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete template');
    }
  };


  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white">Card Templates</h1>
          <p className="text-slate-400 text-sm">
            {isSuperUser 
              ? 'Configure card templates, color schemes, and layout policies.' 
              : 'View available membership card design templates.'}
          </p>
        </div>
        {isSuperUser && (
          <Tooltip content={templates.length >= 6 ? 'Maximum limit of 6 templates reached. Delete an existing template to create a new one.' : 'Create a new membership card design template.'} position="left">
            <button
              onClick={handleOpenCreate}
              disabled={templates.length >= 6}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${
                templates.length >= 6 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-750' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
              }`}
            >
              <Plus className="w-4 h-4" /> Create Template {templates.length >= 6 && '(Limit Reached)'}
            </button>
          </Tooltip>
        )}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center text-blue-400">
                  <Layers className="w-5 h-5" />
                </div>
                
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border cursor-pointer ${
                  t.isActive 
                    ? 'bg-emerald-950/45 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-950/45 border-slate-800 text-slate-500'
                }`}
                onClick={() => handleToggleActive(t)}
                title={isSuperUser ? 'Click to toggle status' : undefined}
                >
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="font-extrabold text-base text-white leading-snug">{t.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Level: {t.membershipType}</p>
              
              <div className="space-y-1.5 mt-4 text-xs text-slate-400">
                <p>Card Valid Duration: <span className="text-slate-200 font-bold">{t.durationMonths} Months</span></p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span>Pass Palette:</span>
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-800 shadow-sm" style={{ backgroundColor: t.cardConfig?.walletBackgroundColor }} title="Bg" />
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-800 shadow-sm" style={{ backgroundColor: t.cardConfig?.walletForegroundColor }} title="Fg" />
                </div>
              </div>
            </div>

            {isSuperUser && (
              <div className="mt-6 pt-4 border-t border-slate-850 flex gap-2">
                <Tooltip content="Configure styling, colors, strip imagery, and back-of-pass fields." position="top" className="flex-1">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-800 text-slate-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Configure
                  </button>
                </Tooltip>
                <Tooltip content="Permanently delete this card template and any associated designs." position="top">
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(t)}
                    className="px-3 py-2 bg-slate-900 hover:bg-red-950/20 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900/50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
            <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No card design templates available yet.</p>
            {isSuperUser && (
              <button onClick={handleOpenCreate} className="text-blue-400 hover:text-blue-300 text-xs font-bold mt-2">
                Add your first template
              </button>
            )}
          </div>
        )}
      </div>

      {/* TEMPLATE EDITOR MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] overflow-hidden flex flex-col text-left">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-900 shrink-0">
              <h2 className="text-base font-bold text-white">
                {editingTemplate ? 'Edit Card Template' : 'Create Card Template'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Template Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-350 mb-1">Template Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gold Member 2025"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1">Membership Type Level</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gold"
                      value={membershipType}
                      onChange={(e) => setMembershipType(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1">Validity (Months)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Wallet Card Style */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Wallet Pass Style</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pass Background</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={walletBgColor}
                        onChange={(e) => setWalletBgColor(e.target.value)}
                        className="w-8 h-8 border border-slate-800 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={walletBgColor}
                        onChange={(e) => setWalletBgColor(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pass Text (Foreground)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={walletFgColor}
                        onChange={(e) => setWalletFgColor(e.target.value)}
                        className="w-8 h-8 border border-slate-800 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={walletFgColor}
                        onChange={(e) => setWalletFgColor(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pass Labels Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={walletLabelColor}
                        onChange={(e) => setWalletLabelColor(e.target.value)}
                        className="w-8 h-8 border border-slate-800 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={walletLabelColor}
                        onChange={(e) => setWalletLabelColor(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-white"
                      />
                  </div>
                </div>
              </div>
            </div>

            {/* Strip Image Background Style */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Strip Image Background</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1">Strip Background Type</label>
                    <select
                      value={stripBgType}
                      onChange={(e) => setStripBgType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="match">Match Pass Background</option>
                      <option value="color">Custom Solid Color</option>
                      <option value="image">Custom Background Image</option>
                    </select>
                  </div>

                  {stripBgType === 'color' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1">Strip Background Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={stripBgColor}
                          onChange={(e) => setStripBgColor(e.target.value)}
                          className="w-8 h-8 border border-slate-800 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={stripBgColor}
                          onChange={(e) => setStripBgColor(e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-white"
                        />
                      </div>
                    </div>
                  )}

                  {stripBgType === 'image' && (
                    <div className="col-span-2 space-y-2">
                      <label className="block text-xs font-semibold text-slate-350">Upload Strip Background Image</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStripImageUpload}
                          className="hidden"
                          id="strip-bg-image-uploader"
                        />
                        <label
                          htmlFor="strip-bg-image-uploader"
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                        >
                          <Upload className="w-4 h-4" /> {uploadingStripImage ? 'Uploading...' : 'Choose Background Image'}
                        </label>
                        {stripBgImageUrl && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-400 font-medium">Image Uploaded!</span>
                            <img src={stripBgImageUrl} alt="Preview" className="w-8 h-8 object-cover rounded border border-slate-800" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Layout Flags */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Layout Rules</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-350">Display Member Photo</label>
                    <input
                      type="checkbox"
                      checked={showMemberPhoto}
                      onChange={(e) => setShowMemberPhoto(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-350">Display Member Name</label>
                    <input
                      type="checkbox"
                      checked={showMemberName}
                      onChange={(e) => setShowMemberName(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-350">Display Membership Level</label>
                    <input
                      type="checkbox"
                      checked={showMembershipType}
                      onChange={(e) => setShowMembershipType(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-350">Display Member Number</label>
                    <input
                      type="checkbox"
                      checked={showMembershipNumber}
                      onChange={(e) => setShowMembershipNumber(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-350">Display Club Logo</label>
                    <input
                      type="checkbox"
                      checked={showClubLogo}
                      onChange={(e) => setShowClubLogo(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-350">Display Club Name</label>
                    <input
                      type="checkbox"
                      checked={showClubName}
                      onChange={(e) => setShowClubName(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-350 mb-1">Pass Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="Inter">Inter (Default)</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Roboto">Roboto</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Geofenced Notifications */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Geofenced Notifications</h3>
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Select which master club locations should trigger a lock-screen notification when a member with this card approaches.</p>
                  {(!branding.locations || branding.locations.length === 0) ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 italic">No master locations configured for this club.</p>
                      <p className="text-[10px] text-slate-600 mt-1">Go back to the main Clubs page and edit the club to add Master Geofenced Locations.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {branding.locations.map((loc: any) => (
                        <label key={loc.id} className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes(loc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLocations([...selectedLocations, loc.id]);
                              } else {
                                setSelectedLocations(selectedLocations.filter(id => id !== loc.id));
                              }
                            }}
                            className="mt-0.5 w-4 h-4 accent-blue-500 rounded bg-slate-900 border-slate-700"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-200">{loc.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5"><span className="font-semibold text-slate-500">Message:</span> "{loc.relevantText}"</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Back of Card Info Fields */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Back of Card Fields</h3>
                
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Add custom fields to display on the back of the Apple Wallet pass (and as generic details on Android).
                  </p>

                  <div className="space-y-3">
                    {backFields.map((field, index) => (
                      <div key={index} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4 relative group">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => setBackFields(prev => prev.filter((_, i) => i !== index))}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                          >
                            Remove Field
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Field Label</label>
                            <input
                              type="text"
                              value={field.label}
                              placeholder="e.g. Terms of Use, Club Rules, Website"
                              onChange={(e) => {
                                const val = e.target.value;
                                setBackFields(prev => prev.map((item, idx) => idx === index ? { ...item, label: val } : item));
                              }}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Field Type</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateBackField(index, { isLink: false })}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                                  !field.isLink
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                                }`}
                              >
                                Plain Text
                              </button>
                              <button
                                type="button"
                                onClick={() => updateBackField(index, { isLink: true })}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                                  field.isLink
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                                }`}
                              >
                                Web / Contact Link
                              </button>
                            </div>
                          </div>
                          
                          {!field.isLink ? (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Field Value (Plain Text)</label>
                              <textarea
                                value={field.value || ''}
                                rows={3}
                                placeholder="Type details here..."
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBackFields(prev => prev.map((item, idx) => idx === index ? { ...item, value: val } : item));
                                }}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                                required
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Link Text</label>
                                <input
                                  type="text"
                                  value={field.linkText || ''}
                                  placeholder="e.g. Visit Club Website"
                                  onChange={(e) => updateBackField(index, { linkText: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Link URL / Address</label>
                                <input
                                  type="text"
                                  value={field.linkUrl || ''}
                                  placeholder="e.g. https://domain.com, mailto:info@domain.com"
                                  onChange={(e) => updateBackField(index, { linkUrl: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                                  required
                                />
                              </div>
                              <p className="md:col-span-2 text-[10px] text-slate-500 italic mt-1 leading-normal">
                                Note: On Apple devices, this is rendered as a clean clickable text link. On Android devices, it renders as &quot;{field.linkText || 'Link Text'}: {field.linkUrl || 'URL'}&quot; to maintain cross-platform clickability.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {backFields.length === 0 && (
                      <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl py-6 text-center text-slate-500 text-xs italic">
                        No custom back-of-card fields defined yet.
                      </div>
                    )}

                    {backFields.length < 8 && (
                      <button
                        type="button"
                        onClick={() => setBackFields(prev => [...prev, { label: '', value: '', isLink: false, linkText: '', linkUrl: '' }])}
                        className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-blue-400 rounded-xl border border-slate-800 border-dashed transition-all cursor-pointer"
                      >
                        + Add Custom Back Field
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit / Actions */}
              <div className="pt-4 flex justify-end gap-2.5 bg-slate-900 border-t border-slate-850 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <Tooltip content="Save all configuration and card design adjustments to the database." position="top">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Template
                  </button>
                </Tooltip>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
