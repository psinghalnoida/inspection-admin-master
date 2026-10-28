'use client';

/**
 * Admin Billing console (v2 §3).
 *
 * Two views:
 *   "Awaiting billing" — completed broadcast surveys with no bill yet. Billing is
 *      mandatory (§3.5), and an unbilled survey also holds the surveyor's payout,
 *      so this queue is the thing an admin should clear daily.
 *   "All bills" — every bill, filterable by status.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

const formatINR = (amount) =>
    `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-';

const BILL_STATUS = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    issued: { label: 'Issued', className: 'bg-amber-100 text-amber-700' },
    settled: { label: 'Settled', className: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'issued', label: 'Issued' },
    { value: 'settled', label: 'Settled' },
    { value: 'cancelled', label: 'Cancelled' },
];

/**
 * A negative balance means the advance exceeded the invoice — the platform owes
 * the assigner. It must never render as an amount due.
 */
const balanceDisplay = (balanceDue) => {
    const v = parseFloat(balanceDue || 0);
    if (v > 0) return { text: formatINR(v), className: 'text-amber-700 font-semibold', note: 'due' };
    if (v < 0) return { text: formatINR(Math.abs(v)), className: 'text-emerald-600 font-semibold', note: 'credit' };
    return { text: '—', className: 'text-slate-400', note: '' };
};

/** Older unbilled surveys are the ones actually costing a surveyor their payout. */
const waitingClass = (days) => {
    const d = parseInt(days, 10) || 0;
    if (d >= 7) return 'text-red-600 font-semibold';
    if (d >= 3) return 'text-amber-600 font-medium';
    return 'text-slate-600';
};

export default function BillingPage() {
    const [tab, setTab] = useState('pending');

    const [pending, setPending] = useState([]);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [pendingPage, setPendingPage] = useState(1);
    const [pendingSearch, setPendingSearch] = useState('');

    const [bills, setBills] = useState([]);
    const [billsTotal, setBillsTotal] = useState(0);
    const [billsPage, setBillsPage] = useState(1);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const LIMIT = 20;

    const fetchPending = useCallback(async (page, searchTerm) => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: LIMIT };
            if (searchTerm) params.search = searchTerm;
            const res = await api.get('/admin/billing/pending', params);
            setPending(res.data || []);
            setPendingTotal(res.pagination?.total || 0);
        } catch (err) {
            setError(err.message || 'Could not load the billing queue');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBills = useCallback(async (page, statusFilter, searchTerm) => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: LIMIT };
            if (statusFilter) params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;
            const res = await api.get('/admin/billing/bills', params);
            setBills(res.data || []);
            setBillsTotal(res.pagination?.total || 0);
        } catch (err) {
            setError(err.message || 'Could not load bills');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // `pendingSearch` is applied via the form submit below, not on every keystroke.
        if (tab === 'pending') fetchPending(pendingPage, pendingSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, pendingPage, fetchPending]);

    useEffect(() => {
        if (tab === 'bills') fetchBills(billsPage, status, search);
        // `search` is applied via the form submit below, not on every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, billsPage, status, fetchBills]);

    const totalPages = (total) => Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                    onClick={() => setTab('pending')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'pending'
                        ? 'border-[#AC9AFD] text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Awaiting billing
                    {pendingTotal > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                            {pendingTotal}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('bills')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'bills'
                        ? 'border-[#AC9AFD] text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    All bills
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {tab === 'pending' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Surveys awaiting an invoice</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Any survey can be billed at any stage — report submission isn&apos;t required.
                                The surveyor&apos;s payout is released only once the invoice is settled, so an
                                unbilled survey also holds their money.
                            </p>
                        </div>
                        <form
                            className="w-full sm:w-64 shrink-0"
                            onSubmit={(e) => { e.preventDefault(); setPendingPage(1); fetchPending(1, pendingSearch); }}
                        >
                            <input
                                type="text"
                                value={pendingSearch}
                                onChange={(e) => setPendingSearch(e.target.value)}
                                placeholder="Search LA ID, company or surveyor"
                                aria-label="Search surveys awaiting billing"
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                            />
                        </form>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                    ) : pending.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-slate-900 font-medium">
                                {pendingSearch ? 'No matching surveys' : 'Nothing awaiting billing'}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                {pendingSearch ? 'Try a different search.' : 'Every survey has been billed.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">LA ID</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigner</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Surveyor</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Advance</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waiting</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pending.map((s) => (
                                        <tr key={s.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <Link href={`/surveys/${s.id}`} className="text-sm font-medium text-slate-900 hover:text-[#7C6BD6]">
                                                    {s.laid || `#${s.id}`}
                                                </Link>
                                                <p className="text-xs text-slate-500">
                                                    {(s.survey_type || '').replace(/_/g, ' ')}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-slate-900">{s.company_name || '-'}</p>
                                                {!s.gst_number && (
                                                    <p className="text-xs text-amber-600">No GSTIN on record</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{s.surveyor_name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">
                                                {s.advance_paid ? formatINR(s.advance_paid) : '—'}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-right tabular-nums ${waitingClass(s.days_waiting)}`}>
                                                {s.days_waiting}d
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/billing/${s.id}`}
                                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-[#AC9AFD] text-slate-800 hover:bg-[#9B87FC] transition-colors"
                                                >
                                                    Create bill
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pendingTotal > LIMIT && (
                        <Pagination
                            page={pendingPage}
                            totalPages={totalPages(pendingTotal)}
                            onChange={setPendingPage}
                        />
                    )}
                </div>
            )}

            {tab === 'bills' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <form
                            className="flex-1"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setBillsPage(1);
                                fetchBills(1, status, search);
                            }}
                        >
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search invoice number, LA ID or company"
                                aria-label="Search bills"
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                            />
                        </form>
                        <div className="w-full sm:w-48">
                            <CustomSelect
                                options={statusOptions}
                                value={status}
                                onChange={(v) => { setStatus(v); setBillsPage(1); }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                    ) : bills.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No bills match.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Survey</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigner</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bills.map((b) => {
                                        const bal = balanceDisplay(b.balance_due);
                                        const st = BILL_STATUS[b.status] || BILL_STATUS.draft;
                                        return (
                                            <tr key={b.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <Link href={`/billing/${b.survey_id}`} className="text-sm font-medium text-slate-900 hover:text-[#7C6BD6]">
                                                        {b.invoice_number || 'Draft'}
                                                    </Link>
                                                    <p className="text-xs text-slate-500">{formatDate(b.issued_at || b.created_at)}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{b.laid || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{b.company_name || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900 text-right tabular-nums">{formatINR(b.total_amount)}</td>
                                                <td className={`px-4 py-3 text-sm text-right tabular-nums ${bal.className}`}>
                                                    {bal.text}
                                                    {bal.note && <span className="block text-xs font-normal text-slate-500">{bal.note}</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${st.className}`}>
                                                        {st.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {billsTotal > LIMIT && (
                        <Pagination
                            page={billsPage}
                            totalPages={totalPages(billsTotal)}
                            onChange={setBillsPage}
                        />
                    )}
                </div>
            )}
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
