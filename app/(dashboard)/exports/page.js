'use client';

/**
 * Export documents and their outbound sync state (v2 §5).
 *
 * One composite PDF per survey, generated once the invoice is settled and the
 * report accepted. The push to main ClaimsMitra is STUBBED — until that contract
 * exists `cm_sync_enabled` stays false, documents pile up here unsent, and a
 * "Retry push" is refused with a 400. That refusal is the expected answer, not a
 * failure, so the banner below says so before anyone reads the queue as broken.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

const formatDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-';

const formatBytes = (bytes) => {
    const n = Number(bytes);
    if (!n) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const SYNC_STATUS = {
    not_sent: { label: 'Not sent yet', className: 'bg-slate-100 text-slate-700' },
    pending: { label: 'Queued to send', className: 'bg-amber-100 text-amber-700' },
    sent: { label: 'Sent', className: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'Push failed', className: 'bg-red-100 text-red-700' },
    disabled: { label: 'Sync disabled', className: 'bg-slate-100 text-slate-700' },
};

const syncOptions = [
    { value: '', label: 'All Sync Statuses' },
    { value: 'not_sent', label: 'Not sent yet' },
    { value: 'pending', label: 'Queued to send' },
    { value: 'sent', label: 'Sent' },
    { value: 'failed', label: 'Push failed' },
    { value: 'disabled', label: 'Sync disabled' },
];

const LIMIT = 20;

export default function ExportsPage() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [syncStatus, setSyncStatus] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Set from the response's `sync_enabled` flag; the text itself is the
    // server's `message`.
    const [syncNotice, setSyncNotice] = useState('');
    const [pushingId, setPushingId] = useState(null);
    const [feedback, setFeedback] = useState(null); // { tone: 'success'|'info'|'error', message }

    const fetchExports = useCallback(async (p, status) => {
        setLoading(true);
        setError('');
        try {
            const params = { page: p, limit: LIMIT };
            if (status) params.sync_status = status;
            const res = await api.get('/admin/exports', params);
            setRows(res.data || []);
            setTotal(res.pagination?.total || 0);
            setSyncNotice(
                res.sync_enabled === false
                    ? (res.message || 'Main ClaimsMitra sync is disabled.')
                    : ''
            );
        } catch (err) {
            setError(err.message || 'Could not load export documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExports(page, syncStatus);
    }, [page, syncStatus, fetchExports]);

    const handlePush = async (row) => {
        setPushingId(row.id);
        setFeedback(null);
        try {
            const res = await api.post(`/admin/exports/${row.id}/push`, {});
            setFeedback({ tone: 'success', message: res.message || 'Pushed to main ClaimsMitra' });
            await fetchExports(page, syncStatus);
        } catch (err) {
            // A 400 because sync is switched off is the server declining on purpose,
            // not a push that went wrong. Anything else is a real problem.
            const expected = err.status === 400 && /sync is disabled/i.test(err.message || '');
            setFeedback({
                tone: expected ? 'info' : 'error',
                message: err.message || 'Push failed',
            });
        } finally {
            setPushingId(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const feedbackClass = feedback?.tone === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : feedback?.tone === 'info'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-red-50 border-red-200 text-red-700';

    return (
        <div className="space-y-6">
            {syncNotice && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                    <p className="font-medium">Main ClaimsMitra sync is not configured yet</p>
                    <p className="mt-1">
                        {syncNotice} Documents below are generated and held. A retry will be refused
                        until <code className="font-mono">cm_sync_enabled</code> is switched on in Settings —
                        that refusal is expected, not a fault.
                    </p>
                </div>
            )}

            {feedback && (
                <div role="status" className={`border px-4 py-3 rounded-xl text-sm ${feedbackClass}`}>
                    {feedback.message}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                        <h2 className="text-base font-semibold text-slate-900">Export documents</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            One composite PDF per survey, generated once the invoice is settled and the
                            report accepted.
                        </p>
                    </div>
                    <div className="w-full sm:w-56" role="group" aria-label="Filter by sync status">
                        <CustomSelect
                            options={syncOptions}
                            value={syncStatus}
                            onChange={(v) => { setSyncStatus(v); setPage(1); }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-slate-900 font-medium">No export documents</p>
                        <p className="text-sm text-slate-500 mt-1">
                            {syncStatus
                                ? 'No documents have this sync status.'
                                : 'A document appears here once a survey’s report is accepted and its invoice settled.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">LA ID</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sync status</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attempts</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last error</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => {
                                    const st = SYNC_STATUS[row.sync_status] || SYNC_STATUS.not_sent;
                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <Link href={`/surveys/${row.survey_id}`} className="text-sm font-medium text-slate-900 hover:text-[#7C6BD6]">
                                                    {row.laid || `#${row.survey_id}`}
                                                </Link>
                                                <p className="text-xs text-slate-500">
                                                    {(row.survey_type || '').replace(/_/g, ' ')}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{row.company_name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {formatDate(row.generated_at)}
                                                {row.generation_error && (
                                                    <span className="block text-xs text-red-600">Generation failed</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">
                                                {formatBytes(row.file_size_bytes)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${st.className}`}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 text-right tabular-nums">
                                                {row.sync_attempts ?? 0}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 max-w-xs">
                                                {row.last_error
                                                    ? <span className="block truncate" title={row.last_error}>{row.last_error}</span>
                                                    : <span className="text-slate-400">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePush(row)}
                                                    aria-label={`Retry push for ${row.laid || `survey #${row.survey_id}`}`}
                                                    disabled={pushingId !== null}
                                                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {pushingId === row.id ? 'Pushing…' : 'Retry push'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {total > LIMIT && (
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                )}
            </div>
        </div>
    );
}

function Pagination({ page, totalPages, onChange }) {
    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <button
                onClick={() => onChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
                Previous
            </button>
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <button
                onClick={() => onChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
                Next
            </button>
        </div>
    );
}
