import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, LogOut, Shield, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import { Tooltip } from '../Tooltip';

export function AdminSidebar() {
    const location = useLocation();
    const { signOut } = useClerk();
    const { user } = useUser();

    const isActive = (path: string) => location.pathname === path;

    const superuserEmail = import.meta.env.VITE_SUPERUSER_EMAIL || 'd.j.young@hotmail.co.uk';
    const isSuperUser = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === superuserEmail.toLowerCase() || 
                        user?.publicMetadata?.role === 'super_admin';

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

    const navItems = [
        { icon: Shield, label: 'Membership Clubs', path: '/admin', tooltip: 'Manage your membership clubs, template designs, and issued passes.' },
        { icon: ShieldAlert, label: 'Security', path: '/admin/security', tooltip: 'Monitor rate limits, bot blocks, input sanitization records, and API performance.' },
        { icon: Settings, label: 'Settings', path: '/admin/settings', tooltip: 'Configure profile settings and global configurations.' },
    ];

    if (isSuperUser) {
        navItems.push({ icon: Users, label: 'Super User', path: '/admin/superuser', tooltip: 'Access root-level privileges to delegate roles and assign geofenced club access.' });
    }

    return (
        <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white flex flex-col">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm">MB</span>
                    Club Pass Admin
                </h2>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <Tooltip key={item.path} content={item.tooltip} position="right" className="w-full">
                        <Link
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    </Tooltip>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-950/50 border border-slate-800/80 rounded-xl">
                    <span className="text-xs font-bold text-slate-400">ToolTips</span>
                    <Tooltip content={tooltipsEnabled ? "Disable contextual help tooltips" : "Enable contextual help tooltips"} position="right">
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

                <Tooltip content="Sign out of your active administrator session." position="right" className="w-full">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white w-full transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}

