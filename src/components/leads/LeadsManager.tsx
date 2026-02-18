
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Download, Search, User, Mail, Phone, Calendar, CreditCard, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Lead {
    id: string;
    cardId: number;
    name: string;
    email: string;
    phone?: string;
    jobTitle?: string;
    company?: string;
    note?: string;
    submittedAt: string;
    isRead: boolean;
    cardName: string;
    cardSlug: string;
}

export function LeadsManager() {
    const { t } = useTranslation();
    const { getToken } = useAuth();
    const { user } = useUser();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const leadsPerPage = 10;

    useEffect(() => {
        if (user) {
            fetchLeads();
        }
    }, [user]);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const token = await getToken();
            const response = await fetch('/api/leads', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLeads(data.leads || []);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            const token = await getToken();
            const response = await fetch('/api/leads?format=csv', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error exporting CSV:', error);
            // Fallback: direct navigation
            window.location.href = '/api/leads?format=csv';
        }
    };

    // Filter leads based on search query
    const filteredLeads = leads.filter(lead => {
        const query = searchQuery.toLowerCase();
        return (
            lead.name.toLowerCase().includes(query) ||
            lead.email.toLowerCase().includes(query) ||
            (lead.company && lead.company.toLowerCase().includes(query)) ||
            (lead.cardName && lead.cardName.toLowerCase().includes(query))
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
    const currentLeads = filteredLeads.slice(
        (currentPage - 1) * leadsPerPage,
        currentPage * leadsPerPage
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('Leads')}</h2>
                    <p className="text-gray-500">{t('Manage and export contacts collected from your cards.')}</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {leads.length > 0 && (
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm w-full sm:w-auto"
                        >
                            <Download className="w-4 h-4" />
                            <span>{t('Export CSV')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
                    <p>{t('Loading leads...')}</p>
                </div>
            ) : leads.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="bg-blue-50 p-4 rounded-full mb-4">
                        <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('No leads yet')}</h3>
                    <p className="text-gray-500 max-w-sm mb-6">
                        {t('Share your digital business cards to start collecting contact information from people you meet.')}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('Search leads...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">{t('Name')}</th>
                                    <th className="px-6 py-4">{t('Contact')}</th>
                                    <th className="px-6 py-4">{t('Organization')}</th>
                                    <th className="px-6 py-4">{t('Card')}</th>
                                    <th className="px-6 py-4">{t('Date')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                    {lead.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{lead.name}</div>
                                                    {lead.note && (
                                                        <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate flex items-center gap-1" title={lead.note}>
                                                            <FileText className="w-3 h-3" />
                                                            {lead.note}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail className="w-3 h-3" />
                                                    <a href={`mailto:${lead.email}`} className="hover:text-blue-600 transition-colors">
                                                        {lead.email}
                                                    </a>
                                                </div>
                                                {lead.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Phone className="w-3 h-3" />
                                                        <a href={`tel:${lead.phone}`} className="hover:text-blue-600 transition-colors">
                                                            {lead.phone}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                {lead.jobTitle && <div className="font-medium text-gray-900">{lead.jobTitle}</div>}
                                                {lead.company && <div className="text-gray-500">{lead.company}</div>}
                                                {!lead.jobTitle && !lead.company && <span className="text-gray-400">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                to={`/card/${lead.cardSlug}`}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                                            >
                                                <CreditCard className="w-3 h-3" />
                                                {lead.cardName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(lead.submittedAt)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-medium text-gray-600">
                                {t('Page {{current}} of {{total}}', { current: currentPage, total: totalPages })}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
