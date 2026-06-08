import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { MembershipCardPreview } from './MembershipCardPreview.jsx';
import { MembershipStripDesigner } from './MembershipStripDesigner.jsx';
import { type MembershipCardConfig } from '../../types/membershipTypes.js';
import { type StripConfig } from '../../types.js';
import { Loader2, Upload, Sparkles, CreditCard, Check } from 'lucide-react';

export function MembershipCardCreator() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const isSuperUser = user?.publicMetadata?.role === 'admin';

  // Club & Template selections
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Form Fields
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhoto, setMemberPhoto] = useState('');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [slug, setSlug] = useState('');
  
  // Custom design overrides
  const [cardConfig, setCardConfig] = useState<MembershipCardConfig | null>(null);
  const [stripImageUrl, setStripImageUrl] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showStripDesigner, setShowStripDesigner] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [generatedPasses, setGeneratedPasses] = useState<{ appleUrl?: string; googleUrl?: string } | null>(null);

  // Fetch clubs user has access to
  useEffect(() => {
    async function loadClubs() {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch('/api/membership?resource=clubs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.clubs) {
          setClubs(result.clubs);
          if (result.clubs.length > 0) {
            setSelectedClub(result.clubs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load clubs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClubs();
  }, [getToken]);

  // Fetch templates when club changes
  useEffect(() => {
    async function loadTemplates() {
      if (!selectedClub) return;
      try {
        const token = await getToken();
        const res = await fetch(`/api/membership?resource=templates&clubId=${selectedClub.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.templates) {
          setTemplates(result.templates);
          if (result.templates.length > 0) {
            setSelectedTemplate(result.templates[0]);
          } else {
            setSelectedTemplate(null);
            setCardConfig(null);
          }
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    }
    loadTemplates();
  }, [selectedClub, getToken]);

  // Load template config when template changes
  useEffect(() => {
    if (selectedTemplate) {
      setCardConfig(selectedTemplate.cardConfig);
      setStripImageUrl('');
    }
  }, [selectedTemplate]);



  // Upload image to R2
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const token = await getToken();
      
      // 1. Get presigned R2 upload URL
      const presignRes = await fetch(`/api/membership?action=presign&filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { uploadUrl, publicUrl } = await presignRes.json();

      if (!uploadUrl) throw new Error('Could not get upload url');

      // 2. Upload file directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadRes.ok) throw new Error('Upload to R2 failed');

      setMemberPhoto(publicUrl);
      setFeedback({ type: 'success', message: 'Photo uploaded successfully' });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Photo upload failed' });
    } finally {
      setUploading(false);
    }
  };

  // Generate the Canvas Strip Banner locally on the fly
  const generateStripImageBlob = async (configToUse: StripConfig): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      const width = 1125;
      const height = 369;
      canvas.width = width;
      canvas.height = height;

      // Draw background
      if (configToUse.bgType === 'color') {
        ctx.fillStyle = configToUse.bgColor;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw photo
      const drawTextAndResolve = () => {
        // Draw Name
        if (configToUse.textConfig?.showName) {
          ctx.font = 'bold 70px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = configToUse.textConfig.nameColor || '#ffffff';
          ctx.textAlign = configToUse.textConfig.align || 'left';
          
          const x = width * ((configToUse.textConfig.nameX || 50) / 100);
          const y = height * ((configToUse.textConfig.nameY || 50) / 100) + 24;
          ctx.fillText(memberName || 'Member Name', x, y);
        }

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      };

      if (configToUse.photoConfig?.show && memberPhoto) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = memberPhoto;
        img.onload = () => {
          const size = 280 * ((configToUse.photoConfig.scale || 100) / 100);
          const posX = width * ((configToUse.photoConfig.x || 15) / 100) - size / 2;
          const posY = height * ((configToUse.photoConfig.y || 50) / 100) - size / 2;

          ctx.save();
          ctx.beginPath();
          ctx.arc(posX + size / 2, posY + size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, posX, posY, size, size);
          ctx.restore();

          if (configToUse.photoConfig.border !== 'none') {
            ctx.beginPath();
            ctx.arc(posX + size / 2, posY + size / 2, size / 2, 0, Math.PI * 2);
            ctx.lineWidth = configToUse.photoConfig.border === 'thin' ? 6 : 14;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          }
          drawTextAndResolve();
        };
        img.onerror = () => drawTextAndResolve();
      } else {
        drawTextAndResolve();
      }
    });
  };

  const handleSaveMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      setSaving(true);
      setFeedback(null);
      const token = await getToken();

      // 1. Generate & Upload Strip Banner to R2 first
      let uploadedStripUrl = stripImageUrl;
      if (cardConfig?.stripConfig) {
        const stripBlob = await generateStripImageBlob(cardConfig.stripConfig);
        if (stripBlob) {
          const presignRes = await fetch(`/api/membership?action=presign&filename=strip_${Date.now()}.png&contentType=image/png`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const { uploadUrl, publicUrl } = await presignRes.json();
          if (uploadUrl) {
            await fetch(uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'image/png' },
              body: stripBlob
            });
            uploadedStripUrl = publicUrl;
            setStripImageUrl(publicUrl);
          }
        }
      }

      // 2. Save Membership record to Database
      const payload = {
        templateId: selectedTemplate.id,
        memberName,
        memberEmail,
        memberPhoto,
        stripImageUrl: uploadedStripUrl,
        membershipNumber: membershipNumber || undefined,
        slug: slug || undefined,
        cardConfig
      };

      const saveRes = await fetch('/api/membership?resource=memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await saveRes.json();
      if (!saveRes.ok) throw new Error(result.error || 'Failed to save card');

      setFeedback({ type: 'success', message: 'Membership Card generated successfully!' });
      
      const host = window.location.origin;
      setGeneratedPasses({
        appleUrl: `${host}/api/membership-passes?type=apple&slug=${result.membership.slug}`,
        googleUrl: `${host}/api/membership-passes?type=google&slug=${result.membership.slug}`
      });

    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Failed to save card' });
    } finally {
      setSaving(false);
    }
  };

  const downloadAppleWallet = () => {
    if (generatedPasses?.appleUrl) {
      window.open(generatedPasses.appleUrl, '_blank');
    }
  };

  const downloadGoogleWallet = async () => {
    if (generatedPasses?.googleUrl) {
      try {
        const res = await fetch(generatedPasses.googleUrl);
        const data = await res.json();
        if (data.saveUrl) {
          window.open(data.saveUrl, '_blank');
        }
      } catch (err) {
        console.error('Failed to generate Google Wallet link', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Editor Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 flex flex-col text-left">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Membership Card Creator
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Select your club and fill in details to create Wallet-compatible membership cards.
            </p>
          </div>

          <form onSubmit={handleSaveMembership} className="space-y-6">
            {/* Club and Template Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Club Name</label>
                <select
                  value={selectedClub?.id || ''}
                  onChange={(e) => {
                    const c = clubs.find(cl => cl.id === Number(e.target.value));
                    setSelectedClub(c || null);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-semibold"
                >
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Card Template</label>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const t = templates.find(temp => temp.id === Number(e.target.value));
                    setSelectedTemplate(t || null);
                  }}
                  disabled={templates.length === 0}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-semibold disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {templates.length > 0 ? (
                    templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.membershipType})</option>)
                  ) : (
                    <option>No Templates Available</option>
                  )}
                </select>
              </div>
            </div>

            {selectedTemplate ? (
              <>
                <div className="border-t border-gray-100 pt-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Member Information</h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Member Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 001"
                        value={membershipNumber}
                        onChange={(e) => setMembershipNumber(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Custom Slug (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. jane-doe"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Member Photo</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-uploader"
                      />
                      <label
                        htmlFor="photo-uploader"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-gray-700 transition-colors cursor-pointer text-xs font-bold"
                      >
                        <Upload className="w-4 h-4" /> Upload Avatar
                      </label>
                      {uploading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                      {memberPhoto && <span className="text-xs text-green-600 font-bold">Photo Loaded ✓</span>}
                    </div>
                  </div>

                  {/* Strip Banner Design trigger */}
                  {cardConfig?.stripConfig && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowStripDesigner(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-all"
                      >
                        {isSuperUser || selectedClub?.admins?.some((a: any) => a.clerkId === user?.id)
                          ? '🎨 Customize Strip Banner & Background'
                          : '👁️ View Strip Banner'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Save action button */}
                <div className="pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-sm shadow-md shadow-blue-600/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Generate Membership Card
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                <p className="text-sm text-gray-500 font-medium">Please create a Template for this club first.</p>
              </div>
            )}
          </form>

          {/* Feedback alerts */}
          {feedback && (
            <div className={`mt-4 p-4 rounded-xl text-sm border font-semibold ${
              feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {feedback.message}
            </div>
          )}

          {/* Download buttons when passes are ready */}
          {generatedPasses && (
            <div className="mt-6 p-6 bg-slate-900 rounded-2xl text-white space-y-4">
              <h4 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                <Check className="w-5 h-5 text-green-500" />
                Wallet passes are ready!
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={downloadAppleWallet}
                  className="flex items-center justify-center gap-2 py-3 bg-black border border-neutral-700 hover:bg-neutral-900 rounded-xl font-bold transition-all text-xs"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  Add to Apple Wallet
                </button>
                <button
                  onClick={downloadGoogleWallet}
                  className="flex items-center justify-center gap-2 py-3 bg-black border border-neutral-700 hover:bg-neutral-900 rounded-xl font-bold transition-all text-xs"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  Save to Google Pay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Card Preview Panel */}
        <div className="lg:col-span-5 flex flex-col items-center sticky top-8">
          {cardConfig && (
            <div onClick={() => setIsFlipped(!isFlipped)} className="cursor-pointer">
              <MembershipCardPreview
                clubName={selectedClub?.name || 'Club'}
                clubLogoUrl={selectedClub?.logoUrl}
                cardConfig={cardConfig}
                memberName={memberName}
                memberEmail={memberEmail}
                memberPhoto={memberPhoto}
                membershipNumber={membershipNumber || '001'}
                membershipType={selectedTemplate?.membershipType || 'Gold'}
                stripImageUrl={stripImageUrl}
                isFlipped={isFlipped}
              />
            </div>
          )}
        </div>
      </div>

      {/* Strip Image Designer Modal */}
      {showStripDesigner && cardConfig && (
        <MembershipStripDesigner
          memberName={memberName}
          memberPhoto={memberPhoto}
          initialStripConfig={cardConfig.stripConfig}
          isAdmin={isSuperUser || selectedClub?.admins?.some((a: any) => a.clerkId === user?.id)}
          onSave={(dataUrl, newStripConfig) => {
            setCardConfig(prev => prev ? { ...prev, stripConfig: newStripConfig } : null);
            setStripImageUrl(dataUrl);
            setShowStripDesigner(false);
          }}
          onCancel={() => setShowStripDesigner(false)}
        />
      )}
    </div>
  );
}
