import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Loader2, Plus, Edit2, Layers, X, ShieldAlert } from 'lucide-react';
import { type ClubBrandingConfig } from '../../../types/membershipTypes.js';

export function MembershipAdminTemplates() {
  const { club } = useOutletContext<{ club: any; branding: ClubBrandingConfig }>();
  const { getToken } = useAuth();
  const { user } = useUser();
  const isSuperUser = user?.publicMetadata?.role === 'admin';

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    if (!club) return;
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=templates&clubId=${club.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.templates) {
        setTemplates(result.templates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [club]);

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
          if (sConfig.photoConfig && (sConfig.photoConfig.x === 22 || sConfig.photoConfig.x === 26 || sConfig.photoConfig.x === 32)) {
            sConfig = {
              ...sConfig,
              photoConfig: {
                ...sConfig.photoConfig,
                x: 23,
                scale: sConfig.photoConfig.scale === 100 ? 90 : sConfig.photoConfig.scale
              }
            };
          }
          if (sConfig.textConfig && (sConfig.textConfig.nameX === 38 || sConfig.textConfig.nameX === 48)) {
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
          <button
            onClick={handleOpenCreate}
            disabled={templates.length >= 6}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${
              templates.length >= 6 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-750' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
            }`}
            title={templates.length >= 6 ? 'Maximum limit of 6 templates reached' : undefined}
          >
            <Plus className="w-4 h-4" /> Create Template {templates.length >= 6 && '(Limit Reached)'}
          </button>
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
              <div className="mt-6 pt-4 border-t border-slate-850">
                <button
                  onClick={() => handleOpenEdit(t)}
                  className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Configure Template
                </button>
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

              {/* Submit / Actions */}
              <div className="pt-4 flex justify-end gap-2.5 bg-slate-900 border-t border-slate-850 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
