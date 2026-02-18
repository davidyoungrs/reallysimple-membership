
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Loader2, Search, ExternalLink, Trash2, Calendar, IdCard, AlertTriangle, LayoutGrid, List } from 'lucide-react';

export function AdminCards() {
    const { getToken } = useAuth();
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    async function fetchCards() {
        console.log('AdminCards: Fetching cards...');
        setLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`/api/admin?resource=cards&q=${search}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch cards');
            const result = await res.json();
            console.log('AdminCards fetched:', result);
            setCards(result.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchCards();
        }, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [getToken, search]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this card? This action cannot be undone.')) return;

        setDeletingId(id);
        try {
            const token = await getToken();
            const res = await fetch('/api/admin', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ id })
            });

            if (!res.ok) throw new Error('Failed to delete card');

            // Remove from list
            setCards(cards.filter(card => card.id !== id));
        } catch (err: any) {
            alert('Error deleting card: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Card Gallery</h1>
                    <p className="text-gray-500 mt-2">Manage all digital business cards.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search cards (slug or name)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 md:w-80"
                    />
                </div>
            </div>

            <div className="flex justify-end mb-6">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        title="Grid View"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        title="List View"
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Card Info</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading && cards.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                        </td>
                                    </tr>
                                ) : cards.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-500">
                                            No cards found matching "{search}"
                                        </td>
                                    </tr>
                                ) : cards.map((card) => (
                                    <tr key={card.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3 relative">
                                                {/* Hover Preview Thumbnail for List View */}
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                    {card.data?.profileImage ? (
                                                        <img src={card.data.profileImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <IdCard className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {card.data?.fullName || 'Untitled Card'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {card.data?.jobTitle || 'No Job Title'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                                                /card/{card.slug || '-'}
                                            </code>
                                        </td>
                                        <td className="py-4 px-6">
                                            {card.isActive ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(card.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`/card/${card.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Public Card"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(card.id)}
                                                    disabled={deletingId === card.id}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Delete Card"
                                                >
                                                    {deletingId === card.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loading && cards.length === 0 ? (
                        <div className="col-span-full flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : cards.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No cards found matching "{search}"
                        </div>
                    ) : cards.map((card) => (
                        <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group relative">
                            {/* Card Preview Header */}
                            <div className="h-32 bg-gradient-to-r from-blue-50 to-indigo-50 relative">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${card.isActive ? 'bg-white/90 text-green-700' : 'bg-white/90 text-gray-600'
                                        }`}>
                                        {card.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            {/* Card Content & Hover Profile Preview */}
                            <div className="p-6 pt-0 relative">
                                <div className="max-w-[80px] w-20 h-20 rounded-xl border-4 border-white shadow-sm bg-gray-100 -mt-10 overflow-hidden mb-4 relative group-hover:scale-105 transition-transform duration-300">
                                    {card.data?.profileImage ? (
                                        <img src={card.data.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <IdCard className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-gray-900 truncate">
                                    {card.data?.fullName || 'Untitled Card'}
                                </h3>
                                <p className="text-sm text-gray-500 truncate mb-4">
                                    {card.data?.jobTitle || 'No Job Title'}
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <code className="bg-gray-100 px-2 py-1 rounded text-gray-600 truncate max-w-[140px]">
                                            /card/{card.slug || '-'}
                                        </code>
                                        <span className="text-gray-400 text-xs">
                                            {new Date(card.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <a
                                            href={`/card/${card.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            View Card <ExternalLink className="w-3 h-3" />
                                        </a>

                                        <button
                                            onClick={() => handleDelete(card.id)}
                                            disabled={deletingId === card.id}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                            title="Delete Card"
                                        >
                                            {deletingId === card.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
