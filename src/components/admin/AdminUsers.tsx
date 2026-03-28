import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Loader2, Search, Mail, User, Shield, Calendar, MoreVertical, CheckCircle, AlertOctagon, Zap, Star, Briefcase, Award, ArrowRight } from 'lucide-react';

export function AdminUsers() {
    const { getToken } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function fetchUsers() {
            setLoading(true);
            try {
                const token = await getToken();
                const res = await fetch(`/api/admin?resource=users&q=${search}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to fetch users');
                const result = await res.json();
                setUsers(result.data || []);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300); // Debounce

        return () => clearTimeout(timeoutId);
    }, [getToken, search]);

    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [userDetail, setUserDetail] = useState<{ user: any, cards: any[] } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [showConciergeModal, setShowConciergeModal] = useState(false);
    const [conciergeLoading, setConciergeLoading] = useState(false);
    const [conciergeForm, setConciergeForm] = useState({
        fullName: '',
        jobTitle: '',
        company: '',
        email: '',
        phone: '',
        website: '',
        bio: ''
    });

    const handleCreateConciergeCard = async () => {
        if (!userDetail?.user.id) return;
        setConciergeLoading(true);
        try {
            const token = await getToken();
            const res = await fetch('/api/admin?resource=user_actions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'create_concierge_card',
                    userId: userDetail.user.id,
                    value: { cardData: conciergeForm }
                })
            });

            if (!res.ok) throw new Error('Failed to create card');
            
            // Refresh user details to show the new card
            openDetailModal(userDetail.user.id);
            setShowConciergeModal(false);
            // Reset form
            setConciergeForm({
                fullName: '',
                jobTitle: '',
                company: '',
                email: '',
                phone: '',
                website: '',
                bio: ''
            });

            alert('Card created successfully!');
        } catch (err: any) {
            console.error(err);
            alert('Failed to create concierge card: ' + err.message);
        } finally {
            setConciergeLoading(false);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActionMenuOpen(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleAction = async (action: string, userId: string, value?: any) => {
        try {
            const token = await getToken();
            const res = await fetch('/api/admin?resource=user_actions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, userId, value })
            });

            if (!res.ok) throw new Error('Action failed');
            const data = await res.json();

            // Refresh users
            const updatedUsers = users.map(u => {
                if (u.id === userId) {
                    if (action === 'toggle_status') {
                        return { ...u, publicMetadata: { ...u.publicMetadata, isActive: value } };
                    }
                    if (action === 'ban') return { ...u, banned: true };
                    if (action === 'unban') return { ...u, banned: false };
                    if (action === 'update_tier') return { ...u, tier: value.tier };
                }
                return u;
            });
            setUsers(updatedUsers);

            // Refresh detail view if open
            if (userDetail?.user.id === userId) {
                setUserDetail({
                    ...userDetail,
                    user: {
                        ...userDetail.user,
                        tier: action === 'update_tier' ? value.tier : userDetail.user.tier,
                        publicMetadata: action === 'toggle_status' ? { ...userDetail.user.publicMetadata, isActive: value } : userDetail.user.publicMetadata
                    }
                });
            }

            if (action === 'reset_password' && data.temporaryPassword) {
                alert(`SUCCESS: Password reset for user.\n\nTemporary Password: ${data.temporaryPassword}\n\nPlease copy this and send it to the user immediately. They should change it after logging in.`);
            } else if (action === 'update_tier') {
                // No alert for tier update, we'll use optimistic UI + badge
            } else {
                alert('Action successful');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to perform action');
        }
    };

    const handleFeatureToggle = async (userId: string, feature: string, enabled: boolean) => {
        try {
            const token = await getToken();
            const res = await fetch('/api/admin?resource=user_actions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'toggle_feature', userId, value: { feature, enabled } })
            });

            if (!res.ok) throw new Error('Action failed');

            // Refresh details
            openDetailModal(userId);
        } catch (err) {
            console.error(err);
            alert('Failed to toggle feature');
        }
    };

    const renderTierBadge = (tier: string) => {
        const tiers: Record<string, { label: string, color: string, icon: any }> = {
            'starter': { label: 'Starter', color: 'bg-gray-100 text-gray-700', icon: Zap },
            'pro': { label: 'Pro', color: 'bg-blue-100 text-blue-700', icon: Star },
            'pro_plus': { label: 'Pro+', color: 'bg-green-100 text-green-700', icon: Award },
            'business': { label: 'Business', color: 'bg-purple-100 text-purple-700', icon: Briefcase },
            'grandfathered': { label: 'Original', color: 'bg-orange-100 text-orange-700', icon: Shield },
            'unknown': { label: 'Unknown', color: 'bg-red-100 text-red-700', icon: AlertOctagon }
        };

        const config = tiers[tier] || tiers['unknown'];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" /> {config.label}
            </span>
        );
    };

    const openDetailModal = async (userId: string) => {
        setShowDetailModal(true);
        setDetailLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`/api/admin?resource=user_detail&id=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setUserDetail(data);
        } catch (err) {
            console.error(err);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div>
            {/* Header ... */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-2">Manage user accounts and access.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 mb-6">
                    Error loading users: {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                <div className="overflow-x-auto overflow-y-visible min-h-[400px]">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                    </td>
                                </tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium overflow-hidden">
                                                {user.imageUrl ? (
                                                    <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    user.firstName ? user.firstName[0] : <User className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                    {user.banned && <span className="ml-2 text-xs text-red-600 font-bold">(BANNED)</span>}
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {user.emailAddresses?.[0]?.emailAddress}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        {user.publicMetadata?.isActive === false ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                Inactive
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6">
                                        {renderTierBadge(user.tier || 'starter')}
                                    </td>
                                    <td className="py-4 px-6">
                                        {user.publicMetadata?.role === 'admin' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                <Shield className="w-3 h-3 mr-1" /> Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                User
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuOpen(actionMenuOpen === user.id ? null : user.id);
                                            }}
                                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>

                                        {actionMenuOpen === user.id && (
                                            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 text-left overflow-hidden">
                                                <button
                                                    onClick={() => openDetailModal(user.id)}
                                                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <User className="w-4 h-4" /> View Details
                                                </button>
                                                <button
                                                    onClick={() => handleAction('toggle_status', user.id, !(user.publicMetadata?.isActive !== false))}
                                                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    {user.publicMetadata?.isActive === false ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertOctagon className="w-4 h-4 text-orange-600" />}
                                                    {user.publicMetadata?.isActive === false ? 'Activate User' : 'Deactivate User'}
                                                </button>
                                                {user.banned ? (
                                                    <button
                                                        onClick={() => handleAction('unban', user.id)}
                                                        className="w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                                    >
                                                        <Shield className="w-4 h-4" /> Unban User
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAction('ban', user.id)}
                                                        className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <Shield className="w-4 h-4" /> Ban User
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleAction('reset_password', user.id)}
                                                    className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                                >
                                                    <AlertOctagon className="w-4 h-4" /> Reset Password
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Detail Modal */}
            {
                showDetailModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900">User Details</h2>
                                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                                    &times;
                                </button>
                            </div>
                            <div className="p-6">
                                {detailLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                                ) : userDetail ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden">
                                                <img src={userDetail?.user.imageUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold">{userDetail?.user.firstName} {userDetail?.user.lastName}</h3>
                                                <p className="text-gray-500">{userDetail?.user.emailAddresses?.[0]?.emailAddress}</p>
                                                <p className="text-xs text-gray-400">ID: {userDetail?.user.id}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold">Subscription Plan</h4>
                                                {renderTierBadge((userDetail?.user as any).tier || 'starter')}
                                            </div>
                                            <div className="flex gap-2">
                                                <select
                                                    defaultValue={(userDetail?.user as any).tier || 'starter'}
                                                    value={(userDetail?.user as any).tier || 'starter'}
                                                    disabled={syncing === userDetail.user.id}
                                                    onChange={async (e) => {
                                                        const newTier = e.target.value;
                                                        setSyncing(userDetail.user.id);
                                                        await handleAction('update_tier', userDetail.user.id, { tier: newTier });
                                                        setSyncing(null);
                                                    }}
                                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                >
                                                    <option value="starter">Starter (Free)</option>
                                                    <option value="pro">Pro ($9/mo)</option>
                                                    <option value="pro_plus">Pro+ ($19/mo)</option>
                                                    <option value="business">Business ($49/mo)</option>
                                                    <option value="grandfathered">Grandfathered</option>
                                                </select>
                                                {syncing === userDetail.user.id && (
                                                    <div className="flex items-center px-2">
                                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold">Business Cards</h4>
                                                <button 
                                                    onClick={() => {
                                                        const user = userDetail?.user;
                                                        setConciergeForm({
                                                            fullName: (user?.firstName && user?.lastName) ? `${user.firstName} ${user.lastName}` : (user?.firstName || ''),
                                                            jobTitle: '',
                                                            company: '',
                                                            email: user?.emailAddresses?.[0]?.emailAddress || '',
                                                            phone: '',
                                                            website: '',
                                                            bio: ''
                                                        });
                                                        setShowConciergeModal(true);
                                                    }}
                                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                >
                                                    <Zap className="w-3 h-3" /> Create Concierge Card
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {userDetail?.cards.map((card: any) => (
                                                    <div key={card.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium">{card.data.fullName || 'Untitled Card'}</div>
                                                            <div className="text-xs text-gray-500">/{card.slug}</div>
                                                        </div>
                                                        {card.isActive ? (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                                                        ) : (
                                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Inactive</span>
                                                        )}
                                                    </div>
                                                ))}
                                                {userDetail?.cards.length === 0 && <p className="text-gray-500 italic">No cards found.</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold mb-2">Feature Flags</h4>
                                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={!!(userDetail?.user.publicMetadata as any)?.features?.wallet_access}
                                                        onChange={(e) => handleFeatureToggle(userDetail?.user.id, 'wallet_access', e.target.checked)}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    <span className="ml-3 text-sm font-medium text-gray-900">Wallet Access</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold mb-2">Raw Metadata</h4>
                                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                                {JSON.stringify(userDetail?.user.publicMetadata, null, 2)}
                                            </pre>
                                        </div>
                                    </div>


                                ) : (
                                    <div className="text-center text-red-500">Failed to load user details.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Concierge Card Modal */}
            {showConciergeModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Create Concierge Card</h2>
                                <p className="text-xs text-gray-500 mt-1">Creating card for {userDetail?.user.firstName} {userDetail?.user.lastName}</p>
                            </div>
                            <button onClick={() => setShowConciergeModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                                    <input
                                        type="text"
                                        value={conciergeForm.fullName}
                                        onChange={(e) => setConciergeForm({ ...conciergeForm, fullName: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Title</label>
                                    <input
                                        type="text"
                                        value={conciergeForm.jobTitle}
                                        onChange={(e) => setConciergeForm({ ...conciergeForm, jobTitle: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Marketing Director"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</label>
                                    <input
                                        type="text"
                                        value={conciergeForm.company}
                                        onChange={(e) => setConciergeForm({ ...conciergeForm, company: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Email</label>
                                    <input
                                        type="email"
                                        value={conciergeForm.email}
                                        onChange={(e) => setConciergeForm({ ...conciergeForm, email: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</label>
                                <input
                                    type="tel"
                                    value={conciergeForm.phone}
                                    onChange={(e) => setConciergeForm({ ...conciergeForm, phone: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bio / About</label>
                                <textarea
                                    value={conciergeForm.bio}
                                    onChange={(e) => setConciergeForm({ ...conciergeForm, bio: e.target.value })}
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                    placeholder="Brief bio about the user..."
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConciergeModal(false)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateConciergeCard}
                                disabled={conciergeLoading || !conciergeForm.fullName}
                                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 group"
                            >
                                {conciergeLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Generate Card
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
