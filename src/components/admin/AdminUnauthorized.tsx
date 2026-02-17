import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminUnauthorized() {
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
                    <Link
                        to="/dashboard"
                        className="block w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                        Return to Dashboard
                    </Link>
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
