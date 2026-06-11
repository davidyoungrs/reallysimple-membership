import { ShieldAlert, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export function AdminUnauthorized() {
    const { signOut } = useClerk();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-500 mb-8">
                    You do not have permission to access the Super Admin dashboard. This area is restricted to platform administrators only.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                    <Link
                        to="/"
                        className="block w-full py-3 px-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
