import { useUser, useAuth } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminUnauthorized } from "./AdminUnauthorized";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminLayout() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const [checkingPermissions, setCheckingPermissions] = useState(true);
    const [hasDatabaseAdminAccess, setHasDatabaseAdminAccess] = useState(false);

    const superuserEmail = import.meta.env.VITE_SUPERUSER_EMAIL || 'd.j.young@hotmail.co.uk';
    const isSuperUser = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === superuserEmail.toLowerCase() || 
                        user?.publicMetadata?.role === 'super_admin';
    const isAdmin = user?.publicMetadata?.role === 'admin' || isSuperUser || hasDatabaseAdminAccess;

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setCheckingPermissions(false);
            return;
        }

        if (isAdmin) {
            setCheckingPermissions(false);
            return;
        }

        const verifyAndSyncRole = async () => {
            try {
                const token = await getToken();
                const res = await fetch('/api/membership?action=sync_role', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.isLinked) {
                    setHasDatabaseAdminAccess(true);
                    // Force-refresh Clerk user profile to sync publicMetadata.role locally
                    await user?.reload().catch(() => {});
                }
            } catch (err) {
                console.error('[AdminLayout] Failed to sync permissions:', err);
            } finally {
                setCheckingPermissions(false);
            }
        };

        verifyAndSyncRole();
    }, [isLoaded, isSignedIn, isAdmin, getToken, user]);

    if (!isLoaded || checkingPermissions) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-slate-500">Verifying administrative permissions...</span>
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/sign-in" />;
    }

    if (!isAdmin) {
        return <AdminUnauthorized />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
