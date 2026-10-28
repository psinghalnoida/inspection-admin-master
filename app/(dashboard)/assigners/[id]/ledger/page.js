'use client';

/**
 * Assigner ledger (v2 §4).
 *
 * One running account between the platform and one assigner — entries accumulate
 * across surveys, they are not per-survey buckets.
 *
 * The server owns the sign convention and returns `direction`, a human `label`
 * and an always-positive `amount`. Nothing here re-derives it; `direction` only
 * picks admin-facing wording, because the server's label is written for the
 * assigner ("You owe").
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const formatINR = (amount) =>
    `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-';

/** Admin-facing framing of the server's `direction`. */
const DIRECTION = {
    assigner_owes: {
        title: 'Assigner owes the platform',
        note: 'Collect this against the outstanding invoices.',
        card: 'bg-amber-50 border-amber-200',
        amount: 'text-amber-700',
    },
    admin_owes: {
        title: 'Platform owes the assigner',
        note: 'Carry it forward against their next invoice, or refund it to the bank account below.',
        card: 'bg-emerald-50 border-emerald-200',
        amount: 'text-emerald-700',
    },
    settled: {
        title: 'Settled',
        note: 'Nothing is owed in either direction.',
        card: 'bg-slate-50 border-slate-200',
        amount: 'text-slate-900',
    },
};

const REFERENCE_LABEL = {
    opening: 'Opening balance',
    bill: 'Invoice',
    advance_payment: 'Advance payment',
    balance_payment: 'Balance payment',
    refund: 'Refund',
    adjustment: 'Adjustment',
};

const ENTRY_TYPE_HELP = {
    debit: 'Debit — the assigner owes more. Money you paid out to them (a bank refund) is a DEBIT: it cancels the credit we were holding for them.',
    credit: 'Credit — the assigner owes less. Money received from them outside the invoice flow, or a balance you are writing off.',
};

const LIMIT = 20;

export default function AssignerLedgerPage() {
    const params = useParams();
    const assignerId = params.id;

    const [summary, setSummary] = useState(null);
    const [entries, setEntries] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [showEntry, setShowEntry] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ entry_type: 'debit', amount: '', description: '', reference_type: 'adjustment' });

    const loadSummary = useCallback(async () => {
        try {
            const res = await api.get(`/admin/assigners/${assignerId}/ledger/summary`);
            setSummary(res.data || null);
        } catch (err) {
            setError(err.message || 'Could not load the balance');
        }
    }, [assignerId]);

    const loadEntries = useCallback(async (p) => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/assigners/${assignerId}/ledger`, { page: p, limit: LIMIT });
            setEntries(res.data || []);
            setTotal(res.pagination?.total || 0);
        } catch (err) {
            setError(err.message || 'Could not load the statement');
        } finally {
            setLoading(false);
        }
    }, [assignerId]);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { loadEntries(page); }, [page, loadEntries]);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const amountValue = parseFloat(form.amount);
    const formValid = Number.isFinite(amountValue) && amountValue > 0 && form.description.trim().length > 0;

    const submitEntry = async () => {
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const res = await api.post(`/admin/assigners/${assignerId}/ledger`, {
                entry_type: form.entry_type,
                amount: amountValue,
                description: form.description.trim(),
                reference_type: form.reference_type,
            });
            setNotice(res.message || 'Ledger entry recorded');
            setShowEntry(false);
            setForm({ entry_type: 'debit', amount: '', description: '', reference_type: 'adjustment' });
            await loadSummary();
            // The new entry is the newest row, so the statement must go back to page 1.
            if (page === 1) await loadEntries(1);
            else setPage(1);
        } catch (err) {
            setError(err.message || 'Could not record the entry');
        } finally {
            setSaving(false);
        }
    };

    const dir = DIRECTION[summary?.direction] || DIRECTION.settled;
    const assigner = summary?.assigner;
    const inconsistent = summary?.integrity?.consistent === false;
    const hasBank = !!(assigner?.bank_account_holder_name || assigner?.bank_ifsc_code || assigner?.bank_name);
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <Link href={`/assigners/${assignerId}`} className="text-sm text-slate-600 hover:text-slate-900">← Back to assigner</Link>
                <button
                    onClick={() => { setShowEntry(true); setNotice(''); }}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#AC9AFD] text-slate-800 hover:bg-[#9B87FC]"
                >
                    Post adjustment / refund
                </button>
            </div>

            {notice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">{notice}</div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {inconsistent && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-red-800">This statement cannot be trusted</p>
                    <p className="text-sm text-red-700 mt-1">
                        The running balance has drifted from the sum of the entries. Stored balance is{' '}
                        <strong>{formatINR(summary.integrity.stored)}</strong>, but the entries add up to{' '}
                        <strong>{formatINR(summary.integrity.computed)}</strong>. Do not collect or refund
                        against these figures until the ledger has been reconciled.
                    </p>
                </div>
            )}

            {/* Balance + who to pay */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`rounded-2xl border p-5 ${summary ? dir.card : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Account balance</p>
                    {/* Until the summary lands there is no balance to state — showing the
                        `settled` fallback would read as "nothing is owed", which may be a lie. */}
                    {!summary ? (
                        <p className="text-3xl font-bold text-slate-300 mt-1">—</p>
                    ) : (
                        <>
                            <p className={`text-3xl font-bold tabular-nums mt-1 ${dir.amount}`}>
                                {formatINR(summary.amount)}
                            </p>
                            <p className="text-sm font-semibold text-slate-800 mt-2">{dir.title}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{dir.note}</p>
                            {summary.label && (
                                <p className="text-xs text-slate-500 mt-3">
                                    The assigner sees this as “{summary.label}”.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                {assigner?.company_name || 'Assigner'}
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {assigner?.contact_person_name || 'No contact person on record'}
                            </p>
                        </div>
                        <Link href={`/assigners/${assignerId}`} className="text-sm text-slate-600 hover:text-slate-900 shrink-0">
                            Profile
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Field label="GSTIN" value={assigner?.gst_number || 'Not on record'} />
                        <Field label="Beneficiary" value={assigner?.bank_account_holder_name || 'Not on record'} />
                        <Field label="Bank" value={assigner?.bank_name || 'Not on record'} />
                        <Field label="IFSC" value={assigner?.bank_ifsc_code || 'Not on record'} mono />
                    </div>

                    <p className="text-xs text-slate-500 mt-4">
                        {hasBank
                            ? 'The account number is held on the assigner profile. Verify it there before transferring a refund.'
                            : 'No bank details on record — add them on the assigner profile before refunding anything.'}
                    </p>
                </div>
            </div>

            {/* Statement */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-base font-semibold text-slate-900">Statement</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        One running account across every survey, newest entry first. A debit increases what
                        the assigner owes; a credit reduces it.
                    </p>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                ) : entries.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-slate-900 font-medium">No entries yet</p>
                        <p className="text-sm text-slate-500 mt-1">This account sits at zero.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice / LA ID</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Debit</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entries.map((e) => {
                                    const isDebit = e.entry_type === 'debit';
                                    const balance = parseFloat(e.balance_after || 0);
                                    const ref = e.invoice_number || e.laid || '—';
                                    const refNote = [
                                        REFERENCE_LABEL[e.reference_type] || e.reference_type,
                                        e.invoice_number && e.laid ? e.laid : null,
                                    ].filter(Boolean).join(' · ');
                                    return (
                                        <tr key={e.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(e.created_at)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-900">{e.description || '—'}</td>
                                            <td className="px-4 py-3">
                                                {e.survey_id ? (
                                                    <Link href={`/surveys/${e.survey_id}`} className="text-sm font-medium text-slate-900 hover:text-[#7C6BD6]">
                                                        {ref}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-slate-600">{ref}</span>
                                                )}
                                                {refNote && <p className="text-xs text-slate-500">{refNote}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right tabular-nums">
                                                {isDebit
                                                    ? <span className="font-semibold text-amber-700">{formatINR(e.amount)}</span>
                                                    : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right tabular-nums">
                                                {isDebit
                                                    ? <span className="text-slate-300">—</span>
                                                    : <span className="font-semibold text-emerald-700">{formatINR(e.amount)}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-900">
                                                {formatINR(Math.abs(balance))}
                                                <span className="ml-1 text-xs font-medium text-slate-500">
                                                    {balance > 0 ? 'Dr' : balance < 0 ? 'Cr' : ''}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                    Dr = the assigner owes the platform · Cr = the platform owes the assigner
                </div>

                {total > LIMIT && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Adjustment / refund */}
            <Modal
                open={showEntry}
                title="Post a ledger entry"
                onClose={() => setShowEntry(false)}
                onConfirm={submitEntry}
                confirmLabel="Post entry"
                busy={saving}
                disabled={!formValid}
            >
                {summary?.direction === 'admin_owes' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
                        <p className="text-xs text-emerald-800">
                            We owe this assigner <strong>{formatINR(summary.amount)}</strong>. Once the bank
                            transfer has gone out, record it here as a <strong>debit</strong> of the same
                            amount with the UTR in the description — that brings the account to zero.
                        </p>
                    </div>
                )}

                <label htmlFor="entry-type" className="block text-sm font-medium text-slate-700 mb-1">Entry type</label>
                <select
                    id="entry-type"
                    value={form.entry_type}
                    onChange={(e) => setField('entry_type', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                >
                    <option value="debit">Debit — assigner owes more</option>
                    <option value="credit">Credit — assigner owes less</option>
                </select>
                <p className="text-xs text-slate-500 mt-1.5">{ENTRY_TYPE_HELP[form.entry_type]}</p>

                <label htmlFor="entry-reference" className="block text-sm font-medium text-slate-700 mb-1 mt-4">Reason</label>
                <select
                    id="entry-reference"
                    value={form.reference_type}
                    onChange={(e) => setField('reference_type', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                >
                    <option value="adjustment">Adjustment — a correction to the account</option>
                    <option value="refund">Refund — money actually moved through the bank</option>
                </select>

                <label htmlFor="entry-amount" className="block text-sm font-medium text-slate-700 mb-1 mt-4">
                    Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                    id="entry-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setField('amount', e.target.value)}
                    placeholder={parseFloat(summary?.amount || 0).toFixed(2)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD] tabular-nums"
                />

                <label htmlFor="entry-description" className="block text-sm font-medium text-slate-700 mb-1 mt-4">
                    Description <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="entry-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="e.g. Refund of unused advance, NEFT UTR 123456789"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                />
                <p className="text-xs text-slate-500 mt-2">
                    Required. The assigner reads this line on their own statement, so say what the money was.
                </p>
            </Modal>
        </div>
    );
}

function Field({ label, value, mono }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-sm text-slate-900 mt-0.5 break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
    );
}

function Modal({ open, title, children, onClose, onConfirm, confirmLabel, confirmClass, busy, disabled }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
                <h3 className="text-base font-semibold text-slate-900 mb-3">{title}</h3>
                <div className="mb-5">{children}</div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                        Close
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy || disabled}
                        className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${confirmClass || 'bg-[#AC9AFD] text-slate-800 hover:bg-[#9B87FC]'}`}
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
