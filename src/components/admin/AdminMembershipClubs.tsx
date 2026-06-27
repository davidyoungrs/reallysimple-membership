import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Loader2, Plus, Trash2, Edit2, Shield, ExternalLink, ShieldAlert, Upload, Lock, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../Tooltip';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
interface ClubCardProps {
  club: any;
  isSuperUser: boolean;
  handleOpenEdit: (club: any) => void;
  handleDeleteClub: (clubId: number) => void;
  handleToggleSuspension: (club: any) => void;
}

function ClubCard({ club, isSuperUser, handleOpenEdit, handleDeleteClub, handleToggleSuspension }: ClubCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: club.id });

  const style = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2 items-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
              {club.logoUrl ? (
                <img src={club.logoUrl} alt="Logo" className="w-full h-full object-contain rounded" />
              ) : (
                <Shield className="w-6 h-6 text-slate-400" />
              )}
            </div>
            {club.isSuspended && (
              <span className="px-2 py-0.5 text-[9px] font-black tracking-wider bg-red-50 text-red-755 border border-red-200 rounded-md uppercase">
                Suspended
              </span>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-1 items-center">
            {/* Drag Handle */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <Tooltip content="Edit club branding, template fields, and metadata settings." position="top">
              <button
                type="button"
                onClick={() => handleOpenEdit(club)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </Tooltip>
            {isSuperUser ? (
              <button
                type="button"
                onClick={() => handleDeleteClub(club.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Delete Club"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="p-2 text-slate-200 cursor-not-allowed"
                title="Only Super Users can delete clubs"
              >
                <Trash2 className="w-4 h-4 opacity-30" />
              </button>
            )}
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
        <Tooltip 
          content={isSuperUser 
            ? "Suspend or activate this club. Suspended clubs lock out club admins and render warning messages on public wallet cards." 
            : "Only Super Users can manage club suspension. Suspended clubs lock out club admins and render warning messages on public wallet cards."
          } 
          position="top"
        >
          {isSuperUser ? (
            <button
              type="button"
              onClick={() => handleToggleSuspension(club)}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-colors border ${
                club.isSuspended
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-250'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-250'
              }`}
            >
              {club.isSuspended ? 'Activate' : 'Suspend'}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="py-2 px-3 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-350 cursor-not-allowed"
            >
              {club.isSuspended ? 'Suspended' : 'Active'}
            </button>
          )}
        </Tooltip>
      </div>
    </div>
  );
}


export function AdminMembershipClubs() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const superuserEmail = import.meta.env.VITE_SUPERUSER_EMAIL || 'd.j.young@hotmail.co.uk';
  const isSuperUser = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === superuserEmail.toLowerCase() || 
                      user?.publicMetadata?.role === 'super_admin';
  
  // Data lists
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sensors for drag-and-drop reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveNewOrder = async (reorderedClubs: any[]) => {
    try {
      const token = await getToken();
      const orderPayload = reorderedClubs.map((club, index) => ({
        id: club.id,
        sortOrder: index + 1
      }));

      const res = await fetch('/api/membership?resource=clubs&action=reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ order: orderPayload })
      });

      if (!res.ok) {
        throw new Error('Failed to save new order');
      }
    } catch (err) {
      console.error('Failed to save new order:', err);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setClubs((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      
      saveNewOrder(reordered);
      return reordered;
    });
  };
  
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
  const [locations, setLocations] = useState<any[]>([]);
  const [adminInput, setAdminInput] = useState('');
  const [adminsList, setAdminsList] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);

  const handleLogoUploadFile = async (file: File) => {
    try {
      setUploadingLogo(true);
      setError(null);
      const token = await getToken();

      const uploadRes = await fetch(`/api/membership?action=upload&filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          Authorization: `Bearer ${token}`
        },
        body: file
      });

      const { publicUrl } = await uploadRes.json();
      if (!publicUrl) throw new Error('Logo upload failed');

      setLogoUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleLogoUploadFile(file);
    }
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = () => {
    setIsDraggingLogo(false);
  };

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleLogoUploadFile(file);
    }
  };

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
  }, []);

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
    setLocations([]);
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
    setLocations(club.brandingConfig.locations || []);
    
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
        setAdminsList(result.admins.map((a: any) => a.clerkId || a.email));
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
          locations,
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

  const handleToggleSuspension = async (club: any) => {
    const actionText = club.isSuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} "${club.name}"?`)) return;

    try {
      const token = await getToken();
      const payload = {
        id: club.id,
        name: club.name,
        slug: club.slug,
        logoUrl: club.logoUrl,
        brandingConfig: club.brandingConfig,
        membershipNumberFormat: club.membershipNumberFormat,
        isSuspended: !club.isSuspended
      };

      const res = await fetch('/api/membership?resource=clubs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || `Failed to ${actionText} club`);
      }

      fetchClubs();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionText} club`);
    }
  };

  const getFormatPreview = (fmt: string) => {
    let result = fmt || '{NUMBER}';
    const cleanSlug = slug || 'london-golf';
    result = result.replace(/\{CLUB\}/g, cleanSlug.toUpperCase());
    result = result.replace(/\{TYPE\}/g, 'GLD');
    const now = new Date();
    result = result.replace(/\{YYYY\}/g, String(now.getFullYear()));
    result = result.replace(/\{YY\}/g, String(now.getFullYear()).slice(-2));
    result = result.replace(/\{MM\}/g, String(now.getMonth() + 1).padStart(2, '0'));
    
    const numberRegex = /\{NUMBER(?::(\d+))?\}/g;
    result = result.replace(numberRegex, (_, paddingStr) => {
      const padding = paddingStr ? parseInt(paddingStr, 10) : 3;
      return String(12).padStart(padding, '0');
    });
    return result;
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
        {isSuperUser ? (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/10"
          >
            <Plus className="w-4 h-4" /> Create Club
          </button>
        ) : (
          <button
            disabled
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-sm font-bold cursor-not-allowed"
            title="Only Super Users can create new clubs"
          >
            <Lock className="w-4.5 h-4.5 text-slate-450" /> Create Club
          </button>
        )}
      </div>

      {/* Clubs Directory Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={clubs.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                isSuperUser={isSuperUser}
                handleOpenEdit={handleOpenEdit}
                handleDeleteClub={handleDeleteClub}
                handleToggleSuspension={handleToggleSuspension}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

        {clubs.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No membership clubs created yet.</p>
            <button onClick={handleOpenCreate} className="text-blue-600 hover:text-blue-700 text-xs font-bold mt-2">
              Add your first club
            </button>
          </div>
        )}


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
                      disabled={!isSuperUser}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">Club Logo</label>
                    
                    {/* Drag and Drop Zone / Preview */}
                    <div
                      onDragOver={handleLogoDragOver}
                      onDragLeave={handleLogoDragLeave}
                      onDrop={handleLogoDrop}
                      className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all ${
                        isDraggingLogo
                          ? 'border-blue-500 bg-blue-50/50'
                          : logoUrl
                          ? 'border-slate-200 bg-slate-50/20'
                          : 'border-slate-300 hover:border-slate-400 bg-slate-550/50'
                      }`}
                    >
                      {uploadingLogo ? (
                        <div className="flex flex-col items-center justify-center py-4">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                          <span className="text-xs text-slate-500 font-medium">Uploading logo...</span>
                        </div>
                      ) : logoUrl ? (
                        <div className="flex items-center gap-4 w-full px-2">
                          <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shrink-0 shadow-sm">
                            <img src={logoUrl} alt="Club Logo Preview" className="w-full h-full object-contain rounded" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{logoUrl.split('/').pop()}</p>
                            <p className="text-[10px] text-slate-400">Successfully uploaded</p>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="logo-changer"
                            />
                            <label
                              htmlFor="logo-changer"
                              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
                            >
                              Change
                            </label>
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-100/70"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-uploader"
                          />
                          <label
                            htmlFor="logo-uploader"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-xs font-bold text-slate-700">Drag & drop logo here, or <span className="text-blue-600 hover:underline">browse</span></p>
                            <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, GIF, WEBP up to 2MB</p>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Toggle URL Input */}
                    <div className="flex justify-between items-center px-1">
                      <button
                        type="button"
                        onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {showLogoUrlInput ? 'Hide Logo URL input' : 'Or paste a logo URL instead'}
                      </button>
                    </div>

                    {/* Logo URL Input (optional/toggled) */}
                    {showLogoUrlInput && (
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500 outline-none animate-in slide-in-from-top-1 duration-200"
                      />
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Tooltip content="Rule to auto-generate membership IDs (e.g. {CLUB}-{YYYY}-{NUMBER}). Click badges below to append dynamic tokens." position="top" className="block w-fit">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Membership ID Format</label>
                    </Tooltip>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LGC-{NUMBER}"
                      value={membershipNumberFormat}
                      onChange={(e) => setMembershipNumberFormat(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    
                    {/* Live Preview Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Live Preview (Gold, #12)</span>
                        <code className="text-sm font-mono font-bold text-slate-700">{getFormatPreview(membershipNumberFormat)}</code>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded font-bold">Generated ID</span>
                    </div>

                    {/* Token helper badges */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-450 block mb-1">Click dynamic token to insert:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { token: '{CLUB}', label: 'Club Slug' },
                          { token: '{TYPE}', label: 'Tier/Level' },
                          { token: '{YYYY}', label: 'Year (YYYY)' },
                          { token: '{YY}', label: 'Year (YY)' },
                          { token: '{MM}', label: 'Month (MM)' },
                          { token: '{NUMBER:3}', label: '# (001)' },
                          { token: '{NUMBER:4}', label: '# (0001)' },
                          { token: '{NUMBER:5}', label: '# (00001)' },
                        ].map(({ token, label }) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => {
                              setMembershipNumberFormat(prev => {
                                if (prev.includes('{NUMBER}') && token.startsWith('{NUMBER:')) {
                                  return prev.replace('{NUMBER}', token);
                                }
                                return prev + token;
                              });
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                            title={label}
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    </div>
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

              {/* Master Geofenced Locations */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-1">
                  <Tooltip content="Assign physical geofences to this club. Apple Wallet passes will trigger lock screen notifications when members walk within range." position="top">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master Geofenced Locations</h3>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={() => {
                      setLocations([...locations, {
                        id: crypto.randomUUID(),
                        name: 'New Location',
                        latitude: 0,
                        longitude: 0,
                        relevantText: 'Welcome!'
                      }]);
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Location
                  </button>
                </div>
                
                <div className="space-y-3">
                  {locations.map((loc, idx) => (
                    <div key={loc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => setLocations(locations.filter(l => l.id !== loc.id))}
                        className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="grid grid-cols-2 gap-3 pr-6">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Location Name</label>
                          <input
                            type="text"
                            value={loc.name}
                            onChange={(e) => {
                              const newLocs = [...locations];
                              newLocs[idx].name = e.target.value;
                              setLocations(newLocs);
                            }}
                            className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={loc.latitude}
                            onChange={(e) => {
                              const newLocs = [...locations];
                              newLocs[idx].latitude = parseFloat(e.target.value) || 0;
                              setLocations(newLocs);
                            }}
                            className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={loc.longitude}
                            onChange={(e) => {
                              const newLocs = [...locations];
                              newLocs[idx].longitude = parseFloat(e.target.value) || 0;
                              setLocations(newLocs);
                            }}
                            className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Lock-screen Notification Message</label>
                          <input
                            type="text"
                            value={loc.relevantText}
                            onChange={(e) => {
                              const newLocs = [...locations];
                              newLocs[idx].relevantText = e.target.value;
                              setLocations(newLocs);
                            }}
                            className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {locations.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No master locations defined. Add locations here to make them available for templates.</p>
                  )}
                </div>
              </div>

              {/* Club Administrators (Super User only) */}
              {isSuperUser && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Club Administrators</h3>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Clerk User ID (user_...) or Email Address"
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
                          {adminId.includes('@') ? `${adminId} (Pending)` : adminId}
                          <button type="button" onClick={() => handleRemoveAdmin(adminId)} className="text-slate-400 hover:text-red-500 font-bold">
                            ×
                          </button>
                        </span>
                      ))}
                      {adminsList.length === 0 && <span className="text-xs text-slate-400 italic">No custom administrators added. Only Super User can configure.</span>}
                    </div>
                  </div>
                </div>
              )}

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
