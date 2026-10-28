'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import { SURVEYOR_CATEGORIES, PrimeBadge, categoryLabel, isGrantExpired, toDateInputValue, formatGrantDate } from '@/components/CategoryChips';

const UPLOADS_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

// Icons
const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9V11m4 4V11" />
    </svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const ReplaceIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6m12-4a9 9 0 01-15 6.7L3 16" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

const XIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);

// Pencil icon component
const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-slate-400 hover:text-[#AC9AFD] transition-colors">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
);

export default function SurveyorDetailPage() {
    const params = useParams();
    const [surveyor, setSurveyor] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showToggleActiveModal, setShowToggleActiveModal] = useState(false);
    const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'success' });
    const [imageErrors, setImageErrors] = useState({});

    // Upload state
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadDocType, setUploadDocType] = useState('government_id');

    // Edit state
    const [editingSection, setEditingSection] = useState(null); // 'personal', 'location', 'bank'
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);

    // Licence category state (v2 §1). catDraft === null means "not editing";
    // otherwise it is a map of category -> { license_number, valid_until }.
    const [catDraft, setCatDraft] = useState(null);
    const [savingCategories, setSavingCategories] = useState(false);
    const [verifyCategories, setVerifyCategories] = useState([]);

    useEffect(() => { fetchSurveyor(); }, [params.id]);

    const fetchSurveyor = async () => {
        try {
            const response = await api.get(`/admin/surveyors/${params.id}`);
            setSurveyor(response.data);
            try {
                const walletRes = await api.get(`/admin/payouts/wallets/${params.id}`);
                setWallet(walletRes.data);
            } catch (e) {
                console.log('No wallet data:', e.message);
            }
        }
        catch (error) { console.error('Failed to fetch surveyor:', error); }
        finally { setLoading(false); }
    };

    const showAlert = (title, message, type = 'error') => {
        setAlertModal({ show: true, title, message, type });
    };

    const startEditing = (section) => {
        const data = {};
        if (section === 'personal') {
            data.full_name = surveyor.full_name || '';
            data.email = surveyor.email || '';
            data.surveyor_license_id = surveyor.surveyor_license_id || '';
            data.business_address = surveyor.business_address || '';
        } else if (section === 'location') {
            data.city = surveyor.city || '';
            data.state = surveyor.state || '';
            data.pincode = surveyor.pincode || '';
        } else if (section === 'bank') {
            data.bank_holder_name = surveyor.bank_account_holder_name || '';
            data.bank_account_number = surveyor.bank_account_number_encrypted || '';
            data.bank_ifsc_code = surveyor.bank_ifsc_code || '';
            data.upi_id = surveyor.upi_id || '';
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
            const updatePayload = { ...editData };
            // Map frontend field names to backend field names for bank section
            if (editingSection === 'bank') {
                if (editData.bank_account_number !== undefined) {
                    updatePayload.bank_account_number_encrypted = editData.bank_account_number;
                    delete updatePayload.bank_account_number;
                }
                if (editData.bank_holder_name !== undefined) {
                    updatePayload.bank_account_holder_name = editData.bank_holder_name;
                    delete updatePayload.bank_holder_name;
                }
            }
            await api.put(`/admin/surveyors/${params.id}`, updatePayload);
            showAlert('Success', 'Surveyor details updated successfully!', 'success');
            setEditingSection(null);
            fetchSurveyor();
        } catch (error) {
            showAlert('Error', 'Failed to update: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleVerify = async () => {
        setShowVerifyModal(false);
        setActionLoading(true);
        try {
            // v2 §1.6 — the admin decides the licensed categories at approval time.
            // An empty array is a valid choice: it approves the surveyor as investigator-only.
            // The endpoint replaces the whole set, so carry any existing licence number /
            // expiry back or approving would blank them.
            const existing = {};
            (surveyor.category_grants || []).forEach((g) => { existing[g.category] = g; });
            const categories = verifyCategories.map((c) => {
                const g = existing[c];
                if (!g) return c;
                return {
                    category: c,
                    ...(g.license_number ? { license_number: g.license_number } : {}),
                    ...(g.valid_until ? { valid_until: toDateInputValue(g.valid_until) } : {}),
                };
            });
            await api.put(`/admin/surveyors/${params.id}/verify`, { categories });
            showAlert('Success', verifyCategories.length > 0
                ? `Surveyor verified as Prime (${verifyCategories.map(categoryLabel).join(', ')}).`
                : 'Surveyor verified as Investigator only — no licence categories granted.', 'success');
            fetchSurveyor();
        }
        catch (error) { showAlert('Error', 'Failed to verify surveyor: ' + error.message); }
        finally { setActionLoading(false); }
    };

    const openVerifyModal = () => {
        // Pre-tick anything already granted so re-verifying never silently revokes it.
        setVerifyCategories((surveyor.category_grants || []).map((g) => g.category));
        setShowVerifyModal(true);
    };

    const toggleVerifyCategory = (value) => {
        setVerifyCategories((prev) => prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]);
    };

    const startCategoryEdit = () => {
        const draft = {};
        (surveyor.category_grants || []).forEach((g) => {
            draft[g.category] = {
                license_number: g.license_number || '',
                valid_until: toDateInputValue(g.valid_until),
            };
        });
        setCatDraft(draft);
    };

    const toggleDraftCategory = (value) => {
        setCatDraft((prev) => {
            const next = { ...prev };
            if (next[value]) delete next[value];
            else next[value] = { license_number: '', valid_until: '' };
            return next;
        });
    };

    const setDraftField = (value, field, fieldValue) => {
        setCatDraft((prev) => ({ ...prev, [value]: { ...prev[value], [field]: fieldValue } }));
    };

    const handleSaveCategories = async () => {
        setSavingCategories(true);
        try {
            // The endpoint replaces the whole set, so always send the complete desired list.
            const categories = Object.entries(catDraft).map(([category, v]) => ({
                category,
                ...(v.license_number ? { license_number: v.license_number } : {}),
                ...(v.valid_until ? { valid_until: v.valid_until } : {}),
            }));
            await api.put(`/admin/surveyors/${params.id}/categories`, { categories });
            showAlert('Success', categories.length > 0
                ? 'Licence categories updated.'
                : 'All licence categories revoked — surveyor is Investigator only.', 'success');
            setCatDraft(null);
            fetchSurveyor();
        }
        catch (error) { showAlert('Error', 'Failed to update categories: ' + error.message); }
        finally { setSavingCategories(false); }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) { showAlert('Validation Error', 'Please provide a rejection reason'); return; }
        setActionLoading(true);
        try {
            await api.put(`/admin/surveyors/${params.id}/reject`, { rejection_reason: rejectReason });
            setShowRejectModal(false);
            setRejectReason('');
            showAlert('Success', 'Surveyor has been rejected.', 'success');
            fetchSurveyor();
        }
        catch (error) { showAlert('Error', 'Failed to reject surveyor: ' + error.message); }
        finally { setActionLoading(false); }
    };

    const handleToggleActive = async () => {
        const action = surveyor.is_active ? 'deactivate' : 'activate';
        setShowToggleActiveModal(false);
        setActionLoading(true);
        try {
            await api.put(`/admin/surveyors/${params.id}/${action}`);
            showAlert('Success', `Surveyor has been ${action}d successfully!`, 'success');
            fetchSurveyor();
        }
        catch (error) { showAlert('Error', `Failed to ${action} surveyor: ` + error.message); }
        finally { setActionLoading(false); }
    };

    const getDocumentUrl = (doc) => {
        if (doc.file_url.startsWith('http')) return doc.file_url;
        return `${UPLOADS_BASE_URL}${doc.file_url}`;
    };

    const handleImageError = (docId) => {
        setImageErrors(prev => ({ ...prev, [docId]: true }));
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
                    <span className="text-sm font-medium text-slate-800">
                        {field === 'bank_account_number' ? (surveyor['bank_account_number_encrypted'] || 'Not provided') :
                            field === 'bank_holder_name' ? (surveyor['bank_account_holder_name'] || 'Not provided') :
                                (surveyor[field] || 'Not provided')}
                    </span>
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
    if (!surveyor) return <div className="flex flex-col items-center justify-center py-16 gap-4"><p className="text-slate-500">Surveyor not found</p><Link href="/surveyors" className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Back to Surveyors</Link></div>;

    return (
        <div className="space-y-6">
            <Link href="/surveyors" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-[#AC9AFD] hover:text-[#AC9AFD] transition-all">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                Back to Surveyors
            </Link>

            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#AC9AFD] flex items-center justify-center font-bold text-2xl text-white overflow-hidden">{surveyor.profile_picture_url ? <img src={surveyor.profile_picture_url.startsWith('http') ? surveyor.profile_picture_url : `${UPLOADS_BASE_URL}${surveyor.profile_picture_url}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = surveyor.full_name?.charAt(0) || 'S'; }} /> : surveyor.full_name?.charAt(0) || 'S'}</div>
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-1">{surveyor.full_name}</h2>
                        <p className="text-sm text-slate-500 mb-2">{surveyor.email}</p>
                        <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${surveyor.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{surveyor.is_active ? 'Active' : 'Inactive'}</span>
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${surveyor.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : surveyor.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' : surveyor.verification_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-[#AC9AFD]/10 text-[#AC9AFD]'}`}>{surveyor.verification_status}</span>
                            <PrimeBadge isPrime={surveyor.is_prime} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {surveyor.verification_status !== 'verified' && (<><button onClick={openVerifyModal} disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">Verify</button><button onClick={() => setShowRejectModal(true)} disabled={actionLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">Reject</button></>)}
                    {surveyor.verification_status === 'verified' && <button onClick={() => setShowToggleActiveModal(true)} disabled={actionLoading} className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${surveyor.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-50`}>{surveyor.is_active ? 'Deactivate' : 'Activate'}</button>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    {renderSectionHeader('Personal Information', 'personal')}
                    <div className="space-y-3">
                        {renderEditableField('Full Name', 'full_name')}
                        <div className="flex justify-between gap-4 items-center"><span className="text-sm text-slate-500">Phone</span><span className="text-sm font-medium text-slate-800">{surveyor.phone}</span></div>
                        {renderEditableField('Email', 'email', 'email')}
                        {renderEditableField('License ID', 'surveyor_license_id')}
                        {renderEditableField('Business Address', 'business_address')}
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    {renderSectionHeader('Location', 'location')}
                    <div className="space-y-3">
                        {renderEditableField('City', 'city')}
                        {renderEditableField('State', 'state')}
                        {renderEditableField('Pincode', 'pincode')}
                        <div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Available</span><span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${surveyor.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{surveyor.is_available ? 'Online' : 'Offline'}</span></div>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    {renderSectionHeader('Bank Details', 'bank')}
                    <div className="space-y-3">
                        {renderEditableField('Beneficiary Name', 'bank_holder_name')}
                        {renderEditableField('Account Number', 'bank_account_number')}
                        {renderEditableField('IFSC Code', 'bank_ifsc_code')}
                        {renderEditableField('UPI ID', 'upi_id')}
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Audit Information</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Joined</span><span className="text-sm font-medium text-slate-800">{new Date(surveyor.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
                        {surveyor.verified_at && <div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Verified At</span><span className="text-sm font-medium text-slate-800">{new Date(surveyor.verified_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>}
                        {surveyor.rejection_reason && <div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Rejection Reason</span><span className="text-sm font-medium text-red-600 text-right">{surveyor.rejection_reason}</span></div>}
                    </div>
                </div>
            </div>

            {/* Licence Categories (v2 §1) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Licence Categories</h3>
                    {catDraft ? (
                        <div className="flex gap-2">
                            <button onClick={() => setCatDraft(null)} disabled={savingCategories} className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleSaveCategories} disabled={savingCategories} className="px-3 py-1 text-xs font-medium text-white bg-[#AC9AFD] hover:bg-[#9B85FC] rounded-lg transition-colors disabled:opacity-50">
                                {savingCategories ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    ) : (
                        <button onClick={startCategoryEdit} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit licence categories" aria-label="Edit licence categories">
                            <PencilIcon />
                        </button>
                    )}
                </div>

                {catDraft ? (
                    <div className="space-y-3">
                        <p className="text-xs text-slate-500">Tick every line of business this surveyor is licensed for. Saving replaces the full set — untick everything to make the surveyor Investigator only.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {SURVEYOR_CATEGORIES.map((cat) => {
                                const entry = catDraft[cat.value];
                                return (
                                    <div key={cat.value} className={`border rounded-lg p-3 ${entry ? 'bg-[#AC9AFD]/5 border-[#AC9AFD]' : 'bg-slate-50 border-slate-200'}`}>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!entry}
                                                onChange={() => toggleDraftCategory(cat.value)}
                                                className="w-4 h-4 accent-[#AC9AFD]"
                                            />
                                            <span className="text-sm font-medium text-slate-800">{cat.label}</span>
                                        </label>
                                        {entry && (
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    value={entry.license_number}
                                                    onChange={(e) => setDraftField(cat.value, 'license_number', e.target.value)}
                                                    placeholder="Licence no."
                                                    aria-label={`${cat.label} licence number`}
                                                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]"
                                                />
                                                <input
                                                    type="date"
                                                    value={entry.valid_until}
                                                    onChange={(e) => setDraftField(cat.value, 'valid_until', e.target.value)}
                                                    aria-label={`${cat.label} valid until`}
                                                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (surveyor.category_grants?.length || 0) === 0 ? (
                    <div className="space-y-2">
                        <PrimeBadge isPrime={false} />
                        <p className="text-sm text-slate-500">No licence categories granted. This surveyor can take investigation cases only, and is not Prime. Use the edit button above to grant categories.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <PrimeBadge isPrime={surveyor.is_prime} />
                            <span className="text-xs text-slate-500">
                                {surveyor.categories?.length || 0} active
                                {(surveyor.category_grants.length - (surveyor.categories?.length || 0)) > 0
                                    ? ` · ${surveyor.category_grants.length - (surveyor.categories?.length || 0)} expired (ignored when assigning)`
                                    : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {surveyor.category_grants.map((grant) => {
                                const expired = isGrantExpired(grant.valid_until);
                                return (
                                    <div key={grant.id} className={`border rounded-lg p-3 space-y-1.5 ${expired ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-sm font-medium text-slate-800">{categoryLabel(grant.category)}</span>
                                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${expired ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {expired ? 'Expired' : 'Active'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">Licence <span className="font-medium text-slate-700">{grant.license_number || 'not recorded'}</span></p>
                                        <p className="text-xs text-slate-500">
                                            {grant.valid_until
                                                ? <>Valid until <span className={`font-medium ${expired ? 'text-red-600' : 'text-slate-700'}`}>{formatGrantDate(grant.valid_until)}</span></>
                                                : 'No expiry recorded'}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Granted by {grant.granted_by_name || 'admin'}{grant.granted_at ? ` on ${formatGrantDate(grant.granted_at)}` : ''}
                                        </p>
                                        {expired && <p className="text-xs text-red-600">Not counted towards Prime — update the expiry to reactivate.</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Wallet Section */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-amber-100 uppercase tracking-wider mb-1">Wallet Balance</h3>
                        <p className="text-3xl font-bold">₹{parseFloat(wallet?.wallet?.balance || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex gap-6">
                        <div><p className="text-xs text-amber-100">Total Earned</p><p className="text-lg font-semibold">₹{parseFloat(wallet?.wallet?.total_earned || 0).toLocaleString('en-IN')}</p></div>
                        <div><p className="text-xs text-amber-100">Withdrawn</p><p className="text-lg font-semibold">₹{parseFloat(wallet?.wallet?.total_withdrawn || 0).toLocaleString('en-IN')}</p></div>
                    </div>
                    <Link href={`/payouts/${params.id}`} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors">View Full Wallet →</Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">KYC Documents</h3>
                    <button
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${showUploadForm ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#AC9AFD] text-white hover:bg-[#9B85FC]'}`}
                    >
                        {showUploadForm ? 'Cancel' : (
                            <>
                                <PlusIcon />
                                Upload Document
                            </>
                        )}
                    </button>
                </div>
                {showUploadForm && (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        if (!formData.get('kyc_document')?.size) { showAlert('Error', 'Please select a file'); return; }
                        setUploading(true);
                        try {
                            await api.postFormData(`/admin/surveyors/${params.id}/documents`, formData);
                            showAlert('Success', 'Document uploaded successfully!', 'success');
                            setShowUploadForm(false);
                            fetchSurveyor();
                        } catch (err) { showAlert('Error', err.message); }
                        finally { setUploading(false); }
                    }} className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[240px]">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Document Type</label>
                            <CustomSelect
                                value={uploadDocType}
                                onChange={setUploadDocType}
                                options={[
                                    { label: 'Government ID', value: 'government_id' },
                                    { label: 'Proof of Address', value: 'proof_of_address' },
                                    { label: 'Surveyor License', value: 'surveyor_license' }
                                ]}
                                className="w-full"
                            />
                            <input type="hidden" name="document_type" value={uploadDocType} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-slate-500 mb-1">File</label>
                            <input type="file" name="kyc_document" accept="image/*,.pdf" required className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#AC9AFD]/10 file:text-[#AC9AFD] hover:file:bg-[#AC9AFD]/20" />
                        </div>
                        <button type="submit" disabled={uploading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </form>
                )}
                {surveyor.documents?.length === 0 ? <p className="text-sm text-slate-400">No documents uploaded yet</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {surveyor.documents?.map((doc) => (
                            <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">{doc.document_type.replace('_', ' ')}</span>
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${doc.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.is_verified ? 'Verified' : 'Pending'}</span>
                                </div>
                                <div className="h-24 bg-white border border-slate-200 rounded flex items-center justify-center overflow-hidden">
                                    {doc.file_type === 'pdf' || imageErrors[doc.id] ? (
                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                            <svg width="32" height="32" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                            <span className="text-xs">{doc.file_type === 'pdf' ? 'PDF' : 'Image Not Found'}</span>
                                        </div>
                                    ) : (
                                        <img src={getDocumentUrl(doc)} alt={doc.document_type} className="w-full h-full object-cover" onError={() => handleImageError(doc.id)} />
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <a href={getDocumentUrl(doc)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">
                                        <EyeIcon />
                                        View
                                    </a>
                                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors cursor-pointer">
                                        <ReplaceIcon />
                                        Replace
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const formData = new FormData();
                                            formData.append('kyc_document', file);
                                            try {
                                                await api.putFormData(`/admin/surveyors/${params.id}/documents/${doc.id}/replace`, formData);
                                                showAlert('Success', 'Document replaced!', 'success');
                                                fetchSurveyor();
                                            } catch (err) { showAlert('Error', err.message); }
                                            e.target.value = '';
                                        }} />
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    {doc.is_verified ? (
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Unverify this document?')) return;
                                                try {
                                                    await api.put(`/admin/surveyors/${params.id}/documents/${doc.id}/verify`, { is_verified: false, rejection_reason: 'Unverified by admin' });
                                                    showAlert('Success', 'Document unverified', 'success');
                                                    fetchSurveyor();
                                                } catch (e) { showAlert('Error', e.message); }
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-lg transition-colors border border-amber-100"
                                        >
                                            <XIcon />
                                            Unverify
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await api.put(`/admin/surveyors/${params.id}/documents/${doc.id}/verify`, { is_verified: true });
                                                        showAlert('Success', 'Document verified', 'success');
                                                        fetchSurveyor();
                                                    } catch (e) { showAlert('Error', e.message); }
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-100"
                                            >
                                                <CheckIcon />
                                                Verify
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const reason = prompt('Rejection reason:');
                                                    if (!reason) return;
                                                    try {
                                                        await api.put(`/admin/surveyors/${params.id}/documents/${doc.id}/verify`, { is_verified: false, rejection_reason: reason });
                                                        showAlert('Success', 'Document rejected', 'success');
                                                        fetchSurveyor();
                                                    } catch (e) { showAlert('Error', e.message); }
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors border border-red-100"
                                            >
                                                <XIcon />
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Delete this document permanently?')) return;
                                            try {
                                                await api.delete(`/admin/surveyors/${params.id}/documents/${doc.id}`);
                                                showAlert('Success', 'Document deleted', 'success');
                                                fetchSurveyor();
                                            } catch (e) { showAlert('Error', e.message); }
                                        }}
                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Verify Confirmation Modal */}
            {showVerifyModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowVerifyModal(false)}>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center mb-4">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                            <h3 className="text-lg font-semibold text-slate-800">Verify Surveyor</h3>
                            <p className="text-sm text-slate-500 mt-1">Choose the licence categories to grant on approval.</p>
                        </div>
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Licence Categories</p>
                            <div className="grid grid-cols-2 gap-2">
                                {SURVEYOR_CATEGORIES.map((cat) => {
                                    const checked = verifyCategories.includes(cat.value);
                                    return (
                                        <label key={cat.value} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#AC9AFD]/5 border-[#AC9AFD]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleVerifyCategory(cat.value)}
                                                className="w-4 h-4 accent-[#AC9AFD]"
                                            />
                                            <span className="text-sm text-slate-700">{cat.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                {verifyCategories.length > 0
                                    ? `Approving as Prime — ${verifyCategories.map(categoryLabel).join(', ')}. Licence numbers and expiry dates can be added afterwards.`
                                    : 'Nothing ticked: approving as Investigator only (not Prime). The surveyor will only receive investigation cases.'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowVerifyModal(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleVerify} disabled={actionLoading} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{actionLoading ? 'Verifying...' : 'Verify'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Active Confirmation Modal */}
            {showToggleActiveModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowToggleActiveModal(false)}>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center mb-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${surveyor.is_active ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                <svg className={`w-7 h-7 ${surveyor.is_active ? 'text-red-600' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={surveyor.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">{surveyor.is_active ? 'Deactivate' : 'Activate'} Surveyor</h3>
                            <p className="text-sm text-slate-500 mt-1">Are you sure you want to {surveyor.is_active ? 'deactivate' : 'activate'} this surveyor?</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowToggleActiveModal(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleToggleActive} disabled={actionLoading} className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${surveyor.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{actionLoading ? 'Processing...' : (surveyor.is_active ? 'Deactivate' : 'Activate')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Reject Surveyor</h3>
                        <p className="text-sm text-slate-500 mb-4">Please provide a reason for rejecting this surveyor's verification:</p>
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD] resize-none mb-4" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRejectModal(false)} disabled={actionLoading} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-sm font-medium rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleReject} disabled={actionLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{actionLoading ? 'Rejecting...' : 'Reject'}</button>
                        </div>
                    </div>
                </div>
            )}

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
