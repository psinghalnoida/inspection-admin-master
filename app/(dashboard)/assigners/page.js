'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

export default function AssignersPage() {
    const [assigners, setAssigners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { fetchAssigners(); }, [pagination.page, status]);

    const fetchAssigners = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (status) params.status = status;
            const response = await api.get('/admin/assigners', params);
            setAssigners(response.data || []);
            setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));
        } catch (error) { console.error('Failed to fetch assigners:', error); }
        finally { setLoading(false); }
    };

    const handleSearch = (e) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 1 })); fetchAssigners(); };

    const handleToggleStatus = async (id, isActive) => {
        const action = isActive ? 'deactivate' : 'activate';
        if (!confirm(`Are you sure you want to ${action} this assigner?`)) return;
        setActionLoading(id);
        try { await api.put(`/admin/assigners/${id}/${action}`); fetchAssigners(); }
        catch (error) { alert(`Failed to ${action} assigner: ` + error.message); }
        finally { setActionLoading(null); }
    };

    const openDeleteModal = (id, name) => {
        setDeleteModal({ show: true, id, name });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ show: false, id: null, name: '' });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/admin/assigners/${deleteModal.id}`);
            closeDeleteModal();
            fetchAssigners();
        } catch (error) {
            alert(`Failed to delete assigner: ` + error.message);
        } finally {
            setDeleting(false);
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[300px]">
                    <input type="text" placeholder="Search by company, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" />
                    <button type="submit" className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Search</button>
                </form>
                <div className="flex gap-2 items-center">
                    <CustomSelect
                        value={status}
                        onChange={(val) => { setStatus(val); setPagination(p => ({ ...p, page: 1 })); }}
                        options={statusOptions}
                        placeholder="All Status"
                        className="w-40"
                    />
                    <Link href="/assigners/new" className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">+ Add Assigner</Link>
                </div>
            </div>

            <p className="text-sm text-slate-500">{pagination.total} assigner{pagination.total !== 1 ? 's' : ''} found</p>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>
                ) : assigners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-4">
                        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd" /></svg>
                        <p>No assigners found</p>
                        <Link href="/assigners/new" className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Add First Assigner</Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Surveys</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {assigners.map((assigner) => (
                                    <tr key={assigner.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-semibold text-sm text-white">{assigner.company_name?.charAt(0) || 'A'}</div><div><p className="font-medium text-slate-800">{assigner.company_name || 'No Company'}</p><p className="text-xs text-slate-500">{assigner.email}</p></div></div></td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{assigner.contact_person_name || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{assigner.phone}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{assigner.city ? `${assigner.city}, ${assigner.state}` : '-'}</td>
                                        <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${assigner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{assigner.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td className="px-4 py-3">
                                            <Link href={`/surveys?assigner_id=${assigner.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#AC9AFD]/10 hover:bg-[#AC9AFD]/20 text-[#AC9AFD] text-xs font-semibold rounded-lg transition-colors">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                {assigner.survey_count ?? 0} Surveys
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(assigner.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3"><div className="flex gap-2">
                                            <Link href={`/assigners/${assigner.id}`} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">View</Link>
                                            <Link href={`/assigners/${assigner.id}/edit`} className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors">Edit</Link>
                                            <button onClick={() => handleToggleStatus(assigner.id, assigner.is_active)} disabled={actionLoading === assigner.id} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${assigner.is_active ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}>{actionLoading === assigner.id ? '...' : assigner.is_active ? 'Deactivate' : 'Activate'}</button>
                                            <button onClick={() => openDeleteModal(assigner.id, assigner.company_name)} disabled={actionLoading === assigner.id} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">Delete</button>
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
                        <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">Delete Assigner</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">
                            Are you sure you want to delete <strong className="text-slate-700">{deleteModal.name || 'this assigner'}</strong>? This action cannot be undone.
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
