import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Shield, Users, Layers, PlusCircle, LayoutDashboard, ChevronLeft, Loader2 } from 'lucide-react';
import { Tooltip } from '../../Tooltip';

export function MembershipAdminLayout() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const location = useLocation();
  const { getToken } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();

  const [club, setClub] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  
  const [members, setMembers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [tooltipsEnabled, setTooltipsEnabled] = useState(() => {
    return localStorage.getItem('tooltips-enabled') !== 'false';
  });

  const handleToggleTooltips = () => {
    const nextValue = !tooltipsEnabled;
    setTooltipsEnabled(nextValue);
    localStorage.setItem('tooltips-enabled', String(nextValue));
    window.dispatchEvent(new Event('tooltips-changed'));
  };

  useEffect(() => {
    const handleToggleEvent = () => {
      setTooltipsEnabled(localStorage.getItem('tooltips-enabled') !== 'false');
    };

    window.addEventListener('tooltips-changed', handleToggleEvent);
    return () => {
      window.removeEventListener('tooltips-changed', handleToggleEvent);
    };
  }, []);

  const fetchMembers = async () => {
    if (!club) return;
    try {
      setLoadingMembers(true);
      const token = await getToken();
      const res = await fetch(`/api/membership?resource=memberships&clubId=${club.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.memberships) {
        const activeMembers = result.memberships.filter((m: any) => 
          !(m.memberName === 'Deleted Member' && m.memberEmail === 'deleted@example.com')
        );
        setMembers(activeMembers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchTemplates = async () => {
    if (!club) return;
    try {
      setLoadingTemplates(true);
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
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (club) {
      fetchMembers();
      fetchTemplates();
    }
  }, [club]);

  useEffect(() => {
    async function checkAccessAndLoadClub() {
      if (!clubSlug) return;
      try {
        setLoading(true);
        const token = await getToken();
        
        // Fetch club details (includes auth verification on backend)
        const res = await fetch(`/api/membership?resource=clubs&slug=${clubSlug}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 403) {
          const result = await res.json().catch(() => ({}));
          if (result.error === 'suspended') {
            setIsSuspended(true);
            setLoading(false);
            return;
          }
          setAuthorized(false);
          setLoading(false);
          return;
        }

        if (res.status === 401) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const result = await res.json();
        if (result.success && result.club) {
          setClub(result.club);
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error('Failed to load admin workspace:', err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }
    checkAccessAndLoadClub();
  }, [clubSlug]);

  if (!isUserLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Render suspension screen
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/25 rounded-3xl p-8 shadow-xl shadow-red-950/20 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-550/40 p-4 flex items-center justify-center mx-auto text-red-500 animate-pulse">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-white uppercase tracking-wider">Workspace Suspended</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Access to the dashboard for <span className="text-white font-extrabold">{clubSlug}</span> has been deactivated. This typically occurs due to an unpaid invoice or contract renewal issue.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Need assistance?
            </p>
            <a
              href="mailto:support@reallysimpleapps.com"
              className="block w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all"
            >
              Contact Billing Support
            </a>
            <Link
              to="/dashboard"
              className="block w-full py-2.5 px-4 bg-red-650 hover:bg-red-750 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-950/25"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if unauthorized
  if (authorized === false) {
    return <Navigate to="/dashboard" replace />;
  }

  const branding = club?.brandingConfig || {
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    textColor: '#1f2937',
    backgroundColor: '#f3f4f6',
    fontFamily: 'Inter',
  };

  const isActive = (path: string) => {
    if (path.endsWith('/')) {
      return location.pathname === path.slice(0, -1) || location.pathname === path;
    }
    return location.pathname === path;
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: `/membership-admin/${clubSlug}` },
    { icon: Layers, label: 'Templates', path: `/membership-admin/${clubSlug}/templates` },
    { icon: Users, label: 'Members', path: `/membership-admin/${clubSlug}/members` },
    { icon: PlusCircle, label: 'Issue Card', path: `/membership-admin/${clubSlug}/create` },
  ];

  return (
    <div 
      className="min-h-screen flex bg-slate-950 text-slate-100"
      style={{
        fontFamily: `${branding.fontFamily}, sans-serif`,
        // Set CSS variables dynamically for child views to read
        // Tailwind v4 uses standard CSS properties for customizations
        '--club-primary': branding.primaryColor,
        '--club-secondary': branding.secondaryColor,
      } as any}
    >
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-700/80 p-2 flex items-center justify-center">
            {club?.logoUrl ? (
              <img src={club.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <Shield className="w-7 h-7 text-blue-500" />
            )}
          </div>
          <div className="text-center">
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 line-clamp-1">
              {club?.name || 'Club Workspace'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Club Admin Panel
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-xs uppercase tracking-wider ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
              style={isActive(item.path) ? { backgroundColor: branding.primaryColor } : {}}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-850 hover:text-white font-semibold text-xs uppercase tracking-wider transition-colors w-full"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span>Main Panel</span>
          </Link>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
        <header className="h-16 border-b border-slate-800/80 flex items-center justify-between px-8 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Club Workspace:
            </span>
            <span className="text-xs font-extrabold text-white uppercase tracking-wider bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              {clubSlug}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-400">ToolTips</span>
              <Tooltip content={tooltipsEnabled ? "Disable contextual help tooltips" : "Enable contextual help tooltips"} position="bottom">
                <button
                  onClick={handleToggleTooltips}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-blue-500 ${
                    tooltipsEnabled ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle Tooltips"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      tooltipsEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">{user?.fullName}</span>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <img src={user?.imageUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {club?.isSuspended && (
          <div className="bg-red-950/45 border-b border-red-500/25 px-8 py-3 text-red-200 text-xs font-semibold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 animate-pulse text-red-500" />
              <span>THIS WORKSPACE IS CURRENTLY SUSPENDED. ALL ACTIVE MEMBER CARDS ARE DEACTIVATED.</span>
            </span>
            <span className="text-[9px] bg-red-950/40 text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-black uppercase tracking-wider">
              Superuser View
            </span>
          </div>
        )}

        <main className="flex-grow p-8 overflow-y-auto">
          <Outlet context={{ 
            club, 
            branding, 
            members, 
            templates, 
            fetchMembers, 
            fetchTemplates, 
            loadingMembers, 
            loadingTemplates 
          }} />
        </main>
      </div>
    </div>
  );
}
