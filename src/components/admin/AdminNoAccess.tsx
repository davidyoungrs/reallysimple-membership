import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export function AdminNoAccess() {
    const { signOut } = useClerk();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-xl max-w-md w-full text-left space-y-6">
                <div className="bg-red-50 w-14 h-14 rounded-2xl flex items-center justify-center text-red-600 border border-red-100">
                    <ShieldAlert className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl font-black text-slate-900 leading-snug">
                        Super User Access Required
                    </h1>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        This section contains platform-wide administrative controls and user role delegations. Your current account does not possess Super User authorization.
                    </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                    <Link
                        to="/admin"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Admin Dashboard
                    </Link>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-50 hover:bg-red-100/70 text-red-655 border border-red-100 rounded-xl text-xs font-bold transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
