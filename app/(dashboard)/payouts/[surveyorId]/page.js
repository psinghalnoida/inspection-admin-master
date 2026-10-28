'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function SurveyorWalletPage({ params }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const surveyorId = resolvedParams.surveyorId;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutForm, setPayoutForm] = useState({
        amount: '',
        utr_number: '',
        transfer_reference: '',
        payout_method: 'bank_transfer',
        notes: ''
    });
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchWalletDetails();
    }, [surveyorId]);

    const fetchWalletDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/payouts/wallets/${surveyorId}`);
            setData(res.data);
        } catch (err) {
            console.error('Error:', err);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleProcessPayout = async (e) => {
        e.preventDefault();
        if (!payoutForm.amount || parseFloat(payoutForm.amount) <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid amount' });
            return;
        }
        if (parseFloat(payoutForm.amount) > data?.wallet?.balance) {
            setMessage({ type: 'error', text: 'Amount exceeds available balance' });
            return;
        }

        setProcessing(true);
        try {
            await api.post('/admin/payouts/process', {
                surveyor_id: parseInt(surveyorId),
                amount: parseFloat(payoutForm.amount),
                ...payoutForm
            });
            setMessage({ type: 'success', text: 'Payout processed successfully!' });
            setShowPayoutModal(false);
            setPayoutForm({ amount: '', utr_number: '', transfer_reference: '', payout_method: 'bank_transfer', notes: '' });
            fetchWalletDetails();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setProcessing(false);
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.push('/payouts')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Payouts
            </button>

            {/* Message */}
            {message.text && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Surveyor Info + Wallet Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Surveyor Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Surveyor Details</h2>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-slate-500">Name</p>
                            <p className="font-medium text-slate-800">{data?.surveyor?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Phone</p>
                            <p className="font-medium text-slate-800">{data?.surveyor?.phone}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Email</p>
                            <p className="font-medium text-slate-800">{data?.surveyor?.email || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">City</p>
                            <p className="font-medium text-slate-800">{data?.surveyor?.city || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">UPI ID</p>
                            <p className="font-medium text-slate-800 font-mono">{data?.surveyor?.upi_id || 'Not set'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Bank IFSC</p>
                            <p className="font-medium text-slate-800 font-mono">{data?.surveyor?.bank_ifsc_code || 'Not set'}</p>
                        </div>
                    </div>
                </div>

                {/* Wallet Summary */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white">
                        <p className="text-amber-100 text-sm mb-1">Available Balance</p>
                        <p className="text-3xl font-bold">{formatAmount(data?.wallet?.balance)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm mb-1">Total Earned</p>
                        <p className="text-2xl font-bold text-green-600">{formatAmount(data?.wallet?.total_earned)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm mb-1">Total Withdrawn</p>
                        <p className="text-2xl font-bold text-blue-600">{formatAmount(data?.wallet?.total_withdrawn)}</p>
                    </div>

                    {/* Process Payout Button */}
                    {data?.wallet?.balance > 0 && (
                        <div className="sm:col-span-3">
                            <button
                                onClick={() => setShowPayoutModal(true)}
                                className="w-full py-3 bg-[#AC9AFD] hover:bg-[#9B89EC] text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Process Manual Payout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-5 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Transaction History</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium">Type</th>
                                <th className="pb-3 font-medium">Description</th>
                                <th className="pb-3 font-medium">Survey</th>
                                <th className="pb-3 font-medium text-right">Amount</th>
                                <th className="pb-3 font-medium text-right">Balance After</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.transactions?.data?.map((txn) => (
                                <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 text-sm text-slate-600">{formatDate(txn.created_at)}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${txn.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {txn.type}
                                        </span>
                                    </td>
                                    <td className="py-3 text-sm text-slate-600">{txn.description || '-'}</td>
                                    <td className="py-3 text-sm text-slate-600">{txn.survey?.laid || '-'}</td>
                                    <td className={`py-3 text-sm text-right font-semibold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {txn.type === 'credit' ? '+' : '-'}{formatAmount(txn.amount)}
                                    </td>
                                    <td className="py-3 text-sm text-right text-slate-600">{formatAmount(txn.balance_after)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {(!data?.transactions?.data || data.transactions.data.length === 0) && (
                        <div className="text-center py-12 text-slate-500">
                            No transactions found
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Payouts */}
            {data?.recent_payouts?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-5 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800">Recent Payouts</h2>
                    </div>
                    <div className="p-4">
                        <div className="grid gap-3">
                            {data.recent_payouts.map((payout) => (
                                <div key={payout.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-slate-800">{formatAmount(payout.amount)}</p>
                                        <p className="text-xs text-slate-500">{formatDate(payout.created_at)} • {payout.method?.replace('_', ' ')}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${payout.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {payout.status}
                                        </span>
                                        {payout.utr_number && <p className="text-xs text-slate-500 mt-1 font-mono">{payout.utr_number}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Payout Modal */}
            {showPayoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">Process Manual Payout</h3>
                            <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleProcessPayout} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Amount (Max: {formatAmount(data?.wallet?.balance)})
                                </label>
                                <input
                                    type="number"
                                    value={payoutForm.amount}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                                    max={data?.wallet?.balance}
                                    step="0.01"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Payout Method</label>
                                <select
                                    value={payoutForm.payout_method}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, payout_method: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">UTR Number (Optional)</label>
                                <input
                                    type="text"
                                    value={payoutForm.utr_number}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, utr_number: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    placeholder="Enter UTR number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                                <textarea
                                    value={payoutForm.notes}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    placeholder="Any notes..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Processing...' : 'Confirm Payout'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
