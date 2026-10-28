'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const UPLOADS_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

// Defensive normalizer for legacy/malformed maps links (mirrors web app helper).
const normalizeMapsUrl = (raw) => {
    if (typeof raw !== 'string') return null;
    let s = raw.trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    const lastIdx = Math.max(lower.lastIndexOf('http://'), lower.lastIndexOf('https://'));
    if (lastIdx >= 0) s = s.slice(lastIdx);
    else s = `https://${s.replace(/^\/+/, '')}`;
    try {
        const u = new URL(s);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : null;
    } catch {
        return null;
    }
};

const VIDEO_EXT_RE = /\.(mp4|mov|webm|mkv|avi|m4v|3gp)(\?.*)?$/i;
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)(\?.*)?$/i;

const detectMediaKind = (url = '', fileType = '') => {
    if (fileType?.startsWith('video') || VIDEO_EXT_RE.test(url)) return 'video';
    if (fileType?.startsWith('image') || IMAGE_EXT_RE.test(url)) return 'image';
    return 'other';
};

const getPhotoLabel = (photo) => {
    if (photo.photo_type === 'selfie') return 'Selfie';
    if (photo.source_type === 'gallery' || photo.photo_type === 'gallery' || photo.has_gallery_watermark) return 'Gallery';
    if (photo.photo_type === 'sync_mode') return 'Sync Mode';
    if (photo.photo_type === 'live') return 'Live';
    return photo.photo_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Photo';
};

function MediaLightbox({ items, index, onClose, onIndex }) {
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    const go = useCallback((delta) => {
        if (!items.length) return;
        const next = (index + delta + items.length) % items.length;
        onIndex(next);
    }, [index, items.length, onIndex]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowRight') go(1);
            else if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [go, onClose]);

    if (!items.length || typeof document === 'undefined') return null;
    const current = items[index];

    const onTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            go(dx < 0 ? 1 : -1);
        }
        touchStartX.current = null;
        touchStartY.current = null;
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black/90 flex flex-col"
            style={{ zIndex: 9999 }}
            onClick={onClose}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{current.title || `Item ${index + 1}`}</p>
                    {current.subtitle && <p className="text-xs text-white/60 truncate">{current.subtitle}</p>}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-white/70">{index + 1} / {items.length}</span>
                    <a
                        href={current.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 rounded-lg"
                        title="Open in new tab"
                    >
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                    </a>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg" title="Close (Esc)">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Media */}
            <div className="flex-1 flex items-center justify-center px-4 pb-4 relative" onClick={(e) => e.stopPropagation()}>
                {items.length > 1 && (
                    <button
                        onClick={() => go(-1)}
                        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
                        title="Previous (←)"
                    >
                        <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}

                {current.kind === 'video' ? (
                    <video
                        key={current.url}
                        src={current.url}
                        controls
                        autoPlay
                        className="max-w-full max-h-[80vh] rounded-lg bg-black"
                    />
                ) : (
                    <img
                        key={current.url}
                        src={current.url}
                        alt={current.title || ''}
                        className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
                        draggable={false}
                    />
                )}

                {items.length > 1 && (
                    <button
                        onClick={() => go(1)}
                        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
                        title="Next (→)"
                    >
                        <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Thumbnails */}
            {items.length > 1 && (
                <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 overflow-x-auto">
                        {items.map((it, i) => (
                            <button
                                key={i}
                                onClick={() => onIndex(i)}
                                className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                {it.kind === 'video' ? (
                                    <>
                                        <video src={it.url} className="w-full h-full object-cover pointer-events-none" preload="metadata" muted />
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <svg width="16" height="16" viewBox="0 0 20 20" fill="white"><path d="M6 4l10 6-10 6V4z" /></svg>
                                        </span>
                                    </>
                                ) : (
                                    <img src={it.url} alt="" className="w-full h-full object-cover" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}

const getStatusColor = (status) => {
    switch (status) {
        case 'completed': case 'finished': return 'bg-emerald-100 text-emerald-700';
        case 'in_progress': case 'in_transit': case 'visit_completed': return 'bg-blue-100 text-blue-700';
        case 'assigned': return 'bg-purple-100 text-purple-700';
        case 'pending': case 'pending_assignment': case 'location_detected': return 'bg-amber-100 text-amber-700';
        case 'cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-700';
    }
};

const formatType = (type) => type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
const formatDate = (date) => date ? new Date(date).toLocaleString() : '-';

// v2 §5 — the export document's outbound sync state. The push to main
// ClaimsMitra is stubbed until that contract exists, so 'disabled' is a normal
// resting state here, not a fault.
const SYNC_STATUS = {
    not_sent: { label: 'Not sent yet', className: 'bg-slate-100 text-slate-700' },
    pending: { label: 'Queued to send', className: 'bg-amber-100 text-amber-700' },
    sent: { label: 'Sent', className: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'Push failed', className: 'bg-red-100 text-red-700' },
    disabled: { label: 'Sync disabled', className: 'bg-slate-100 text-slate-700' },
};

const formatBytes = (bytes) => {
    const n = Number(bytes);
    if (!n) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

// Statuses that already have their own milestone row. Anything else in the
// audit trail — a dispute, an escalation, a cancellation — is listed separately;
// the flat survey columns could never express those at all.
const MILESTONE_STATUSES = new Set([
    'pending', 'location_detected', 'assigned', 'in_transit', 'arrived',
    'visit_completed', 'report_submitted', 'finished', 'completed',
]);

export default function SurveyDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [survey, setSurvey] = useState(null);
    const [loading, setLoading] = useState(true);

    // Surveyor assignment state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [availableSurveyors, setAvailableSurveyors] = useState([]);
    const [loadingSurveyors, setLoadingSurveyors] = useState(false);
    const [selectedSurveyor, setSelectedSurveyor] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [surveyorSearch, setSurveyorSearch] = useState('');

    // Gallery lightbox state
    const [gallery, setGallery] = useState({ items: [], index: 0, open: false });
    const openGallery = (items, index) => setGallery({ items, index, open: true });
    const closeGallery = () => setGallery((g) => ({ ...g, open: false }));

    // Report download state (v2 §4.4 — reports are behind an authenticated endpoint)
    const [reportBusyId, setReportBusyId] = useState(null);
    const [reportError, setReportError] = useState('');

    // v2 §5 — canonical timeline + composite export document
    const [timeline, setTimeline] = useState(null);
    const [timelineError, setTimelineError] = useState('');
    const [exportInfo, setExportInfo] = useState(null);
    const [exportError, setExportError] = useState('');
    const [exportWarnings, setExportWarnings] = useState([]);
    const [generating, setGenerating] = useState(false);

    const handleDownloadReport = async (report, idx) => {
        if (reportBusyId !== null) return;
        setReportBusyId(report.id ?? idx);
        setReportError('');
        try {
            await api.downloadReport(params.id, report.report_file_url);
        } catch (err) {
            setReportError(err.message || 'Unable to open this report');
        } finally {
            setReportBusyId(null);
        }
    };

    useEffect(() => {
        if (!params.id) return;
        fetchSurvey();
        fetchTimeline();
        fetchExport();
    }, [params.id]);

    const fetchSurvey = async () => {
        try {
            const response = await api.get(`/admin/surveys/${params.id}`);
            setSurvey(response.data);
        } catch (error) {
            console.error('Failed to fetch survey:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * v2 §5.1 — the timeline comes from the server, not from timestamp columns
     * on the survey row. It is the same source the export PDF uses, and it also
     * carries the dispute/escalation transitions that no column can express.
     */
    const fetchTimeline = async () => {
        setTimelineError('');
        try {
            const res = await api.get(`/admin/surveys/${params.id}/timeline`);
            setTimeline(res.data);
        } catch (err) {
            setTimelineError(err.message || 'Could not load the timeline');
        }
    };

    const fetchExport = async () => {
        setExportError('');
        try {
            const res = await api.get(`/admin/surveys/${params.id}/export`);
            setExportInfo(res.data);
        } catch (err) {
            setExportError(err.message || 'Could not load the export document');
        }
    };

    const handleGenerateExport = async (force) => {
        setGenerating(true);
        setExportError('');
        setExportWarnings([]);
        try {
            const res = await api.post(`/admin/surveys/${params.id}/export`, force ? { force: true } : {});
            setExportWarnings(res.data?.warnings || []);
            await fetchExport();
        } catch (err) {
            setExportError(err.message || 'Could not generate the document');
        } finally {
            setGenerating(false);
        }
    };

    const fetchAvailableSurveyors = async () => {
        setLoadingSurveyors(true);
        try {
            const response = await api.get('/admin/surveyors/available', { survey_id: params.id });
            setAvailableSurveyors(response.data || []);
        } catch (error) {
            console.error('Failed to fetch surveyors:', error);
        } finally {
            setLoadingSurveyors(false);
        }
    };

    const handleOpenAssignModal = () => {
        setShowAssignModal(true);
        fetchAvailableSurveyors();
    };

    const handleAssignSurveyor = async () => {
        if (!selectedSurveyor) return;
        setAssigning(true);
        try {
            await api.put(`/admin/surveys/${params.id}/assign`, { surveyor_id: selectedSurveyor.id });
            setShowAssignModal(false);
            setSelectedSurveyor(null);
            fetchSurvey(); // Refresh survey data
        } catch (error) {
            alert(error.message || 'Failed to assign surveyor');
        } finally {
            setAssigning(false);
        }
    };

    // Check if survey can be assigned
    const canAssign = survey && ['pending', 'location_detected', 'assigned'].includes(survey.status);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Survey not found</p>
                <Link href="/surveys" className="text-[#AC9AFD] hover:underline mt-4 inline-block">Back to Surveys</Link>
            </div>
        );
    }

    const Section = ({ title, children, action }) => (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                {action}
            </div>
            {children}
        </div>
    );

    const InfoRow = ({ label, value }) => (
        <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm text-slate-800 font-medium">{value || '-'}</span>
        </div>
    );

    const milestones = timeline?.milestones || [];
    // The furthest milestone actually reached is where the survey stands now.
    const lastReachedIndex = milestones.reduce((acc, m, i) => (m.reached ? i : acc), -1);
    const offTrackEvents = (timeline?.events || []).filter((e) => !MILESTONE_STATUSES.has(e.to));

    const exportDoc = exportInfo?.export || null;
    const exportSync = SYNC_STATUS[exportDoc?.sync_status] || SYNC_STATUS.not_sent;
    const exportFileHref = exportDoc?.file_url
        ? (exportDoc.file_url.startsWith('http') ? exportDoc.file_url : `${UPLOADS_BASE_URL}${exportDoc.file_url}`)
        : null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/surveys" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-slate-500">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">{survey.laid || `Survey #${survey.id}`}</h1>
                        <p className="text-sm text-slate-500">{formatType(survey.survey_type)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {survey.is_emergency && <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">⚡ Emergency</span>}
                    <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getStatusColor(survey.status)}`}>
                        {(survey.status === 'finished' || survey.status === 'completed') ? 'Completed' : survey.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Basic Info */}
                <Section title="Survey Information">
                    <InfoRow label="LAID" value={survey.laid} />
                    <InfoRow label="Case Reference" value={survey.case_reference} />
                    <InfoRow label="Survey Type" value={formatType(survey.survey_type)} />
                    <InfoRow label="Status" value={formatType(survey.status)} />
                    <InfoRow label="Created" value={formatDate(survey.created_at)} />
                </Section>

                {/* Contact Info */}
                <Section title="Contact Information">
                    <InfoRow label="Contact Person" value={survey.contact_person_name} />
                    <InfoRow label="Mobile" value={survey.contact_person_mobile} />
                    <InfoRow label="WhatsApp" value={survey.alternate_whatsapp_number} />
                </Section>

                {/* Assigner & Surveyor */}
                <Section
                    title="Assigner & Surveyor"
                    action={canAssign && (
                        <button
                            onClick={handleOpenAssignModal}
                            className="px-3 py-1.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-xs font-medium rounded-lg transition-colors"
                        >
                            {survey.surveyor_id ? 'Reassign Surveyor' : 'Assign Surveyor'}
                        </button>
                    )}
                >
                    <InfoRow label="Assigner" value={survey.assigner_name} />
                    <InfoRow label="Assigner Phone" value={survey.assigner_phone} />
                    <InfoRow label="Surveyor" value={survey.surveyor_name || <span className="text-amber-600">Not Assigned</span>} />
                    <InfoRow label="Surveyor Phone" value={survey.surveyor_phone} />
                    {survey.surveyor_assigned_at && <InfoRow label="Assigned At" value={formatDate(survey.surveyor_assigned_at)} />}

                    {/* Track Surveyor Button */}
                    {survey.status === 'in_transit' && survey.surveyor_id && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <Link
                                href={`/surveys/${survey.id}/tracking`}
                                className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                Track Surveyor Live
                            </Link>
                        </div>
                    )}
                </Section>

                {/* Insurance Details */}
                <Section title="Insurance Details">
                    <InfoRow label="Insured Name" value={survey.name_of_insured} />
                    <InfoRow label="Policy Number" value={survey.policy_number} />
                </Section>

                {/* Payment & Payout Info */}
                {survey.payment && (
                    <Section title="Payment & Payout">
                        <InfoRow label="Base Amount" value={`₹${parseFloat(survey.payment.base_amount || 0).toLocaleString('en-IN')}`} />
                        {survey.payment.discount_amount > 0 && (
                            <InfoRow label="Discount" value={<span className="text-green-600">-₹{parseFloat(survey.payment.discount_amount).toLocaleString('en-IN')}</span>} />
                        )}
                        <InfoRow label="Final Amount" value={<span className="font-bold text-emerald-600">₹{parseFloat(survey.payment.final_amount || 0).toLocaleString('en-IN')}</span>} />
                        <InfoRow label="Payment Status" value={
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${survey.payment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {survey.payment.status?.toUpperCase()}
                            </span>
                        } />
                        {survey.payment.razorpay_payment_id && (
                            <InfoRow label="Razorpay ID" value={<span className="font-mono text-xs">{survey.payment.razorpay_payment_id}</span>} />
                        )}
                        {survey.payment.status === 'completed' && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-xs text-slate-500 mb-2">Surveyor Payout</p>
                                <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Survey Credit</p>
                                        <p className="text-xs text-amber-600">{survey.surveyor_name}</p>
                                    </div>
                                    <p className="text-lg font-bold text-amber-700">
                                        ₹{(parseFloat(survey.payment.final_amount || 0) * 0.75).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                {survey.status === 'finished' && (
                                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Credited to surveyor's wallet
                                    </p>
                                )}
                            </div>
                        )}
                    </Section>
                )}

                {/* Location */}
                <Section title="Location">
                    <InfoRow label="Method" value={formatType(survey.location_method)} />
                    <InfoRow label="Address" value={survey.address} />
                    <InfoRow label="City" value={survey.city} />
                    <InfoRow label="State" value={survey.state} />
                    <InfoRow label="Pincode" value={survey.pincode} />
                    {survey.latitude && <InfoRow label="Coordinates" value={`${survey.latitude}, ${survey.longitude}`} />}

                    {/* Google Maps CTA — uses assigner-provided link, else coords, else address text */}
                    {(() => {
                        const addressQuery = [survey.address, survey.city, survey.state, survey.pincode].filter(Boolean).join(', ');
                        const mapsHref = normalizeMapsUrl(survey.google_maps_link)
                            || (survey.latitude && survey.longitude
                                ? `https://www.google.com/maps?q=${survey.latitude},${survey.longitude}`
                                : addressQuery
                                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
                                    : null);
                        return mapsHref ? (
                            <a
                                href={mapsHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1558B0] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                Open in Google Maps
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        ) : null;
                    })()}

                    {/* SMS Link - show when location_method is sms_link */}
                    {survey.location_method === 'sms_link' && survey.sms_link_token && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-600 font-medium mb-1">📱 SMS Location Link</p>
                                    <a
                                        href={`${UPLOADS_BASE_URL}/api/v1/public/location/${survey.sms_link_token}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-700 hover:underline break-all"
                                    >
                                        {UPLOADS_BASE_URL}/api/v1/public/location/{survey.sms_link_token}
                                    </a>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${UPLOADS_BASE_URL}/api/v1/public/location/${survey.sms_link_token}`);
                                        alert('Link copied to clipboard!');
                                    }}
                                    className="ml-2 p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Copy link"
                                >
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                    </svg>
                                </button>
                            </div>
                            {survey.sms_link_sent_at && (
                                <p className="text-xs text-blue-500 mt-1">Sent at: {formatDate(survey.sms_link_sent_at)}</p>
                            )}
                        </div>
                    )}
                </Section>

                {/* Type-Specific Details */}
                {survey.details && (
                    <Section title={survey.survey_type?.includes('motor') ? 'Vehicle Details' : survey.survey_type?.includes('marine') ? 'Marine Details' : 'Investigation Details'}>
                        {/* Motor */}
                        {survey.survey_type?.includes('motor') && (
                            <>
                                <InfoRow label="Vehicle Category" value={formatType(survey.details.vehicle_category)} />
                                <InfoRow label="Vehicle Type" value={formatType(survey.details.vehicle_type)} />
                                <InfoRow label="Vehicle Number" value={survey.details.vehicle_number} />
                                {survey.details.workshop_name && <InfoRow label="Workshop" value={survey.details.workshop_name} />}
                                {survey.details.workshop_advisor_name && <InfoRow label="Workshop Advisor" value={survey.details.workshop_advisor_name} />}
                                {survey.details.workshop_advisor_contact && <InfoRow label="Workshop Contact" value={survey.details.workshop_advisor_contact} />}
                            </>
                        )}
                        {/* Marine */}
                        {survey.survey_type?.includes('marine') && (
                            <>
                                <InfoRow label="Commodity" value={survey.details.commodity} />
                                <InfoRow label="Consignee" value={survey.details.name_of_consignee} />
                                <InfoRow label="Consignor" value={survey.details.name_of_consignor} />
                            </>
                        )}
                        {/* Investigation */}
                        {survey.survey_type === 'investigation' && (
                            <>
                                <InfoRow label="Loss Item Type" value={formatType(survey.details.loss_item_type)} />
                                {survey.details.vehicle_number && <InfoRow label="Vehicle Number" value={survey.details.vehicle_number} />}
                                {survey.details.cattle_tag_number && <InfoRow label="Cattle Tag" value={survey.details.cattle_tag_number} />}
                                {survey.details.cattle_name && <InfoRow label="Cattle Name" value={survey.details.cattle_name} />}
                                {survey.details.human_name && <InfoRow label="Person Name" value={survey.details.human_name} />}
                                {survey.details.human_contact_number && <InfoRow label="Person Contact" value={survey.details.human_contact_number} />}
                                {survey.details.human_relation && <InfoRow label="Relation" value={survey.details.human_relation} />}
                                {survey.details.other_loss_item_name && <InfoRow label="Item Description" value={survey.details.other_loss_item_name} />}
                            </>
                        )}
                    </Section>
                )}
            </div>

            {/* Survey Timeline — v2 §5.1, served by GET /admin/surveys/:id/timeline */}
            <Section title="Survey Timeline">
                {timelineError ? (
                    <p className="text-sm text-red-600">{timelineError}</p>
                ) : !timeline ? (
                    <p className="text-sm text-slate-400">Loading…</p>
                ) : (
                    <>
                        <div className="relative">
                            {milestones.map((step, index, arr) => {
                                // The last reached milestone is where the survey stands, except
                                // when that milestone is the end of the road.
                                const status = !step.reached
                                    ? 'pending'
                                    : (index === lastReachedIndex && step.key !== 'finished') ? 'current' : 'completed';

                                return (
                                    <div key={step.key} className="flex items-start gap-4 mb-0 last:mb-0">
                                        {/* Timeline indicator */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${status === 'completed' ? 'bg-emerald-500' :
                                                status === 'current' ? 'bg-[#AC9AFD] ring-4 ring-[#AC9AFD]/20' :
                                                    'bg-slate-200'
                                                }`}>
                                                {status === 'completed' ? (
                                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-white">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : status === 'current' ? (
                                                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                                ) : (
                                                    <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
                                                )}
                                            </div>
                                            {index < arr.length - 1 && (
                                                <div className={`w-0.5 h-10 ${status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                            )}
                                        </div>
                                        {/* Timeline content */}
                                        <div className="pb-8 last:pb-0 pt-1">
                                            <p className={`text-sm font-medium ${status === 'current' ? 'text-[#AC9AFD]' :
                                                status === 'completed' ? 'text-slate-800' :
                                                    'text-slate-400'
                                                }`}>
                                                {step.label}
                                                {status === 'pending' && <span className="ml-2 text-xs font-normal text-slate-400">Not reached</span>}
                                            </p>
                                            {step.at && (
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {new Date(step.at).toLocaleString()}
                                                    {step.actor && <span className="text-slate-400"> · by {formatType(step.actor)}</span>}
                                                </p>
                                            )}
                                            {step.remarks && (
                                                <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap">{step.remarks}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Disputes, escalations and cancellations — off the happy path,
                            and invisible to a timestamp-column timeline. */}
                        {offTrackEvents.length > 0 && (
                            <div className="mt-2 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Other recorded events</h4>
                                <ul className="space-y-2">
                                    {offTrackEvents.map((e, i) => (
                                        <li key={i} className="text-sm text-slate-700">
                                            <span className="font-medium">{formatType(e.to)}</span>
                                            {e.from && <span className="text-slate-500"> (from {formatType(e.from)})</span>}
                                            <span className="block text-xs text-slate-500">
                                                {formatDate(e.at)}
                                                {e.actor && <span className="text-slate-400"> · by {formatType(e.actor)}</span>}
                                            </span>
                                            {e.remarks && <span className="block text-xs text-slate-500 whitespace-pre-wrap">{e.remarks}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </Section>

            {/* Export Document — v2 §5.4 */}
            <Section title="Export Document">
                {exportError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{exportError}</div>
                )}

                {!exportInfo ? (
                    // A failed fetch already printed its reason above — don't also
                    // leave a "Loading…" that never resolves.
                    !exportError && <p className="text-sm text-slate-400">Loading…</p>
                ) : (
                    <>
                        {exportDoc?.generation_error && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                <span className="font-medium">Last generation failed:</span> {exportDoc.generation_error}
                            </div>
                        )}

                        {exportWarnings.length > 0 && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm font-medium text-amber-800">Generated with warnings</p>
                                <ul className="mt-1 space-y-1 list-disc list-inside">
                                    {exportWarnings.map((w, i) => (
                                        <li key={i} className="text-sm text-amber-700">{w}</li>
                                    ))}
                                </ul>
                                <p className="text-xs text-amber-700 mt-2">
                                    These items are not in the document. It is a record of the survey, so check
                                    whether the missing media matters before the document is relied on.
                                </p>
                            </div>
                        )}

                        {exportDoc && exportInfo.stale && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                This document predates the current survey data — a newer report version or
                                late-arriving media has landed since it was generated.
                            </div>
                        )}

                        {!exportDoc ? (
                            exportInfo.ready ? (
                                <>
                                    <p className="text-sm text-slate-600 mb-3">
                                        No document has been generated for this survey yet.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateExport(false)}
                                        disabled={generating}
                                        className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {generating ? 'Generating…' : 'Generate document'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-medium text-slate-800">Not ready to generate</p>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {exportInfo.not_ready_reason || 'This survey is not ready for an export document yet.'}
                                    </p>
                                </>
                            )
                        ) : (
                            <>
                                <InfoRow label="Generated" value={formatDate(exportDoc.generated_at)} />
                                <InfoRow label="File size" value={formatBytes(exportDoc.file_size_bytes)} />
                                <InfoRow label="Report version" value={exportDoc.report_version ? `Version ${exportDoc.report_version}` : '-'} />
                                <InfoRow
                                    label="Sync status"
                                    value={
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${exportSync.className}`}>
                                            {exportSync.label}
                                        </span>
                                    }
                                />
                                {exportDoc.sync_attempts > 0 && (
                                    <InfoRow label="Push attempts" value={String(exportDoc.sync_attempts)} />
                                )}
                                {exportDoc.sent_at && <InfoRow label="Sent at" value={formatDate(exportDoc.sent_at)} />}
                                {exportDoc.last_error && (
                                    <InfoRow label="Last push error" value={<span className="text-red-600">{exportDoc.last_error}</span>} />
                                )}

                                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                                    {exportFileHref && (
                                        <a
                                            href={exportFileHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            Download document
                                        </a>
                                    )}
                                    {exportInfo.ready && (
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateExport(true)}
                                            disabled={generating}
                                            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {generating ? 'Working…' : 'Regenerate'}
                                        </button>
                                    )}
                                </div>
                                {/* A survey can fall back out of "ready" after its export exists —
                                    a new report version pending acceptance, an invoice reopened.
                                    Without this the Regenerate button just disappears unexplained. */}
                                {!exportInfo.ready && (
                                    <p className="text-sm text-slate-600 mt-2">
                                        Cannot regenerate yet: {exportInfo.not_ready_reason || 'this survey is not ready for an export document.'}
                                    </p>
                                )}
                            </>
                        )}

                        {exportInfo.sync_enabled === false && (
                            <p className="text-xs text-slate-500 mt-4">
                                Main ClaimsMitra sync is not configured yet, so documents are generated and
                                held here rather than pushed. This is expected, not an error.
                            </p>
                        )}
                    </>
                )}
            </Section>

            {/* Instructions */}
            {survey.instructions && (
                <Section title="Instructions / Notes">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{survey.instructions}</p>
                </Section>
            )}

            {/* Causes of Loss */}
            {survey.cause_of_loss && (
                <Section title="Cause of Loss">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{survey.cause_of_loss}</p>
                </Section>
            )}

            {/* Surveyor Remarks (per visit/session) */}
            {survey.session_notes?.length > 0 && (
                <Section title="Surveyor Remarks">
                    <div className="space-y-3">
                        {survey.session_notes.map((sn) => (
                            <div key={sn.session_number} className="border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-[#AC9AFD] uppercase tracking-wide">Visit {sn.session_number}</span>
                                    <span className="text-xs text-slate-400">{formatDate(sn.updated_at || sn.created_at)}</span>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                    {sn.notes || <span className="italic text-slate-400">No remarks</span>}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Photos — grouped by visit/session, lightbox spans all sessions */}
            {survey.photos?.length > 0 && (() => {
                const photoItems = survey.photos.map((photo) => {
                    const fileUrl = photo.file_url?.startsWith('http')
                        ? photo.file_url
                        : `${UPLOADS_BASE_URL}${photo.file_url}`;
                    const isVideoByMedia = photo.media_type === 'video';
                    const urlKind = detectMediaKind(photo.file_url || '', photo.file_type);
                    const kind = isVideoByMedia ? 'video' : (urlKind === 'other' ? 'image' : urlKind);
                    const label = getPhotoLabel(photo);
                    return {
                        url: fileUrl,
                        kind,
                        label,
                        title: label,
                        subtitle: formatDate(photo.created_at),
                        sessionNumber: Number(photo.session_number) || 1,
                    };
                });

                const groups = photoItems.reduce((acc, item, idx) => {
                    (acc[item.sessionNumber] ||= []).push({ item, flatIndex: idx });
                    return acc;
                }, {});
                const sortedSessions = Object.keys(groups).map(Number).sort((a, b) => a - b);
                const showSessionHeader = sortedSessions.length > 1;

                const renderThumb = ({ item, flatIndex }) => (
                    <button
                        key={flatIndex}
                        type="button"
                        onClick={() => openGallery(photoItems, flatIndex)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-[#AC9AFD] transition-colors bg-slate-100 text-left"
                    >
                        {item.kind === 'video' ? (
                            <>
                                <video
                                    src={item.url}
                                    className="w-full h-full object-cover pointer-events-none"
                                    preload="metadata"
                                    muted
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                    <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-slate-800">
                                            <path d="M6 4l10 6-10 6V4z" />
                                        </svg>
                                    </span>
                                </span>
                            </>
                        ) : (
                            <img
                                src={item.url}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-xs text-white truncate font-medium">{item.title}</p>
                            <p className="text-[10px] text-white/80 truncate">{item.subtitle}</p>
                        </div>
                    </button>
                );

                return (
                    <Section title={`Survey Photos (${survey.photos.length})`}>
                        {sortedSessions.map((sessionNum) => (
                            <div key={sessionNum} className={showSessionHeader ? 'mb-6' : ''}>
                                {showSessionHeader && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-3 py-1 rounded-full bg-[#AC9AFD]/15 text-[#7656d1] text-xs font-semibold uppercase tracking-wide">Visit {sessionNum}</span>
                                        <span className="text-xs text-slate-500">{groups[sessionNum].length} item(s)</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {groups[sessionNum].map(renderThumb)}
                                </div>
                            </div>
                        ))}
                    </Section>
                );
            })()}

            {/* Submitted Reports */}
            {survey.reports?.length > 0 && (
                <Section title={`Submitted Reports (${survey.reports.length})`}>
                    {reportError && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{reportError}</div>
                    )}
                    <div className="space-y-3">
                        {survey.reports.map((report, idx) => {
                            // v2 §4.4 — the report is NOT on the public /uploads mount any more
                            // (that path 403s). It is fetched with the auth header and opened
                            // as a blob. Photos and documents below are unchanged.
                            const key = report.id ?? idx;
                            const busy = reportBusyId === key;
                            const missing = !report.report_file_url;

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleDownloadReport(report, idx)}
                                    disabled={busy || missing || reportBusyId !== null}
                                    className="w-full text-left flex items-center p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#AC9AFD] hover:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                                        <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-semibold text-slate-800">Survey Report - Version {report.version || idx + 1}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Submitted by {survey.surveyor_name} on {formatDate(report.created_at)}</p>
                                        {missing && <p className="text-xs text-slate-500 mt-0.5">No file on record for this version.</p>}
                                    </div>
                                    <div className="ml-3 text-xs font-medium text-slate-500">
                                        {busy ? 'Opening…' : (
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-slate-400">
                                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* Documents */}
            {survey.documents?.length > 0 && (() => {
                const docMeta = survey.documents.map((doc, idx) => {
                    const fileUrl = `${UPLOADS_BASE_URL}${doc.file_url}`;
                    const kind = detectMediaKind(doc.file_url || '', doc.file_type);
                    const isPdf = doc.file_type === 'pdf' || doc.file_url?.endsWith('.pdf');
                    return { doc, idx, fileUrl, kind, isPdf };
                });
                const mediaItems = docMeta
                    .filter((d) => d.kind === 'image' || d.kind === 'video')
                    .map((d) => ({
                        url: d.fileUrl,
                        kind: d.kind,
                        title: d.doc.original_file_name || `Document ${d.idx + 1}`,
                        subtitle: formatDate(d.doc.created_at),
                        _docIdx: d.idx,
                    }));

                return (
                    <Section title={`Documents (${survey.documents.length})`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {docMeta.map(({ doc, idx, fileUrl, kind, isPdf }) => {
                                const isMedia = kind === 'image' || kind === 'video';
                                const commonClass = "group relative aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-[#AC9AFD] transition-colors bg-slate-100 text-left";
                                const inner = (
                                    <>
                                        {kind === 'image' && (
                                            <img
                                                src={fileUrl}
                                                alt={doc.original_file_name || `Document ${idx + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        )}
                                        {kind === 'video' && (
                                            <>
                                                <video
                                                    src={fileUrl}
                                                    className="w-full h-full object-cover pointer-events-none"
                                                    preload="metadata"
                                                    muted
                                                />
                                                <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                                    <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-slate-800">
                                                            <path d="M6 4l10 6-10 6V4z" />
                                                        </svg>
                                                    </span>
                                                </span>
                                            </>
                                        )}
                                        {kind === 'other' && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <svg width="32" height="32" viewBox="0 0 20 20" fill="currentColor" className={isPdf ? 'text-red-500' : 'text-slate-400'}>
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                </svg>
                                                <span className={`text-xs font-semibold mt-1 ${isPdf ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {isPdf ? 'PDF' : 'FILE'}
                                                </span>
                                            </div>
                                        )}

                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                            <p className="text-xs text-white truncate">{doc.original_file_name || `Document ${idx + 1}`}</p>
                                        </div>

                                        {!isMedia && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
                                                    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="text-slate-600">
                                                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );

                                if (isMedia) {
                                    const galleryIndex = mediaItems.findIndex((m) => m._docIdx === idx);
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => openGallery(mediaItems, galleryIndex)}
                                            className={commonClass}
                                        >
                                            {inner}
                                        </button>
                                    );
                                }

                                return (
                                    <a
                                        key={idx}
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={commonClass}
                                    >
                                        {inner}
                                    </a>
                                );
                            })}
                        </div>
                    </Section>
                );
            })()}

            {/* Media Lightbox */}
            {gallery.open && (
                <MediaLightbox
                    items={gallery.items}
                    index={gallery.index}
                    onClose={closeGallery}
                    onIndex={(i) => setGallery((g) => ({ ...g, index: i }))}
                />
            )}

            {/* Assign Surveyor Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-800">Assign Surveyor</h2>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-slate-500">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto max-h-[50vh]">
                            {/* Search Bar */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Search by name, phone, or city..."
                                    value={surveyorSearch}
                                    onChange={(e) => setSurveyorSearch(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD] focus:border-transparent"
                                />
                            </div>

                            {loadingSurveyors ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div>
                                </div>
                            ) : availableSurveyors.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">No verified surveyors available</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableSurveyors
                                        .filter(surveyor => {
                                            if (!surveyorSearch.trim()) return true;
                                            const search = surveyorSearch.toLowerCase();
                                            return (
                                                surveyor.full_name?.toLowerCase().includes(search) ||
                                                surveyor.phone?.includes(search) ||
                                                surveyor.city?.toLowerCase().includes(search)
                                            );
                                        })
                                        .map((surveyor) => (
                                            <div
                                                key={surveyor.id}
                                                onClick={() => setSelectedSurveyor(surveyor)}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedSurveyor?.id === surveyor.id
                                                    ? 'border-[#AC9AFD] bg-purple-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#AC9AFD] to-[#9B85FC] flex items-center justify-center text-white font-semibold">
                                                            {surveyor.full_name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-800">{surveyor.full_name}</p>
                                                            <p className="text-sm text-slate-500">{surveyor.phone} • {surveyor.city || 'Location N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {surveyor.distance_km !== null && surveyor.distance_km !== undefined ? (
                                                            <p className="text-sm font-medium text-[#AC9AFD]">{surveyor.distance_km} km away</p>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">Distance N/A</p>
                                                        )}
                                                        <p className={`text-xs ${surveyor.is_available ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {surveyor.is_available ? '● Online' : '○ Offline'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {availableSurveyors.filter(s => {
                                        if (!surveyorSearch.trim()) return true;
                                        const search = surveyorSearch.toLowerCase();
                                        return s.full_name?.toLowerCase().includes(search) || s.phone?.includes(search) || s.city?.toLowerCase().includes(search);
                                    }).length === 0 && (
                                            <p className="text-center text-slate-500 py-4">No surveyors match your search</p>
                                        )}
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignSurveyor}
                                disabled={!selectedSurveyor || assigning}
                                className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {assigning ? 'Assigning...' : 'Assign Surveyor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

