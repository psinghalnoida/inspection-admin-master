'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import socketService from '@/lib/socket';
import CustomSelect from '@/components/CustomSelect';
import { SURVEYOR_CATEGORIES, PrimeBadge, CategoryChips } from '@/components/CategoryChips';

const UPLOADS_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

const verificationOptions = [
    { value: '', label: 'All Verification' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
];

const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...SURVEYOR_CATEGORIES,
];

const primeOptions = [
    { value: '', label: 'All Surveyors' },
    { value: 'true', label: 'Prime only' },
    { value: 'false', label: 'Investigator only' },
];

export default function SurveyorsPage() {
    const searchParams = useSearchParams();
    const [surveyors, setSurveyors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [verification, setVerification] = useState(searchParams.get('verification') || '');
    const [category, setCategory] = useState(searchParams.get('category') || '');
    const [prime, setPrime] = useState(searchParams.get('prime') || '');

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { fetchSurveyors(); }, [pagination.page, status, verification, category, prime]);

    // Real-time surveyor availability updates
    useEffect(() => {
        let mounted = true;

        const setupSocket = async () => {
            try {
                const socket = await socketService.connect();
                if (socket && mounted) {
                    console.log('📡 Admin socket connected for surveyor updates');

                    // Remove any existing listener first
                    socket.off('surveyor:availability');

                    // Add listener for surveyor availability updates
                    socket.on('surveyor:availability', (data) => {
                        console.log('📡 Surveyor availability update received:', data);
                        if (mounted) {
                            setSurveyors(prev => prev.map(s =>
                                s.id === data.surveyorId
                                    ? { ...s, is_available: data.isAvailable }
                                    : s
                            ));
                        }
                    });
                }
            } catch (err) {
                console.error('Socket connection error:', err);
            }
        };

        setupSocket();

        return () => {
            mounted = false;
            // Get socket from service and remove listener
            if (socketService.socket) {
                socketService.socket.off('surveyor:availability');
            }
        };
    }, []);

    const fetchSurveyors = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (status) params.status = status;
            if (verification) params.verification = verification;
            if (category) params.category = category;
            if (prime) params.prime = prime;
            const response = await api.get('/admin/surveyors', params);
            setSurveyors(response.data || []);
            setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));
        } catch (error) { console.error('Failed to fetch surveyors:', error); }
        finally { setLoading(false); }
    };

    const handleSearch = (e) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 1 })); fetchSurveyors(); };

    const openDeleteModal = (id, name) => {
        setDeleteModal({ show: true, id, name });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ show: false, id: null, name: '' });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/admin/surveyors/${deleteModal.id}`);
            closeDeleteModal();
            fetchSurveyors();
        } catch (error) {
            alert(`Failed to delete surveyor: ` + error.message);
        } finally {
            setDeleting(false);
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[300px]">
                    <input type="text" placeholder="Search by name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" />
                    <button type="submit" className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Search</button>
                </form>
                <div className="flex flex-wrap gap-2">
                    <CustomSelect
                        value={status}
                        onChange={(val) => { setStatus(val); setPagination(p => ({ ...p, page: 1 })); }}
                        options={statusOptions}
                        placeholder="All Status"
                        className="w-40"
                    />
                    <CustomSelect
                        value={verification}
                        onChange={(val) => { setVerification(val); setPagination(p => ({ ...p, page: 1 })); }}
                        options={verificationOptions}
                        placeholder="All Verification"
                        className="w-44"
                    />
                    <CustomSelect
                        value={category}
                        onChange={(val) => { setCategory(val); setPagination(p => ({ ...p, page: 1 })); }}
                        options={categoryOptions}
                        placeholder="All Categories"
                        className="w-44"
                    />
                    <CustomSelect
                        value={prime}
                        onChange={(val) => { setPrime(val); setPagination(p => ({ ...p, page: 1 })); }}
                        options={primeOptions}
                        placeholder="All Surveyors"
                        className="w-44"
                    />
                </div>
            </div>

            <p className="text-sm text-slate-500">{pagination.total} surveyor{pagination.total !== 1 ? 's' : ''} found</p>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>
                ) : surveyors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" className="mb-4"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                        <p>No surveyors found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Surveyor</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {surveyors.map((surveyor) => (
                                    <tr key={surveyor.id} className="hover:bg-slate-50 align-top">
                                        {/* Surveyor: identity + phone + live online status all in one cell */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="relative shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-[#AC9AFD] flex items-center justify-center font-semibold text-sm text-white overflow-hidden">{surveyor.profile_picture_url ? <img src={surveyor.profile_picture_url.startsWith('http') ? surveyor.profile_picture_url : `${UPLOADS_BASE_URL}${surveyor.profile_picture_url}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = surveyor.full_name?.charAt(0) || 'S'; }} /> : surveyor.full_name?.charAt(0) || 'S'}</div>
                                                    <span title={surveyor.is_available ? 'Online' : 'Offline'} className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${surveyor.is_available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">{surveyor.full_name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{surveyor.email}</p>
                                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                                        <span className="text-slate-600 tabular-nums">{surveyor.phone}</span>
                                                        <span className="text-slate-300">·</span>
                                                        <span className={surveyor.is_available ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{surveyor.is_available ? 'Online' : 'Offline'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Location: city over state, two tidy lines instead of a 4-line wrap */}
                                        <td className="px-4 py-3">
                                            {surveyor.city ? (
                                                <div className="leading-tight">
                                                    <p className="text-sm text-slate-700 whitespace-nowrap">{surveyor.city}</p>
                                                    <p className="text-xs text-slate-400 whitespace-nowrap">{surveyor.state}</p>
                                                </div>
                                            ) : <span className="text-sm text-slate-400">—</span>}
                                        </td>
                                        {/* Status: account state + KYC verification stacked */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col items-start gap-1.5">
                                                <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${surveyor.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{surveyor.is_active ? 'Active' : 'Inactive'}</span>
                                                <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${surveyor.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : surveyor.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' : surveyor.verification_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-[#AC9AFD]/10 text-[#AC9AFD]'}`}>{surveyor.verification_status}</span>
                                            </div>
                                        </td>
                                        {/* Categories: Prime badge + licence chips */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col items-start gap-1.5 min-w-[132px]">
                                                <PrimeBadge isPrime={surveyor.is_prime} />
                                                <CategoryChips categories={surveyor.categories} max={3} />
                                            </div>
                                        </td>
                                        {/* Activity: survey count (link) over join date */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col items-start gap-1.5">
                                                <Link href={`/surveys?surveyor_id=${surveyor.id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#AC9AFD]/10 hover:bg-[#AC9AFD]/20 text-[#AC9AFD] text-xs font-semibold rounded-lg transition-colors">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                    {surveyor.survey_count ?? 0} Surveys
                                                </Link>
                                                <span className="text-xs text-slate-400 whitespace-nowrap">Joined {new Date(surveyor.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        {/* Actions — icon buttons keep this column compact so all 6 fit one screen */}
                                        <td className="px-4 py-3"><div className="flex gap-1.5 justify-end">
                                            <Link href={`/surveyors/${surveyor.id}`} title="View" aria-label={`View ${surveyor.full_name}`} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </Link>
                                            <Link href={`/surveyors/${surveyor.id}/edit`} title="Edit" aria-label={`Edit ${surveyor.full_name}`} className="w-8 h-8 flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </Link>
                                            <button onClick={() => openDeleteModal(surveyor.id, surveyor.full_name)} title="Delete" aria-label={`Delete ${surveyor.full_name}`} className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm rounded-lg transition-colors" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</button>
                    <span className="text-sm text-slate-500">Page {pagination.page} of {totalPages}</span>
                    <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm rounded-lg transition-colors" disabled={pagination.page >= totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className="text-red-600">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">Delete Surveyor</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">
                            Are you sure you want to delete <strong className="text-slate-700">{deleteModal.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
