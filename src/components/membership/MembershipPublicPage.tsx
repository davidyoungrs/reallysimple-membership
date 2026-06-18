import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle, XCircle, Calendar, ShieldCheck } from 'lucide-react';

interface PublicMembershipData {
  memberName: string;
  memberPhoto?: string;
  membershipNumber: string;
  membershipType: string;
  stripImageUrl?: string;
  slug: string;
  status: 'active' | 'expired' | 'revoked';
  issuedAt: string;
  expiresAt: string;
  clubName: string;
  clubLogoUrl?: string;
  isClubSuspended?: boolean;
  clubBrandingConfig: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
}

export function MembershipPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicMembershipData | null>(null);

  useEffect(() => {
    async function fetchMembership() {
      if (!slug) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/membership?resource=memberships&slug=${slug}&public=true`);
        if (!res.ok) {
          throw new Error('Membership details could not be found');
        }
        const result = await res.json();
        if (result.success && result.membership) {
          setData(result.membership);
        } else {
          throw new Error('Membership not found');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to verify membership');
      } finally {
        setLoading(false);
      }
    }
    fetchMembership();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400 text-sm font-semibold tracking-wider">SECURELY VERIFYING MEMBER STATUS...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-4 text-center">
        <div className="w-16 h-16 bg-red-950/30 border border-red-500/30 text-red-500 flex items-center justify-center rounded-2xl mb-4">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Verification Failed</h1>
        <p className="text-gray-400 text-sm max-w-md">
          {error || 'This membership slug is invalid or has been removed from the platform.'}
        </p>
      </div>
    );
  }

  const branding = data.clubBrandingConfig || {
    primaryColor: '#4f46e5',
    secondaryColor: '#818cf8',
    textColor: '#ffffff',
    backgroundColor: '#0f172a',
    fontFamily: 'Inter',
  };

  const getStatusDetails = () => {
    if (data.isClubSuspended) {
      return {
        icon: <XCircle className="w-6 h-6 text-red-500 animate-pulse" />,
        bgColor: 'bg-red-950/35',
        borderColor: 'border-red-500/50',
        textColor: 'text-red-400',
        label: 'CLUB SUSPENDED',
      };
    }
    switch (data.status) {
      case 'active':
        return {
          icon: <CheckCircle className="w-6 h-6 text-emerald-400" />,
          bgColor: 'bg-emerald-950/20',
          borderColor: 'border-emerald-500/30',
          textColor: 'text-emerald-400',
          label: 'Valid Active Member',
        };
      case 'expired':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          bgColor: 'bg-amber-950/20',
          borderColor: 'border-amber-500/30',
          textColor: 'text-amber-400',
          label: 'Membership Expired',
        };
      case 'revoked':
        return {
          icon: <XCircle className="w-6 h-6 text-red-400" />,
          bgColor: 'bg-red-950/20',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-400',
          label: 'Membership Revoked',
        };
    }
  };

  const status = getStatusDetails();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 transition-all text-white relative overflow-hidden"
      style={{ fontFamily: `${branding.fontFamily}, sans-serif` }}
    >
      {/* Dynamic Background Blurs */}
      <div 
        className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none" 
        style={{ backgroundColor: branding.primaryColor }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none" 
        style={{ backgroundColor: branding.secondaryColor }}
      />

      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col">
        {/* Strip Image Banner */}
        <div className="h-[140px] w-full relative overflow-hidden bg-slate-800 flex items-center justify-center">
          {data.stripImageUrl ? (
            <img src={data.stripImageUrl} alt="Strip Banner" className="w-full h-full object-cover" />
          ) : (
            <div 
              className="w-full h-full flex items-center px-6" 
              style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-white/60 overflow-hidden bg-white/10 flex-shrink-0">
                  {data.memberPhoto && (
                    <img src={data.memberPhoto} alt="Member Avatar" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white drop-shadow-md">{data.memberName}</h2>
                  <p className="text-xs text-white/80 drop-shadow-sm">{data.membershipType} Member</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Club logo offset */}
        <div className="flex justify-center -mt-8 relative z-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 p-2 shadow-lg flex items-center justify-center">
            {data.clubLogoUrl ? (
              <img src={data.clubLogoUrl} alt="Club Logo" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            )}
          </div>
        </div>

        {/* Club Details */}
        <div className="text-center px-6 pt-3 pb-6 border-b border-slate-800/80">
          <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">{data.clubName}</h1>
          <p className="text-xs text-gray-400 mt-0.5 tracking-widest font-medium">MEMBERSHIP VALIDATION PORTAL</p>
        </div>

        {/* Status indicator */}
        <div className="p-6">
          <div className={`flex items-center justify-center gap-3 p-4 rounded-2xl border ${status?.bgColor} ${status?.borderColor} ${status?.textColor} mb-6`}>
            {status?.icon}
            <span className="font-extrabold text-sm uppercase tracking-wider">{status?.label}</span>
          </div>

          {data.isClubSuspended && (
            <div className="mb-6 p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-center">
              <p className="text-[11px] text-red-400 leading-relaxed font-semibold">
                This membership card is temporarily inactive because the issuing organization's account is suspended. Please contact the club administration.
              </p>
            </div>
          )}

          {/* Member Meta Grid */}
          <div className="space-y-4 text-left">
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Member ID</span>
                <span className="text-sm font-semibold text-white">{data.membershipNumber}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Level</span>
                <span className="text-sm font-semibold text-white">{data.membershipType}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-gray-300 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Issued On</span>
                  <span>{new Date(data.issuedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300 text-sm pt-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expires On</span>
                  <span>{new Date(data.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-center gap-1.5 mt-auto">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            SECURE VERIFIED STATUS
          </span>
        </div>
      </div>
    </div>
  );
}
