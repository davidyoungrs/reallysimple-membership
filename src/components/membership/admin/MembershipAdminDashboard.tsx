import { useState, useEffect } from 'react';
import { useOutletContext, Link, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Users, Award, ShieldAlert, PlusCircle, FileSpreadsheet, Loader2, ArrowRight } from 'lucide-react';
import { type ClubBrandingConfig } from '../../../types/membershipTypes.js';

export function MembershipAdminDashboard() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const { club, branding } = useOutletContext<{ club: any; branding: ClubBrandingConfig }>();
  const { getToken } = useAuth();

  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revoked: 0 });
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!club) return;
      try {
        setLoading(true);
        const token = await getToken();
        
        // Fetch all memberships for this club
        const res = await fetch(`/api/membership?resource=memberships&clubId=${club.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.memberships) {
          const list = result.memberships;
          
          // Compute stats
          const computed = list.reduce(
            (acc: any, item: any) => {
              acc.total++;
              if (item.status === 'active') acc.active++;
              else if (item.status === 'expired') acc.expired++;
              else if (item.status === 'revoked') acc.revoked++;
              return acc;
            },
            { total: 0, active: 0, expired: 0, revoked: 0 }
          );
          setStats(computed);
          
          // Get last 5 recently added
          setRecentMembers(list.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [club, getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard Overview</h1>
        <p className="text-slate-400 text-sm">Real-time metrics and administration controls for {club.name}.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Members */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Total Registered</span>
            <span className="text-3xl font-black text-white mt-1 block">{stats.total}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Passes</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">{stats.active}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Expired Cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Expired Cards</span>
            <span className="text-3xl font-black text-amber-500 mt-1 block">{stats.expired}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-950/40 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Revoked Cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Revoked Cards</span>
            <span className="text-3xl font-black text-red-500 mt-1 block">{stats.revoked}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to={`/membership-admin/${clubSlug}/create`}
              className="p-4 bg-slate-950 hover:bg-slate-850 rounded-2xl border border-slate-800 text-left transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-950/50 flex items-center justify-center text-blue-400">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-white">Single Issue</span>
                <span className="text-[10px] text-slate-500 font-semibold group-hover:text-slate-400">Issue individual card</span>
              </div>
            </Link>

            <Link
              to={`/membership-admin/${clubSlug}/members?import=true`}
              className="p-4 bg-slate-950 hover:bg-slate-850 rounded-2xl border border-slate-800 text-left transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-950/50 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-white">CSV Import</span>
                <span className="text-[10px] text-slate-500 font-semibold group-hover:text-slate-400">Bulk card generation</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider mb-4">Recent Members</h3>
            <div className="space-y-3">
              {recentMembers.map((member) => (
                <div key={member.id} className="flex justify-between items-center bg-slate-950/30 p-3 rounded-2xl border border-slate-850">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xs">
                      {member.memberPhoto ? (
                        <img src={member.memberPhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        member.memberName.charAt(0)
                      )}
                    </div>
                    <div>
                      <span className="block font-bold text-xs text-white leading-tight">{member.memberName}</span>
                      <span className="text-[10px] text-slate-500 font-bold">{member.membershipNumber}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    member.status === 'active' 
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                  }`}>
                    {member.status}
                  </span>
                </div>
              ))}
              {recentMembers.length === 0 && (
                <p className="text-xs text-slate-500 italic py-4">No membership cards created yet.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-850">
            <Link
              to={`/membership-admin/${clubSlug}/members`}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center justify-end gap-1.5 group"
            >
              Manage all directory members 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
