'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'location_detected', label: 'Location Detected' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'visit_completed', label: 'Visit Completed' },
    { value: 'report_submitted', label: 'Report Submitted' },
    { value: 'finished', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'motor_spot', label: 'Motor Spot' },
    { value: 'motor_final', label: 'Motor Final' },
    { value: 'marine_final', label: 'Marine' },
    { value: 'investigation', label: 'Investigation' },
];

const getStatusColor = (status) => {
    switch (status) {
        case 'finished': return 'bg-emerald-100 text-emerald-700';
        case 'report_submitted': return 'bg-teal-100 text-teal-700';
        case 'visit_completed': return 'bg-cyan-100 text-cyan-700';
        case 'in_transit': return 'bg-blue-100 text-blue-700';
        case 'assigned': return 'bg-purple-100 text-purple-700';
        case 'location_detected': return 'bg-amber-100 text-amber-700';
        case 'pending': return 'bg-orange-100 text-orange-700';
        case 'cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-700';
    }
};

const formatType = (type) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
};

// 'finished' is the canonical terminal status; show it (and the legacy 'completed') as "Completed"
const formatStatus = (status) => {
    if (status === 'finished' || status === 'completed') return 'Completed';
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
};

// Only terminal surveys can be archived (mirrors the backend rule)
const ARCHIVABLE_STATUSES = ['finished', 'completed', 'cancelled', 'not_resolved'];
const isArchivable = (s) => ARCHIVABLE_STATUSES.includes(s);

export default function SurveysPage() {
    const searchParams = useSearchParams();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [surveyType, setSurveyType] = useState('');
    const [view, setView] = useState('active'); // 'active' | 'archived'
    const [selectedIds, setSelectedIds] = useState([]);
    const [actioning, setActioning] = useState(false);

    // Get filter params from URL
    const assignerId = searchParams.get('assigner_id');
    const surveyorId = searchParams.get('surveyor_id');
    const [filterInfo, setFilterInfo] = useState(null);

    useEffect(() => { fetchSurveys(); }, [pagination.page, status, surveyType, assignerId, surveyorId, view]);

    const fetchSurveys = async () => {
        setLoading(true);
        setSelectedIds([]);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (status) params.status = status;
            if (surveyType) params.survey_type = surveyType;
            if (assignerId) params.assigner_id = assignerId;
            if (surveyorId) params.surveyor_id = surveyorId;
            if (view === 'archived') params.archived = 'true';

            const response = await api.get('/admin/surveys', params);
            setSurveys(response.data || []);
            setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));

            // Set filter info banner
            if (assignerId && response.data?.length > 0) {
                setFilterInfo({ type: 'assigner', name: response.data[0].assigner_name });
            } else if (surveyorId && response.data?.length > 0) {
                setFilterInfo({ type: 'surveyor', name: response.data[0].surveyor_name });
            } else {
                setFilterInfo(null);
            }
        } catch (error) { console.error('Failed to fetch surveys:', error); }
        finally { setLoading(false); }
    };

    const handleSearch = (e) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 1 })); fetchSurveys(); };

    const switchView = (next) => {
        if (next === view) return;
        setView(next);
        setSelectedIds([]);
        setPagination(p => ({ ...p, page: 1 }));
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // In the active view only terminal surveys are selectable for archiving;
    // in the archived view every row can be restored.
    const selectableSurveys = surveys.filter(s => view === 'archived' || isArchivable(s.status));
    const allSelected = selectableSurveys.length > 0 && selectedIds.length === selectableSurveys.length;

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? [] : selectableSurveys.map(s => s.id));
    };

    const archiveOne = async (id, archived) => {
        setActioning(true);
        try {
            await api.put(`/admin/surveys/${id}/${archived ? 'archive' : 'unarchive'}`, {});
            fetchSurveys();
        } catch (error) {
            alert(error.message || `Failed to ${archived ? 'archive' : 'restore'} survey`);
        } finally {
            setActioning(false);
        }
    };

    const bulkArchive = async (archived) => {
        if (selectedIds.length === 0) return;
        const verb = archived ? 'Archive' : 'Restore';
        if (!confirm(`${verb} ${selectedIds.length} selected survey(s)?`)) return;
        setActioning(true);
        try {
            const res = await api.post('/admin/surveys/bulk-archive', { ids: selectedIds, archived });
            if (res?.message) alert(res.message);
            fetchSurveys();
        } catch (error) {
            alert(error.message || `Failed to ${verb.toLowerCase()} surveys`);
        } finally {
            setActioning(false);
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="space-y-4">
            {/* Filter Banner */}
            {(assignerId || surveyorId) && (
                <div className="bg-[#AC9AFD]/10 border border-[#AC9AFD]/20 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#AC9AFD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span className="text-sm font-medium text-[#AC9AFD]">
                            Filtered by {filterInfo?.type === 'assigner' ? 'Assigner' : 'Surveyor'}:
                            <span className="font-semibold ml-1">{filterInfo?.name || 'Loading...'}</span>
                        </span>
                    </div>
                    <Link href="/surveys" className="text-sm font-medium text-[#AC9AFD] hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear Filter
                    </Link>
                </div>
            )}

            {/* View toggle + bulk actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                    <button onClick={() => switchView('active')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'active' ? 'bg-[#AC9AFD] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Active</button>
                    <button onClick={() => switchView('archived')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'archived' ? 'bg-[#AC9AFD] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Archived</button>
                </div>
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">{selectedIds.length} selected</span>
                        {view === 'active' ? (
                            <button disabled={actioning} onClick={() => bulkArchive(true)} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">Archive selected</button>
                        ) : (
                            <button disabled={actioning} onClick={() => bulkArchive(false)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">Restore selected</button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[300px]">
                    <input type="text" placeholder="Search by LAID, case reference, assigner..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" />
                    <button type="submit" className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Search</button>
                </form>
                <div className="flex gap-2 items-center">
                    <CustomSelect
                        value={status}
                        onChange={(val) => { setStatus(val); setPagination(p => ({ ...p, page: 1 })); }}
                        options={statusOptions}
                        placeholder="All Status"
                        className="w-44"
                    />
                    <CustomSelect
                        value={surveyType}
                        onChange={(val) => { setSurveyType(val); setPagination(p => ({ ...p, page: 1 })); }}
                        options={typeOptions}
                        placeholder="All Types"
                        className="w-40"
                    />
                    <Link href="/surveys/new" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Create Survey
                    </Link>
                </div>
            </div>

            <p className="text-sm text-slate-500">{pagination.total} survey{pagination.total !== 1 ? 's' : ''} found</p>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>
                ) : surveys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-4">
                        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>
                        <p>No surveys found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-4 py-3 w-10">
                                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={selectableSurveys.length === 0} className="rounded border-slate-300 cursor-pointer" />
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">LAID</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Case Ref</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigner</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Surveyor</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {surveys.map((survey) => (
                                    <tr key={survey.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            {(view === 'archived' || isArchivable(survey.status)) && (
                                                <input type="checkbox" checked={selectedIds.includes(survey.id)} onChange={() => toggleSelect(survey.id)} className="rounded border-slate-300 cursor-pointer" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-800">{survey.laid || `#${survey.id}`}</span>
                                                {survey.is_emergency && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">⚡ Emergency</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{formatType(survey.survey_type)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{survey.case_reference || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{survey.assigner_name || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{survey.surveyor_name || <span className="text-amber-600">Unassigned</span>}</td>
                                        <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(survey.status)}`}>{formatStatus(survey.status)}</span></td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(survey.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Link href={`/surveys/${survey.id}`} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">View</Link>
                                                {view === 'archived' ? (
                                                    <button disabled={actioning} onClick={() => archiveOne(survey.id, false)} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 text-emerald-700 text-xs font-medium rounded-lg transition-colors">Restore</button>
                                                ) : isArchivable(survey.status) ? (
                                                    <button disabled={actioning} onClick={() => archiveOne(survey.id, true)} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 text-amber-700 text-xs font-medium rounded-lg transition-colors">Archive</button>
                                                ) : null}
                                            </div>
                                        </td>
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
        </div>
    );
}
