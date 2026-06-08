import { LayoutDashboard, Users, CreditCard, Settings, ShieldAlert, LogOut, Play, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export function AdminSidebar() {
    const location = useLocation();
    const { signOut } = useClerk();

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: CreditCard, label: 'Cards', path: '/admin/cards' },
        { icon: Shield, label: 'Memberships', path: '/admin/memberships' },
        { icon: ShieldAlert, label: 'Security', path: '/admin/security' },
        { icon: Play, label: 'Simulator', path: '/admin/simulator' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    return (
        <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white flex flex-col">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm">SA</span>
                    Super Admin
                </h2>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white w-full transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
