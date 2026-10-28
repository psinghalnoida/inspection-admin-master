'use client';

/**
 * Create / manage the itemised invoice for one survey (v2 §3).
 *
 * KEY RULE: only QUANTITIES are editable here. Every amount, the tax split, the
 * total and the balance are derived server-side. The preview below mirrors the
 * server's arithmetic for immediate feedback, but on every save we re-render
 * from the server's response — so the client can never disagree with the
 * invoice that was actually stored.
 *
 * An ISSUED bill is a tax document and cannot be edited; it must be cancelled
 * and re-raised.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const formatINR = (amount) =>
    `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

const BILL_STATUS = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    issued: { label: 'Issued', className: 'bg-amber-100 text-amber-700' },
    settled: { label: 'Settled', className: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

/**
 * Mirrors billing.service.computeBill so the admin sees totals update as they
 * type. Display only — never submitted.
 */
const previewTotals = (q, isIntraState) => {
    const conveyanceAmount = money(money(q.conveyance_km) * money(q.conveyance_rate));
    const photoAmount = money(Math.max(0, parseInt(q.photo_count, 10) || 0) * money(q.photo_rate));
    const taxable = money(money(q.fee_amount) + conveyanceAmount + money(q.da_toll_amount) + photoAmount);
    const gstTotal = money((taxable * money(q.gst_percent)) / 100);

    let cgst = 0, sgst = 0, igst = 0;
    if (isIntraState) {
        cgst = money(gstTotal / 2);
        sgst = money(gstTotal - cgst);
    } else {
        igst = gstTotal;
    }

    const total = money(taxable + gstTotal);
    return { conveyanceAmount, photoAmount, taxable, gstTotal, cgst, sgst, igst, total };
};

export default function BillDetailPage() {
    const { surveyId } = useParams();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [draft, setDraft] = useState(null);   // prefill payload (new bill)
    const [bill, setBill] = useState(null);     // persisted bill, if any
    const [quantities, setQuantities] = useState(null);

    const [showIssue, setShowIssue] = useState(false);
    const [showSettle, setShowSettle] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [settleAmount, setSettleAmount] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    const seedQuantities = (src) => ({
        fee_amount: src.fee_amount ?? 0,
        conveyance_km: src.conveyance_km ?? 0,
        conveyance_rate: src.conveyance_rate ?? 0,
        da_toll_amount: src.da_toll_amount ?? 0,
        photo_count: src.photo_count ?? 0,
        photo_rate: src.photo_rate ?? 0,
        gst_percent: src.gst_percent ?? 18,
        notes: src.notes ?? '',
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/admin/billing/surveys/${surveyId}/draft`);
            const data = res.data || res;

            if (data.existing_bill) {
                // The draft context (survey header, prefill notes, warnings) rides
                // along with a stored bill — keep it so the warnings stay visible
                // for as long as the bill is still editable.
                setBill(data.existing_bill);
                setDraft(data.survey ? data : null);
                setQuantities(seedQuantities(data.existing_bill));
            } else {
                setDraft(data);
                setBill(null);
                setQuantities(seedQuantities(data));
            }
        } catch (err) {
            setError(err.message || 'Could not load the bill');
        } finally {
            setLoading(false);
        }
    }, [surveyId]);

    useEffect(() => { load(); }, [load]);

    const setQ = (key, value) => setQuantities((prev) => ({ ...prev, [key]: value }));

    const isDraft = !bill || bill.status === 'draft';
    const isCancelled = bill?.status === 'cancelled';
    const editable = isDraft && !isCancelled;

    // Advance and place-of-supply come from the server; they are never typed.
    const advance = parseFloat((bill ?? draft)?.advance_adjusted ?? 0);
    const alreadyPaid = parseFloat(bill?.amount_paid ?? 0);
    // Which tax pair to show. Once a bill is stored its own split is
    // authoritative — the assigner's state may have changed since it was issued.
    // A bill with no GST at all has no split to read, so fall back to the place
    // of supply rather than defaulting to CGST/SGST.
    const storedSplit = bill && (
        parseFloat(bill.cgst_amount || 0) > 0 ||
        parseFloat(bill.sgst_amount || 0) > 0 ||
        parseFloat(bill.igst_amount || 0) > 0
    );
    const isIntraState = storedSplit
        ? parseFloat(bill.igst_amount || 0) === 0
        : !!draft?.is_intra_state;

    const preview = quantities ? previewTotals(quantities, isIntraState) : null;
    const previewBalance = preview ? money(preview.total - advance - alreadyPaid) : 0;

    const save = async () => {
        setSaving(true);
        setError('');
        setNotice('');
        try {
            // Only quantities are sent. Amounts/tax/total/balance are derived server-side.
            // Blanks go as an explicit 0 — the preview reads an empty box as 0, while
            // the server would substitute its own fallback and store a figure the
            // admin never saw.
            const num = (v) => Number(v) || 0;
            const body = {
                fee_amount: num(quantities.fee_amount),
                conveyance_km: num(quantities.conveyance_km),
                conveyance_rate: num(quantities.conveyance_rate),
                da_toll_amount: num(quantities.da_toll_amount),
                photo_count: num(quantities.photo_count),
                photo_rate: num(quantities.photo_rate),
                gst_percent: num(quantities.gst_percent),
                notes: quantities.notes || '',
            };
            const res = bill
                ? await api.put(`/admin/billing/bills/${bill.id}`, body)
                : await api.post(`/admin/billing/surveys/${surveyId}`, body);

            const saved = res.data || res;
            setBill(saved);
            // `draft` is kept: it holds the survey header, the prefill notes and
            // the warnings, which must stay on screen while the bill is editable.
            setQuantities(seedQuantities(saved));
            setNotice(res.message || 'Draft saved');
        } catch (err) {
            setError(err.message || 'Could not save the bill');
        } finally {
            setSaving(false);
        }
    };

    const act = async (path, body, successFallback) => {
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const res = await api.post(path, body);
            setNotice(res.message || successFallback);
            setShowIssue(false);
            setShowSettle(false);
            setShowCancel(false);
            await load();
        } catch (err) {
            setError(err.message || 'Action failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>;
    }

    if (error && !quantities) {
        return (
            <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
                <Link href="/billing" className="text-sm text-slate-600 hover:text-slate-900">← Back to billing</Link>
            </div>
        );
    }

    const survey = draft?.survey;
    const status = bill?.status || 'draft';
    const st = BILL_STATUS[status];
    const warnings = draft?.warnings || [];
    const notes = draft?.prefill_notes || {};

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <Link href="/billing" className="text-sm text-slate-600 hover:text-slate-900">← Back to billing</Link>
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${st.className}`}>
                    {st.label}
                </span>
            </div>

            {notice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">{notice}</div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {editable && warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-medium text-amber-800">Check before issuing</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                        {warnings.map((w, i) => (
                            <li key={i} className="text-sm text-amber-700">{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            {isCancelled && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    This bill was cancelled. Go back to the queue to raise a new one for this survey.
                </div>
            )}

            {/* Survey context */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="LA ID" value={survey?.laid || bill?.laid || `#${surveyId}`} />
                    <Field label="Assigner" value={survey?.company_name || '-'} />
                    <Field label="Place of supply" value={(bill?.place_of_supply_state || draft?.place_of_supply_state) || 'Not set'} />
                    <Field label="GSTIN" value={survey?.gst_number || '—'} />
                </div>
                {bill?.invoice_number && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <Field label="Invoice number" value={bill.invoice_number} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quantities */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Line items</h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Enter quantities and rates. All amounts are calculated automatically.
                        </p>
                    </div>

                    <NumberField
                        label="Professional fee (₹)" value={quantities.fee_amount}
                        onChange={(v) => setQ('fee_amount', v)} disabled={!editable}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <NumberField
                            label="Conveyance (km)" value={quantities.conveyance_km}
                            onChange={(v) => setQ('conveyance_km', v)} disabled={!editable}
                        />
                        <NumberField
                            label="Rate (₹/km)" value={quantities.conveyance_rate}
                            onChange={(v) => setQ('conveyance_rate', v)} disabled={!editable}
                        />
                    </div>
                    {notes.conveyance_km && editable && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1">
                            {notes.conveyance_km}
                        </p>
                    )}

                    <NumberField
                        label="DA / Toll (₹)" value={quantities.da_toll_amount}
                        onChange={(v) => setQ('da_toll_amount', v)} disabled={!editable}
                        hint={editable ? notes.da_toll_amount : null}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <NumberField
                            label="Photos (count)" value={quantities.photo_count}
                            onChange={(v) => setQ('photo_count', v)} disabled={!editable} step="1"
                        />
                        <NumberField
                            label="Rate (₹/photo)" value={quantities.photo_rate}
                            onChange={(v) => setQ('photo_rate', v)} disabled={!editable}
                        />
                    </div>
                    {notes.photo_count && editable && (
                        <p className="text-xs text-slate-500 -mt-1">{notes.photo_count}</p>
                    )}

                    <NumberField
                        label="GST (%)" value={quantities.gst_percent}
                        onChange={(v) => setQ('gst_percent', v)} disabled={!editable}
                    />

                    <div>
                        <label htmlFor="bill-notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                            id="bill-notes"
                            rows={2}
                            value={quantities.notes || ''}
                            onChange={(e) => setQ('notes', e.target.value)}
                            disabled={!editable}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD] disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                </div>

                {/* Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="text-base font-semibold text-slate-900 mb-4">
                        {editable ? 'Preview' : 'Invoice'}
                    </h2>

                    <dl className="space-y-2.5">
                        <Line label="Professional fee" value={formatINR(quantities.fee_amount)} />
                        <Line
                            label="Conveyance"
                            sub={`${parseFloat(quantities.conveyance_km || 0).toFixed(2)} km × ${formatINR(quantities.conveyance_rate)}/km`}
                            value={formatINR(preview.conveyanceAmount)}
                        />
                        <Line label="DA / Toll" value={formatINR(quantities.da_toll_amount)} />
                        <Line
                            label="Photos"
                            sub={`${parseInt(quantities.photo_count, 10) || 0} × ${formatINR(quantities.photo_rate)}`}
                            value={formatINR(preview.photoAmount)}
                        />

                        <div className="border-t border-slate-100 pt-2.5" />
                        <Line label="Taxable value" value={formatINR(preview.taxable)} strong />

                        {isIntraState ? (
                            <>
                                <Line label={`CGST @ ${money(quantities.gst_percent) / 2}%`} value={formatINR(preview.cgst)} />
                                <Line label={`SGST @ ${money(quantities.gst_percent) / 2}%`} value={formatINR(preview.sgst)} />
                            </>
                        ) : (
                            <Line label={`IGST @ ${money(quantities.gst_percent)}%`} value={formatINR(preview.igst)} />
                        )}

                        <div className="border-t border-slate-100 pt-2.5" />
                        <Line label="Total (incl. GST)" value={formatINR(preview.total)} strong />

                        <Line label="Less: advance already paid" value={`− ${formatINR(advance)}`} credit />
                        {alreadyPaid > 0 && (
                            <Line label="Less: balance already paid" value={`− ${formatINR(alreadyPaid)}`} credit />
                        )}

                        <div className="border-t border-slate-200 pt-3 mt-1 flex items-baseline justify-between">
                            <dt className="text-sm font-semibold text-slate-900">
                                {previewBalance < 0 ? 'Credit owed to assigner' : 'Balance due from assigner'}
                            </dt>
                            <dd className={`text-xl font-bold tabular-nums ${previewBalance > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                                {formatINR(Math.abs(previewBalance))}
                            </dd>
                        </div>
                    </dl>

                    {editable && (
                        <p className="text-xs text-slate-400 mt-4">
                            Figures are recalculated by the server when you save.
                        </p>
                    )}
                </div>
            </div>

            {/* Actions */}
            {!isCancelled && (
                <div className="flex flex-wrap gap-3">
                    {editable && (
                        <>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : bill ? 'Save draft' : 'Create draft'}
                            </button>
                            {bill && (
                                <button
                                    onClick={() => setShowIssue(true)}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#AC9AFD] text-slate-800 hover:bg-[#9B87FC] disabled:opacity-50"
                                >
                                    Issue invoice
                                </button>
                            )}
                        </>
                    )}

                    {bill && bill.status === 'issued' && (
                        <button
                            onClick={() => { setSettleAmount(''); setShowSettle(true); }}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Record payment
                        </button>
                    )}

                    {/* A bill with money received against it cannot be cancelled — the
                        replacement would bill that amount again. The server refuses it;
                        don't offer a button that only produces an error. */}
                    {bill && bill.status !== 'cancelled' && alreadyPaid === 0 && (
                        <button
                            onClick={() => { setCancelReason(''); setShowCancel(true); }}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                            Cancel bill
                        </button>
                    )}
                </div>
            )}

            {bill && bill.status === 'issued' && (
                <p className="text-sm text-slate-500">
                    This invoice has been issued and can no longer be edited. To change the figures,
                    cancel it and raise a new bill.
                </p>
            )}

            {/* Issue confirmation */}
            <Modal
                open={showIssue}
                title="Issue this invoice?"
                onClose={() => setShowIssue(false)}
                onConfirm={() => act(`/admin/billing/bills/${bill.id}/issue`, {}, 'Invoice issued')}
                confirmLabel="Issue invoice"
                busy={saving}
            >
                <p className="text-sm text-slate-600">
                    This allocates an invoice number and notifies the assigner that{' '}
                    <strong>{formatINR(Math.abs(previewBalance))}</strong>{' '}
                    {previewBalance < 0 ? 'is a credit in their favour' : 'is due'}.
                </p>
                <p className="text-sm text-slate-600 mt-2">
                    An issued invoice is a tax document and <strong>cannot be edited afterwards</strong>.
                </p>
            </Modal>

            {/* Settle */}
            <Modal
                open={showSettle}
                title="Record a payment"
                onClose={() => setShowSettle(false)}
                onConfirm={() => act(
                    `/admin/billing/bills/${bill.id}/settle`,
                    settleAmount === '' ? {} : { amount: parseFloat(settleAmount) },
                    'Payment recorded'
                )}
                confirmLabel="Record payment"
                busy={saving}
            >
                <label htmlFor="settle-amount" className="block text-sm font-medium text-slate-700 mb-1">
                    Amount received (₹)
                </label>
                <input
                    id="settle-amount"
                    type="number"
                    step="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder={parseFloat(bill?.balance_due || 0).toFixed(2)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                />
                <p className="text-xs text-slate-500 mt-2">
                    Leave blank to mark the invoice fully settled — use that when accepting a short
                    payment or waiving the balance.
                </p>
            </Modal>

            {/* Cancel */}
            <Modal
                open={showCancel}
                title="Cancel this bill?"
                onClose={() => setShowCancel(false)}
                onConfirm={() => act(`/admin/billing/bills/${bill.id}/cancel`, { reason: cancelReason }, 'Bill cancelled')}
                confirmLabel="Cancel bill"
                confirmClass="bg-red-600 hover:bg-red-700 text-white"
                busy={saving}
                disabled={!cancelReason.trim()}
            >
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-slate-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="cancel-reason"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                />
                <p className="text-xs text-slate-500 mt-2">
                    The bill is voided and kept for audit. You can then raise a replacement.
                </p>
            </Modal>
        </div>
    );
}

function Field({ label, value }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-sm text-slate-900 mt-0.5">{value}</p>
        </div>
    );
}

function NumberField({ label, value, onChange, disabled, step = '0.01', hint }) {
    const id = `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
                id={id}
                type="number"
                step={step}
                min="0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD] disabled:bg-slate-50 disabled:text-slate-500 tabular-nums"
            />
            {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
    );
}

function Line({ label, sub, value, strong, credit }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <dt className={strong ? 'text-sm font-semibold text-slate-900' : 'text-sm text-slate-600'}>
                {label}
                {sub && <span className="block text-xs text-slate-400">{sub}</span>}
            </dt>
            <dd className={`text-sm tabular-nums ${credit ? 'text-emerald-600' : strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                {value}
            </dd>
        </div>
    );
}

function Modal({ open, title, children, onClose, onConfirm, confirmLabel, confirmClass, busy, disabled }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" role="dialog" aria-modal="true" aria-label={title}>
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
