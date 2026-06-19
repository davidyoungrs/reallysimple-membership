import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Loader2,
  Search,
  Check,
  Copy,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Building2,
  Users
} from 'lucide-react';

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  publicMetadata: {
    role?: 'admin' | 'super_admin' | null;
    isActive?: boolean;
    [key: string]: any;
  };
  tier?: string;
}

interface Club {
  id: number;
  uid: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface AssignedClub {
  id: number;
  name: string;
  slug: string;
}

export function AdminSuperUser() {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();

  // Authentication configuration
  const superuserEmail = import.meta.env.VITE_SUPERUSER_EMAIL || 'd.j.young@hotmail.co.uk';
  const isPrimarySuperUser = currentUser?.primaryEmailAddress?.emailAddress?.toLowerCase() === superuserEmail.toLowerCase();

  // Directory lists state
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Clubs state
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);

  // Modal / Selected user state
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null);
  const [assignedClubs, setAssignedClubs] = useState<AssignedClub[]>([]);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({}); // tracks specific club ids in-flight

  // UI Feedback messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all clubs (for modal assignment)
  const fetchAllClubs = async () => {
    try {
      setLoadingClubs(true);
      const token = await getToken();
      const res = await fetch('/api/membership?resource=clubs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.clubs) {
        setAllClubs(result.clubs);
      }
    } catch (err) {
      console.error('Failed to load clubs list:', err);
    } finally {
      setLoadingClubs(false);
    }
  };

  // Fetch users list
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const token = await getToken();
      const offset = (page - 1) * limit;
      let url = `/api/admin?resource=users&limit=${limit}&offset=${offset}`;
      if (activeSearch.trim()) {
        url += `&q=${encodeURIComponent(activeSearch.trim())}`;
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user list');
      
      const result = await res.json();
      setUsers(result.data || []);
      setTotalCount(result.totalCount || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setMessage({ type: 'error', text: err.message || 'Error fetching user directory.' });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchAllClubs();
  }, [page, activeSearch]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchQuery);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
  };

  // Copy Clerk ID utility
  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch user details for club assignment
  const openClubManagement = async (user: ClerkUser) => {
    setSelectedUser(user);
    setAssignedClubs([]);
    setLoadingUserDetails(true);
    setMessage(null);

    try {
      const token = await getToken();
      const res = await fetch(`/api/admin?resource=user_detail&id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load user details');
      
      const result = await res.json();
      setAssignedClubs(result.assignedClubs || []);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load user club assignments' });
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Toggle club assignment
  const handleToggleClub = async (clubId: number, isAssigned: boolean) => {
    if (!selectedUser) return;

    const action = isAssigned ? 'unassign_club' : 'assign_club';
    const key = `${selectedUser.id}-${clubId}`;
    
    // Optimistic UI updates
    setActionInProgress(prev => ({ ...prev, [key]: true }));
    setMessage(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/admin?resource=user_actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          userId: selectedUser.id,
          value: { clubId }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update club assignment');
      }

      // Re-fetch user details to get updated state
      const detailRes = await fetch(`/api/admin?resource=user_detail&id=${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detailResult = await detailRes.json();
      setAssignedClubs(detailResult.assignedClubs || []);
      
      setMessage({ 
        type: 'success', 
        text: `Successfully ${isAssigned ? 'removed' : 'assigned'} club.` 
      });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to toggle club assignment.' });
    } finally {
      setActionInProgress(prev => ({ ...prev, [key]: false }));
    }
  };

  // Toggle Admin role
  const handleToggleAdminRole = async (user: ClerkUser) => {
    const isCurrentAdmin = user.publicMetadata?.role === 'admin' || user.publicMetadata?.role === 'super_admin';
    const actionText = isCurrentAdmin ? 'revoke administrative rights from' : 'grant administrative rights to';
    
    if (!window.confirm(`Are you sure you want to ${actionText} ${getUserFullName(user)}?`)) return;

    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin?resource=user_actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'toggle_admin_role',
          userId: user.id,
          value: { role: isCurrentAdmin ? null : 'admin' }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update admin role');
      }

      setMessage({ type: 'success', text: `Successfully updated role for ${getUserFullName(user)}.` });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to toggle admin role.' });
    }
  };

  // Toggle Super Admin role (Primary Superuser only)
  const handleToggleSuperAdminRole = async (user: ClerkUser) => {
    if (!isPrimarySuperUser) {
      alert('Only the primary Super User can delegate or revoke super admin rights.');
      return;
    }

    const isCurrentSuper = user.publicMetadata?.role === 'super_admin';
    const actionText = isCurrentSuper 
      ? 'revoke super admin rights from' 
      : 'delegate super admin rights to (WARNING: this user will gain total platform capabilities)';
    
    if (!window.confirm(`Are you sure you want to ${actionText} ${getUserFullName(user)}?`)) return;

    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin?resource=user_actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'toggle_super_admin_role',
          userId: user.id,
          value: { role: isCurrentSuper ? null : 'super_admin' }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update super admin role');
      }

      setMessage({ type: 'success', text: `Successfully updated super admin delegation for ${getUserFullName(user)}.` });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to toggle super admin role.' });
    }
  };

  // Helper: Get user's full name
  const getUserFullName = (user: ClerkUser) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'Unnamed User';
  };

  // Helper: Get user's initials
  const getUserInitials = (user: ClerkUser) => {
    const first = user.firstName ? user.firstName.charAt(0) : '';
    const last = user.lastName ? user.lastName.charAt(0) : '';
    const emailInit = user.emailAddresses?.[0]?.emailAddress?.charAt(0) || '?';
    return (first + last).toUpperCase() || emailInit.toUpperCase();
  };

  // Pagination bounds
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Super User Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage admin credentials, delegate permissions, and configure geofenced club scopes.
          </p>
        </div>
        
        {isPrimarySuperUser && (
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Primary Super User Mode
          </div>
        )}
      </div>

      {/* Notification banner */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-2 border animate-in fade-in duration-200 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
            : 'bg-red-50 border-red-250 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{message.text}</span>
        </div>
      )}

      {/* Control bar (Search + Info) */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-2.5 p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-650"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-end sm:self-auto">
          <Users className="w-4 h-4" />
          <span>Total Platform Users: {totalCount}</span>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <ShieldAlert className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="font-bold text-sm">No users found matching your search</p>
              <button onClick={handleClearSearch} className="text-blue-600 hover:underline text-xs mt-1 font-bold">
                Clear filters
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Clerk User ID</th>
                  <th className="px-6 py-4">Permissions Role</th>
                  <th className="px-6 py-4 text-center">Clubs Assignment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const role = user.publicMetadata?.role;
                  const isUserSuper = role === 'super_admin';
                  const isUserAdmin = role === 'admin';
                  const primaryEmail = user.emailAddresses?.[0]?.emailAddress || 'No email';
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name / Email Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-600 font-extrabold text-sm flex items-center justify-center shrink-0 border border-slate-100">
                            {getUserInitials(user)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-sm text-slate-900 block truncate">
                              {getUserFullName(user)}
                            </span>
                            <span className="text-xs text-slate-400 block truncate">
                              {primaryEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Clerk User ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                          <span className="truncate max-w-[120px]">{user.id}</span>
                          <button
                            onClick={() => copyToClipboard(user.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Clerk ID"
                          >
                            {copiedId === user.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Permissions Role Badges */}
                      <td className="px-6 py-4">
                        {isUserSuper ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-wider bg-rose-50 text-rose-750 border border-rose-250 rounded-xl uppercase">
                            <Shield className="w-3 h-3 text-rose-500" /> Super Admin
                          </span>
                        ) : isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-wider bg-blue-50 text-blue-750 border border-blue-250 rounded-xl uppercase">
                            <UserCheck className="w-3 h-3 text-blue-500" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-wider bg-slate-50 text-slate-500 border border-slate-200 rounded-xl uppercase">
                            User
                          </span>
                        )}
                      </td>

                      {/* Club Assignments */}
                      <td className="px-6 py-4 text-center">
                        {isUserSuper ? (
                          <span className="text-xs text-slate-400 font-semibold italic">Bypasses Geofencing</span>
                        ) : (
                          <button
                            onClick={() => openClubManagement(user)}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 transition-all"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            Manage Clubs
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          {/* Toggle Admin Button */}
                          <button
                            onClick={() => handleToggleAdminRole(user)}
                            disabled={isUserSuper}
                            className={`px-3 py-1.5 text-xs font-bold rounded-2xl border transition-all ${
                              isUserSuper
                                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                                : isUserAdmin
                                ? 'bg-slate-50 hover:bg-red-50 hover:text-red-750 hover:border-red-200 text-slate-700 border-slate-200'
                                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:shadow-sm hover:shadow-blue-500/10'
                            }`}
                            title={isUserSuper ? 'Remove Super Admin privileges first' : isUserAdmin ? 'Demote to regular User' : 'Promote to Admin'}
                          >
                            {isUserAdmin ? 'Demote Admin' : 'Make Admin'}
                          </button>

                          {/* Toggle Super Admin Button (Primary Superuser delegated only) */}
                          <button
                            onClick={() => handleToggleSuperAdminRole(user)}
                            disabled={!isPrimarySuperUser}
                            className={`px-3 py-1.5 text-xs font-bold rounded-2xl border transition-all ${
                              !isPrimarySuperUser
                                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                : isUserSuper
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-750 border-rose-250'
                                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                            }`}
                            title={
                              !isPrimarySuperUser 
                                ? 'Only the Primary Superuser can manage super admin role' 
                                : isUserSuper 
                                ? 'Revoke Super Admin privileges' 
                                : 'Delegate Super Admin'
                            }
                          >
                            {isUserSuper ? 'Revoke Super' : 'Make Super'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && users.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white text-sm font-semibold text-slate-500">
            <div>
              Showing <span className="text-slate-800">{startItem}</span> to <span className="text-slate-800">{endItem}</span> of <span className="text-slate-800">{totalCount}</span> users
            </div>
            
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs">Page {page} of {totalPages}</span>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CLUB GEOLOCATION PERMISSIONS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-left border border-slate-150 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Manage Club Permissions</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Assign or remove geofenced dashboard access for <span className="font-bold text-slate-700">{getUserFullName(selectedUser)}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 max-h-[60vh] overflow-y-auto space-y-4">
              {loadingUserDetails || loadingClubs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : allClubs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No clubs found. Go to "Membership Clubs" to create a club.
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Available Clubs</span>
                  
                  {allClubs.map((club) => {
                    const isAssigned = assignedClubs.some(c => c.id === club.id);
                    const inFlightKey = `${selectedUser.id}-${club.id}`;
                    const isSaving = actionInProgress[inFlightKey];

                    return (
                      <div
                        key={club.id}
                        className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${
                          isAssigned 
                            ? 'bg-blue-50/40 border-blue-200' 
                            : 'bg-white border-slate-150 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Club Logo */}
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center shrink-0">
                            {club.logoUrl ? (
                              <img src={club.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <Shield className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          
                          <div>
                            <span className="font-extrabold text-sm text-slate-800 block">
                              {club.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              /{club.slug}
                            </span>
                          </div>
                        </div>

                        {/* Toggle Checkbox / Spinner */}
                        <div className="flex items-center">
                          {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleClub(club.id, isAssigned)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border ${
                                isAssigned 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                  : 'bg-white border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {isAssigned && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
