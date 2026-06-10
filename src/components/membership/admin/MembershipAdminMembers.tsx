import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Loader2, Search, Trash2, Edit, FileSpreadsheet, X, Check, Upload, Share2, Mail, Copy } from 'lucide-react';

export function MembershipAdminMembers() {
  const { club } = useOutletContext<{ club: any }>();
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Directory states
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Status change
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  // Sharing States
  const [activeShareMember, setActiveShareMember] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // CSV Import States
  const [showImportView, setShowImportView] = useState(searchParams.get('import') === 'true');
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any[] | null>(null);

  const fetchMembers = async () => {
    if (!club) return;
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=memberships&clubId=${club.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.memberships) {
        setMembers(result.memberships);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!club) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=templates&clubId=${club.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.templates) {
        setTemplates(result.templates);
        if (result.templates.length > 0) {
          setSelectedTemplateId(String(result.templates[0].id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchTemplates();
  }, [club]);

  // Search/Filter logic
  const filteredMembers = members.filter(m => {
    const matchesQuery = 
      m.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.membershipNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    
    return matchesQuery && matchesStatus;
  });

  // Action: Revoke
  const handleRevoke = async (id: number) => {
    if (!window.confirm('Are you sure you want to revoke this membership? This will render the Wallet passes inactive.')) return;
    
    try {
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=memberships&id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Renew (extend by 1 year)
  const handleRenew = async (member: any) => {
    if (!window.confirm(`Extend ${member.memberName}'s membership expiration by 12 months?`)) return;
    
    try {
      const token = await getToken();
      const nextYear = new Date(member.expiresAt || Date.now());
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const res = await fetch('/api/membership?resource=memberships', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: member.id,
          expiresAt: nextYear.toISOString(),
          status: 'active'
        })
      });

      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Change Status inline
  const handleStatusChange = async (member: any, newStatus: string) => {
    if (newStatus === member.status) return;
    setChangingStatusId(member.id);
    try {
      const token = await getToken();
      const res = await fetch('/api/membership?resource=memberships', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: member.id, status: newStatus })
      });
      if (res.ok) {
        fetchMembers();
      } else {
        console.error('Status change failed', await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChangingStatusId(null);
    }
  };

  // Action: Edit Member - Send back to issuance creator page preloaded with their data
  const handleOpenEdit = (member: any) => {
    navigate(`/membership-admin/${club.slug}/create?edit=${member.id}`);
  };

  // CSV Parsing
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/);
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const dataRows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Comma splitting ignoring commas inside quotation blocks
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const values = matches.map(v => v.trim().replace(/^["']|["']$/g, ''));
        
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Normalize matching schemas
        const normalizedRow = {
          name: row.name || row.fullname || row['full name'] || '',
          email: row.email || row.mail || row['email address'] || '',
          photoUrl: row.photo_url || row.photourl || row.photo || '',
          membershipType: row.membership_type || row.membershiptype || row.type || '',
          membershipNumber: row.membership_number || row.membershipnumber || row.number || '',
        };

        if (normalizedRow.name || normalizedRow.email) {
          dataRows.push(normalizedRow);
        }
      }
      setCsvPreview(dataRows);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (!selectedTemplateId || csvPreview.length === 0) return;

    try {
      setImporting(true);
      const token = await getToken();

      const res = await fetch('/api/membership?resource=memberships&action=bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clubId: club.id,
          templateId: Number(selectedTemplateId),
          data: csvPreview
        })
      });

      const result = await res.json();
      if (result.success && result.results) {
        setImportResults(result.results);
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const handleResetImport = () => {
    setCsvPreview([]);
    setImportResults(null);
  };

  if (loading && members.length === 0) {
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
          <h1 className="text-2xl font-black text-white">Member Directory</h1>
          <p className="text-slate-400 text-sm">List, search, filter, and issue membership passes.</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowImportView(!showImportView);
              handleResetImport();
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            <FileSpreadsheet className="w-4 h-4" /> 
            {showImportView ? 'View Directory' : 'Bulk CSV Import'}
          </button>
        </div>
      </div>

      {!showImportView ? (
        <>
          {/* Filters Panel */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-350 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-6 py-4">Member Info</th>
                    <th className="px-6 py-4">ID Number</th>
                    <th className="px-6 py-4">Level</th>
                    <th className="px-6 py-4">Expires</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-950/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-300">
                            {member.memberPhoto ? (
                              <img src={member.memberPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              member.memberName.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="block font-bold text-white leading-snug">{member.memberName}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{member.memberEmail}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono">{member.membershipNumber}</td>
                      <td className="px-6 py-4 text-slate-300 font-semibold">{member.membershipType}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(member.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={member.status}
                          disabled={changingStatusId === member.id}
                          onChange={(e) => handleStatusChange(member, e.target.value)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border outline-none cursor-pointer transition-all disabled:opacity-50 ${
                            member.status === 'active'
                              ? 'bg-emerald-950/45 border-emerald-500/30 text-emerald-400 focus:ring-1 focus:ring-emerald-500'
                              : member.status === 'expired'
                              ? 'bg-amber-950/45 border-amber-500/30 text-amber-500 focus:ring-1 focus:ring-amber-500'
                              : 'bg-red-950/45 border-red-500/30 text-red-500 focus:ring-1 focus:ring-red-500'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                          <option value="revoked">Revoked</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            title="Edit Card"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {member.status !== 'revoked' && (
                            <button
                              onClick={() => handleRevoke(member.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-all"
                              title="Revoke Membership"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRenew(member)}
                            className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => setActiveShareMember(member)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all"
                            title="Share Card"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 italic">
                        No members matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* CSV BULK IMPORT WORKFLOW VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-white uppercase tracking-wider">CSV Bulk Card Registration</h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload a CSV with headers: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-blue-400 font-mono">name, email, photo_url, membership_type, membership_number</code>
              </p>
            </div>
            {importResults && (
              <button
                onClick={handleResetImport}
                className="text-xs font-bold text-blue-400 hover:underline"
              >
                Upload another file
              </button>
            )}
          </div>

          {!importResults ? (
            <div className="space-y-6">
              {/* Template Picker */}
              <div className="max-w-md">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Associate Card Design Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.membershipType})</option>)}
                </select>
              </div>

              {/* Upload Dropzone */}
              {csvPreview.length === 0 ? (
                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-3xl py-12 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/20 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-10 h-10 text-slate-600" />
                  <div>
                    <span className="block font-bold text-xs text-white">Choose CSV File</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Drag and drop or click to browse</span>
                  </div>
                </div>
              ) : (
                /* Preview Table */
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-950/30 p-4 rounded-xl border border-slate-850">
                    <span className="text-xs font-bold text-white">Parsed {csvPreview.length} member rows successfully.</span>
                    <button
                      onClick={() => setCsvPreview([])}
                      className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-500 text-[10px] font-bold">
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Photo URL</th>
                          <th className="px-4 py-2">Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 bg-slate-950/10">
                        {csvPreview.map((row, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-white font-bold">{row.name}</td>
                            <td className="px-4 py-2 text-slate-300">{row.email}</td>
                            <td className="px-4 py-2 text-slate-500 truncate max-w-[150px]">{row.photoUrl || 'none'}</td>
                            <td className="px-4 py-2 text-slate-400">{row.membershipNumber || 'auto'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleBulkImport}
                    disabled={importing}
                    className="flex items-center justify-center gap-1.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirm & Bulk Generate Passes
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Bulk Import Results</h4>
              <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto bg-slate-950/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500 text-[10px] font-bold">
                      <th className="px-4 py-2">Member</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Result Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {importResults.map((res, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-white font-bold">{res.name} ({res.email})</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            res.success ? 'bg-green-950/40 border-green-500/30 text-green-400 border' : 'bg-red-950/40 border-red-500/30 text-red-400 border'
                          }`}>
                            {res.success ? 'Success ✓' : 'Failed ✗'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-400">
                          {res.success ? `Slug: /membership/${res.slug}` : res.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Membership Card Modal */}
      {activeShareMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-left">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div>
                <h3 className="font-extrabold text-base text-white uppercase tracking-wider">Share Membership Card</h3>
                <p className="text-xs text-slate-400 mt-1">Send to {activeShareMember.memberName}</p>
              </div>
              <button 
                onClick={() => setActiveShareMember(null)} 
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Message Preview */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Message Preview
                </label>
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-xs font-mono text-slate-300 leading-relaxed max-h-[160px] overflow-y-auto whitespace-pre-wrap select-all">
                  {`Hi ${activeShareMember.memberName}, your ${club.name} membership card is ready!\n\nView and Verify online:\n${window.location.origin}/membership/${activeShareMember.slug}\n\nAdd to Wallet:\n- Apple Wallet (iOS): ${window.location.origin}/api/passes?resource=membership&type=apple&slug=${activeShareMember.slug}\n- Google Wallet (Android): ${window.location.origin}/api/passes?resource=membership&type=google&slug=${activeShareMember.slug}`}
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(`Your ${club.name} Membership Card`);
                    const body = encodeURIComponent(
                      `Hi ${activeShareMember.memberName},\n\nYour membership card for ${club.name} is ready!\n\nView online:\n${window.location.origin}/membership/${activeShareMember.slug}\n\nAdd to Wallet:\n- Apple Wallet (iOS): ${window.location.origin}/api/passes?resource=membership&type=apple&slug=${activeShareMember.slug}\n- Google Wallet (Android): ${window.location.origin}/api/passes?resource=membership&type=google&slug=${activeShareMember.slug}`
                    );
                    window.open(`mailto:${activeShareMember.memberEmail}?subject=${subject}&body=${body}`, '_self');
                  }}
                  className="col-span-2 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs border border-blue-500/30"
                >
                  <Mail className="w-4 h-4" />
                  Send via Email
                </button>

                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/membership/${activeShareMember.slug}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl font-bold transition-all text-xs border border-slate-700"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Link Copied!' : 'Copy Portal Link'}
                </button>

                <button
                  onClick={async () => {
                    try {
                      const textMsg = `Hi ${activeShareMember.memberName}, your ${club.name} membership card is ready!\n\nView online:\n${window.location.origin}/membership/${activeShareMember.slug}\n\nAdd to Apple Wallet:\n${window.location.origin}/api/passes?resource=membership&type=apple&slug=${activeShareMember.slug}\n\nSave to Google Wallet:\n${window.location.origin}/api/passes?resource=membership&type=google&slug=${activeShareMember.slug}`;
                      await navigator.clipboard.writeText(textMsg);
                      setCopiedMessage(true);
                      setTimeout(() => setCopiedMessage(false), 2000);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl font-bold transition-all text-xs border border-slate-700"
                >
                  {copiedMessage ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copiedMessage ? 'Message Copied!' : 'Copy Message Text'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setActiveShareMember(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
