import { useUser } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminUnauthorized } from "./AdminUnauthorized";
import { Loader2 } from "lucide-react";

export function AdminLayout() {
    const { user, isLoaded, isSignedIn } = useUser();

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/sign-in" />;
    }

    const superuserEmail = import.meta.env.VITE_SUPERUSER_EMAIL || 'd.j.young@hotmail.co.uk';
    const isSuperUser = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === superuserEmail.toLowerCase() || 
                        user?.publicMetadata?.role === 'super_admin';
    const isAdmin = user?.publicMetadata?.role === 'admin' || isSuperUser;

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
