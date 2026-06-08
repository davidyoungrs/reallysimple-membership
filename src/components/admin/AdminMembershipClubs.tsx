import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Loader2, Plus, Trash2, Edit2, Shield, Settings, ExternalLink, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminMembershipClubs() {
  const { getToken } = useAuth();
  
  // Data lists
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClub, setEditingClub] = useState<any | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [membershipNumberFormat, setMembershipNumberFormat] = useState('CLUB-{NUMBER}');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1d4ed8');
  const [textColor, setTextColor] = useState('#1f2937');
  const [backgroundColor, setBackgroundColor] = useState('#f3f4f6');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [adminInput, setAdminInput] = useState('');
  const [adminsList, setAdminsList] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch('/api/membership?resource=clubs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.clubs) {
        setClubs(result.clubs);
      }
    } catch (err) {
      console.error('Failed to load clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [getToken]);

  const handleOpenCreate = () => {
    setName('');
    setSlug('');
    setLogoUrl('');
    setMembershipNumberFormat('CLUB-{NUMBER}');
    setPrimaryColor('#2563eb');
    setSecondaryColor('#1d4ed8');
    setTextColor('#1f2937');
    setBackgroundColor('#f3f4f6');
    setFontFamily('Inter');
    setAdminsList([]);
    setAdminInput('');
    setEditingClub(null);
    setShowCreateModal(true);
    setError(null);
  };

  const handleOpenEdit = (club: any) => {
    setEditingClub(club);
    setName(club.name);
    setSlug(club.slug);
    setLogoUrl(club.logoUrl || '');
    setMembershipNumberFormat(club.membershipNumberFormat || 'CLUB-{NUMBER}');
    setPrimaryColor(club.brandingConfig.primaryColor);
    setSecondaryColor(club.brandingConfig.secondaryColor);
    setTextColor(club.brandingConfig.textColor);
    setBackgroundColor(club.brandingConfig.backgroundColor);
    setFontFamily(club.brandingConfig.fontFamily || 'Inter');
    
    // Admins need to be fetched, but we can default to empty and let details pull them
    setAdminsList([]);
    setAdminInput('');
    setShowCreateModal(true);
    setError(null);
    
    // Fetch details including admin list
    fetchClubDetails(club.id);
  };

  const fetchClubDetails = async (clubId: number) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=clubs&id=${clubId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.admins) {
        setAdminsList(result.admins.map((a: any) => a.clerkId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAdmin = () => {
    if (adminInput.trim() && !adminsList.includes(adminInput.trim())) {
      setAdminsList([...adminsList, adminInput.trim()]);
      setAdminInput('');
    }
  };

  const handleRemoveAdmin = (clerkId: string) => {
    setAdminsList(adminsList.filter(id => id !== clerkId));
  };

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    try {
      setSaving(true);
      setError(null);
      const token = await getToken();

      const payload = {
        id: editingClub?.id,
        name,
        slug,
        logoUrl,
        membershipNumberFormat,
        brandingConfig: {
          primaryColor,
          secondaryColor,
          textColor,
          backgroundColor,
          fontFamily,
        },
        admins: adminsList
      };

      const url = '/api/membership?resource=clubs';
      const method = editingClub ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save club');

      setShowCreateModal(false);
      fetchClubs();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClub = async (clubId: number) => {
    if (!window.confirm('Are you absolutely sure you want to delete this club? This will delete all templates, members, and passes!')) return;

    try {
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=clubs&id=${clubId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to delete club');
      }

      fetchClubs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete club');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Membership Clubs</h1>
          <p className="text-sm text-slate-500">Manage multi-club membership templates, branding, and administrators.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/10"
        >
          <Plus className="w-4 h-4" /> Create Club
        </button>
      </div>

      {/* Clubs Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <div key={club.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-550 border border-slate-100 p-2 flex items-center justify-center">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt="Logo" className="w-full h-full object-contain rounded" />
                  ) : (
                    <Shield className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenEdit(club)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit Branding"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClub(club.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Delete Club"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-extrabold text-base text-slate-900 leading-snug">{club.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">/{club.slug}</p>
              
              {/* Branding Preview */}
              <div className="flex items-center gap-1.5 mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Theme:</span>
                <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: club.brandingConfig.primaryColor }} title="Primary" />
                <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: club.brandingConfig.secondaryColor }} title="Secondary" />
                <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: club.brandingConfig.backgroundColor }} title="Bg" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
              <Link
                to={`/membership-admin/${club.slug}`}
                className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors border border-slate-200"
              >
                Dashboard <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}

        {clubs.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No membership clubs created yet.</p>
            <button onClick={handleOpenCreate} className="text-blue-600 hover:text-blue-700 text-xs font-bold mt-2">
              Add your first club
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CLUB MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] overflow-hidden flex flex-col text-left">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">{editingClub ? 'Edit Club Settings' : 'Create New Club'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClub} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">General Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Club Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. London Golf Club"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!editingClub) {
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                        }
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">URL Slug</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. london-golf"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL (Icon / Shield)</label>
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Membership ID Format</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LGC-{NUMBER}"
                      value={membershipNumberFormat}
                      onChange={(e) => setMembershipNumberFormat(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Use {"{NUMBER}"} as the auto-increment token (will render e.g. LGC-001).</p>
                  </div>
                </div>
              </div>

              {/* Branding Customizations */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Branding Config</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Secondary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white"
                    >
                      <option value="Inter">Inter (Sans)</option>
                      <option value="Outfit">Outfit (Round)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Playfair Display">Playfair Display (Serif)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Club Administrators */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Club Administrators</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Clerk User ID"
                      value={adminInput}
                      onChange={(e) => setAdminInput(e.target.value)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddAdmin}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                    >
                      Add Admin
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {adminsList.map((adminId) => (
                      <span key={adminId} className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-750 px-2.5 py-1 rounded-lg border border-slate-200">
                        {adminId}
                        <button type="button" onClick={() => handleRemoveAdmin(adminId)} className="text-slate-400 hover:text-red-500 font-bold">
                          ×
                        </button>
                      </span>
                    ))}
                    {adminsList.length === 0 && <span className="text-xs text-slate-400 italic">No custom administrators added. Only Super User can configure.</span>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end gap-3 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
