'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { PrimeBadge, CategoryChips } from '@/components/CategoryChips';

// Profile pictures come back as relative paths — same handling as the surveyors pages.
const UPLOADS_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

const formatINR = (amount) =>
    `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * v2 §4: the server decides the sign convention and hands back `direction` and an
 * always-positive `amount`. This only picks admin-facing wording — the server's
 * own label is written for the assigner ("You owe").
 */
const LEDGER_DIRECTION = {
    assigner_owes: { title: 'Assigner owes the platform', className: 'text-amber-700' },
    admin_owes: { title: 'Platform owes the assigner', className: 'text-emerald-700' },
    settled: { title: 'Settled', className: 'text-slate-800' },
};

// Pencil icon component
const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-slate-400 hover:text-[#AC9AFD] transition-colors">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
);

/**
 * v2 §2: team membership is consent-gated employment. Only 'accepted' rows are
 * direct-assignable — a pending row is an invite the surveyor has not answered.
 */
const TEAM_STATUS = {
    pending: { label: 'Invite pending', className: 'bg-amber-100 text-amber-700' },
    accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
    declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
};

/** The consequence of each state, in one line — the part an admin actually needs. */
const memberNote = (status, isPrime) => {
    if (status === 'pending') return 'Not on the team yet — cannot be direct-assigned until they accept.';
    if (status === 'declined') return 'Declined the invite. Invite again to ask a second time.';
    if (!isPrime) return 'Non-Prime employee — excluded from open broadcasts. Only this assigner can send them work.';
    return null;
};

export default function AssignerDetailPage() {
    const params = useParams();
    const [assigner, setAssigner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'success' });

    // Edit state
    const [editingSection, setEditingSection] = useState(null);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);

    // Team state
    const [team, setTeam] = useState([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addResults, setAddResults] = useState([]);
    const [addingSurveyorId, setAddingSurveyorId] = useState(null);
    const [searchingTeam, setSearchingTeam] = useState(false);

    // Ledger balance (v2 §4) — shown here so an admin does not have to navigate to see it.
    const [ledger, setLedger] = useState(null);

    useEffect(() => { fetchAssigner(); fetchTeam(); fetchLedger(); }, [params.id]);

    const fetchAssigner = async () => {
        try { const response = await api.get(`/admin/assigners/${params.id}`); setAssigner(response.data); }
        catch (error) { console.error('Failed to fetch assigner:', error); }
        finally { setLoading(false); }
    };

    const fetchLedger = async () => {
        try { const response = await api.get(`/admin/assigners/${params.id}/ledger/summary`); setLedger(response.data); }
        catch (error) { console.error('Failed to fetch ledger summary:', error); }
    };

    const fetchTeam = async () => {
        setTeamLoading(true);
        try {
            const response = await api.get(`/admin/assigners/${params.id}/team`);
            setTeam(response.data?.members || []);
        } catch (err) {
            console.error('Failed to fetch team:', err);
        } finally {
            setTeamLoading(false);
        }
    };

    const searchSurveyors = async (q) => {
        setAddSearch(q);
        if (!q || q.trim().length < 2) {
            setAddResults([]);
            return;
        }
        setSearchingTeam(true);
        try {
            const response = await api.get('/admin/surveyors', { search: q, limit: 20, verification: 'verified' });
            const items = response.data || [];
            // Declined rows stay for audit but may be re-invited, so they remain searchable.
            const teamIds = new Set(team.filter(m => m.status !== 'declined').map(m => m.id));
            setAddResults(items.filter(s => !teamIds.has(s.id)));
        } catch (err) {
            console.error('Search surveyors failed:', err);
        } finally {
            setSearchingTeam(false);
        }
    };

    const inviteTeamMember = async (surveyor) => {
        const name = surveyor.full_name || 'this surveyor';
        if (!confirm(`Send a team invite to ${name}?\n\nThey are NOT added immediately — they join the team only after they accept, and they can decline.`)) return;
        setAddingSurveyorId(surveyor.id);
        try {
            const response = await api.post(`/admin/assigners/${params.id}/team`, { surveyor_id: surveyor.id });
            // The server writes this message for humans — show it verbatim when present.
            showAlert('Invite sent', response.message || `Invitation sent to ${name}. They join the team once they accept.`, 'success');
            setAddSearch('');
            setAddResults([]);
            setShowAddTeam(false);
            fetchTeam();
        } catch (err) {
            showAlert('Error', err.message || 'Failed to send invite');
        } finally {
            setAddingSurveyorId(null);
        }
    };

    const removeTeamMember = async (member) => {
        const name = member.full_name || 'this surveyor';
        const status = member.status || 'accepted';
        const message = status === 'pending'
            ? `Cancel the pending invite for ${name}?\n\nThey were never added to the team, so nothing else changes.`
            : status === 'declined'
                ? `Delete the declined invite for ${name}?\n\nThey are not on the team — this only clears the record.`
                : `Remove ${name} from the team?\n\nThis assigner will no longer be able to directly assign surveys to them.`;
        if (!confirm(message)) return;
        try {
            await api.delete(`/admin/assigners/${params.id}/team/${member.id}`);
            fetchTeam();
        } catch (err) {
            showAlert('Error', err.message || 'Failed to remove team entry');
        }
    };

    const showAlert = (title, message, type = 'error') => {
        setAlertModal({ show: true, title, message, type });
    };

    const startEditing = (section) => {
        const data = {};
        if (section === 'account') {
            data.email = assigner.email || '';
        } else if (section === 'company') {
            data.company_name = assigner.company_name || '';
            data.contact_person_name = assigner.contact_person_name || '';
            data.gst_number = assigner.gst_number || '';
        } else if (section === 'address') {
            data.address = assigner.address || '';
            data.city = assigner.city || '';
            data.state = assigner.state || '';
            data.pincode = assigner.pincode || '';
        } else if (section === 'bank') {
            data.bank_account_holder_name = assigner.bank_account_holder_name || '';
            data.bank_account_number_encrypted = assigner.bank_account_number_encrypted || '';
            data.bank_ifsc_code = assigner.bank_ifsc_code || '';
            data.bank_name = assigner.bank_name || '';
        }
        setEditData(data);
        setEditingSection(section);
    };

    const cancelEditing = () => {
        setEditingSection(null);
        setEditData({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/admin/assigners/${params.id}`, editData);
            showAlert('Success', 'Assigner details updated successfully!', 'success');
            setEditingSection(null);
            fetchAssigner();
        } catch (error) {
            showAlert('Error', 'Failed to update: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleDirectAssign = async () => {
        const next = !assigner.is_direct_assign;
        if (!confirm(`${next ? 'Enable' : 'Disable'} direct assignment for this assigner?`)) return;
        try {
            await api.put(`/admin/assigners/${params.id}`, { is_direct_assign: next });
            showAlert('Success', `Direct assignment ${next ? 'enabled' : 'disabled'}`, 'success');
            fetchAssigner();
        } catch (err) {
            showAlert('Error', err.message || 'Failed to update');
        }
    };

    const handleToggleActive = async () => {
        const action = assigner.is_active ? 'deactivate' : 'activate';
        if (!confirm(`Are you sure you want to ${action} this assigner?`)) return;
        setActionLoading(true);
        try {
            await api.put(`/admin/assigners/${params.id}/${action}`);
            showAlert('Success', `Assigner has been ${action}d successfully!`, 'success');
            fetchAssigner();
        }
        catch (error) { showAlert('Error', `Failed to ${action} assigner: ` + error.message); }
        finally { setActionLoading(false); }
    };

    // Inline rendering helpers (not separate components to avoid remount)
    const renderEditableField = (label, field, type = 'text') => {
        const isEditing = editingSection && field in editData;
        return (
            <div key={field} className="flex justify-between gap-4 items-center">
                <span className="text-sm text-slate-500">{label}</span>
                {isEditing ? (
                    <input
                        type={type}
                        value={editData[field] || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
                        className="text-sm font-medium text-slate-800 text-right bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#AC9AFD] w-48"
                    />
                ) : (
                    <span className="text-sm font-medium text-slate-800">{assigner[field] || 'Not provided'}</span>
                )}
            </div>
        );
    };

    const renderSectionHeader = (title, section) => (
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
            {editingSection === section ? (
                <div className="flex gap-2">
                    <button onClick={cancelEditing} className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-xs font-medium text-white bg-[#AC9AFD] hover:bg-[#9B85FC] rounded-lg transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            ) : (
                <button onClick={() => startEditing(section)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                    <PencilIcon />
                </button>
            )}
        </div>
    );

    if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-3 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>;
    if (!assigner) return <div className="flex flex-col items-center justify-center py-16 gap-4"><p className="text-slate-500">Assigner not found</p><Link href="/assigners" className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Back to Assigners</Link></div>;

    return (
        <div className="space-y-6">
            <Link href="/assigners" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-[#AC9AFD] hover:text-[#AC9AFD] transition-all">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Assigners
            </Link>

            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-2xl text-white">
                        {assigner.company_name?.charAt(0) || 'A'}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-1">{assigner.company_name || 'No Company Name'}</h2>
                        <p className="text-sm text-slate-500 mb-2">{assigner.email}</p>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${assigner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {assigner.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Balance</span>
                    {ledger ? (
                        <>
                            <span className={`text-2xl font-bold tabular-nums ${(LEDGER_DIRECTION[ledger.direction] || LEDGER_DIRECTION.settled).className}`}>
                                {formatINR(ledger.amount)}
                            </span>
                            <span className="text-xs text-slate-500">{(LEDGER_DIRECTION[ledger.direction] || LEDGER_DIRECTION.settled).title}</span>
                            {ledger.integrity?.consistent === false && (
                                <span className="text-xs font-medium text-red-600">Balance has drifted — open the ledger</span>
                            )}
                        </>
                    ) : (
                        <span className="text-sm text-slate-400">—</span>
                    )}
                    <Link href={`/assigners/${params.id}/ledger`} className="text-sm font-medium text-[#7C6BD6] hover:underline">
                        View ledger →
                    </Link>
                </div>
                <button
                    onClick={handleToggleActive}
                    disabled={actionLoading}
                    className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${assigner.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-50`}
                >
                    {actionLoading ? '...' : assigner.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    {renderSectionHeader('Account Information', 'account')}
                    <div className="space-y-3">
                        {renderEditableField('Email', 'email', 'email')}
                        <div className="flex justify-between gap-4 items-center"><span className="text-sm text-slate-500">Phone</span><span className="text-sm font-medium text-slate-800">{assigner.phone}</span></div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-slate-500">Status</span>
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${assigner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{assigner.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="flex justify-between gap-4 items-center">
                            <span className="text-sm text-slate-500">Direct Assignment</span>
                            <button
                                onClick={handleToggleDirectAssign}
                                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${assigner.is_direct_assign ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                title="Toggle direct assignment permission"
                            >
                                {assigner.is_direct_assign ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    {renderSectionHeader('Company Details', 'company')}
                    <div className="space-y-3">
                        {renderEditableField('Company Name', 'company_name')}
                        {renderEditableField('Contact Person', 'contact_person_name')}
                        {renderEditableField('GST Number', 'gst_number')}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    {renderSectionHeader('Address', 'address')}
                    <div className="space-y-3">
                        {renderEditableField('Street', 'address')}
                        {renderEditableField('City', 'city')}
                        {renderEditableField('State', 'state')}
                        {renderEditableField('Pincode', 'pincode')}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    {renderSectionHeader('Bank Details', 'bank')}
                    <div className="space-y-3">
                        {renderEditableField('Beneficiary Name', 'bank_account_holder_name')}
                        {renderEditableField('Account Number', 'bank_account_number_encrypted')}
                        {renderEditableField('IFSC Code', 'bank_ifsc_code')}
                        {renderEditableField('Bank Name', 'bank_name')}
                    </div>
                    <p className="text-xs text-slate-500 mt-4">Needed to refund a credit balance back to this assigner.</p>
                </div>
            </div>

            {/* Surveyor Team */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4 pb-2 border-b border-slate-200 gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Surveyor Team</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {assigner.is_direct_assign
                                ? 'Team membership is employment, so the surveyor must accept it. Only accepted members can be directly assigned; an accepted member who is not Prime stops receiving open broadcasts.'
                                : 'This assigner does not have direct assignment enabled. Enable it in Account Information to build a team.'}
                        </p>
                    </div>
                    {assigner.is_direct_assign && (
                        <button
                            onClick={() => { setShowAddTeam(true); setAddSearch(''); setAddResults([]); }}
                            className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-[#AC9AFD] hover:bg-[#9B85FC] rounded-lg transition-colors"
                        >
                            + Invite Surveyor
                        </button>
                    )}
                </div>

                {teamLoading ? (
                    <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>
                ) : team.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                        {assigner.is_direct_assign
                            ? 'No surveyors in team yet. Invite some so this assigner can directly assign surveys once they accept.'
                            : 'Direct assignment is disabled for this assigner.'}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {team.map((m) => {
                            const status = m.status || 'accepted';
                            const badge = TEAM_STATUS[status] || TEAM_STATUS.accepted;
                            const note = memberNote(status, m.is_prime);
                            const isPending = status === 'pending';
                            // A declined row is neither a member nor a live invite — say so.
                            const removeAction = status === 'accepted' ? 'Remove from team' : isPending ? 'Cancel invite' : 'Delete invite record';
                            return (
                                <div key={m.id} className={`border rounded-lg p-3 space-y-2.5 ${isPending ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600 overflow-hidden shrink-0">
                                            {m.profile_picture_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={m.profile_picture_url.startsWith('http') ? m.profile_picture_url : `${UPLOADS_BASE_URL}${m.profile_picture_url}`}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = (m.full_name?.[0] || 'S').toUpperCase(); }}
                                                />
                                            ) : (m.full_name?.[0] || 'S').toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">{m.full_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{m.phone}{m.city ? ` · ${m.city}` : ''}</p>
                                        </div>
                                        <button
                                            onClick={() => removeTeamMember(m)}
                                            className="shrink-0 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title={removeAction}
                                            aria-label={`${removeAction}: ${m.full_name}`}
                                        >
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${badge.className}`}>{badge.label}</span>
                                        <PrimeBadge isPrime={m.is_prime} />
                                        <CategoryChips categories={m.categories} max={3} />
                                    </div>
                                    {note && <p className={`text-xs ${isPending ? 'text-amber-700' : 'text-slate-500'}`}>{note}</p>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Team Member Modal */}
            {showAddTeam && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowAddTeam(false)}>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Invite Surveyor to Team</h3>
                            <button onClick={() => setShowAddTeam(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                            This sends an invite the surveyor must accept — it does not add them to the team. They stay on open broadcasts until they respond.
                        </p>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search by name, phone, or email"
                            value={addSearch}
                            onChange={(e) => searchSurveyors(e.target.value)}
                            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#AC9AFD] mb-3"
                        />
                        <div className="max-h-80 overflow-y-auto">
                            {searchingTeam ? (
                                <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>
                            ) : addSearch.trim().length < 2 ? (
                                <p className="text-sm text-slate-500 text-center py-6">Type at least 2 characters to search verified surveyors.</p>
                            ) : addResults.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-6">No matching surveyors found.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {addResults.map((s) => (
                                        <li key={s.id} className="flex items-center justify-between py-2 gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">{s.full_name}</p>
                                                <p className="text-xs text-slate-500 truncate">{s.phone}{s.city ? ` · ${s.city}` : ''}</p>
                                                {/* Prime is what decides whether accepting costs them open broadcasts — show it before inviting. */}
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <PrimeBadge isPrime={s.is_prime} />
                                                    <CategoryChips categories={s.categories} max={3} />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => inviteTeamMember(s)}
                                                disabled={addingSurveyorId === s.id}
                                                className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-[#AC9AFD] hover:bg-[#9B85FC] rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {addingSurveyorId === s.id ? 'Inviting...' : 'Invite'}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Timestamps */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Audit Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-slate-500">Created At</p>
                        <p className="text-sm font-medium text-slate-800">{new Date(assigner.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-slate-500">Last Updated</p>
                        <p className="text-sm font-medium text-slate-800">{new Date(assigner.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                    {assigner.last_login_at && (
                        <div className="space-y-1">
                            <p className="text-sm text-slate-500">Last Login</p>
                            <p className="text-sm font-medium text-slate-800">{new Date(assigner.last_login_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Alert Modal */}
            {alertModal.show && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setAlertModal({ ...alertModal, show: false })}>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center mb-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${alertModal.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                <svg className={`w-7 h-7 ${alertModal.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={alertModal.type === 'success' ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">{alertModal.title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{alertModal.message}</p>
                        </div>
                        <button onClick={() => setAlertModal({ ...alertModal, show: false })} className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">OK</button>
                    </div>
                </div>
            )}
        </div>
    );
}
