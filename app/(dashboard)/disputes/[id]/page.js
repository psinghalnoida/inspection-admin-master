'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import socketService from '@/lib/socket';

export default function DisputeDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [dispute, setDispute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);

    // Resolution Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [decision, setDecision] = useState('full_payment'); // full_payment, partial_payment, no_payment
    const [partialAmount, setPartialAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    // Chat
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [dispute?.messages]);

    useEffect(() => {
        if (id) fetchDispute();

        // Connect socket
        const initSocket = async () => {
            const socket = await socketService.connect();
            if (socket && dispute?.survey_id) {
                console.log('Joining survey room:', dispute.survey_id);
                socketService.joinSurveyRoom(dispute.survey_id);

                socketService.onDisputeMessage((newMessage) => {
                    console.log('New dispute message received:', newMessage);
                    setDispute(prev => {
                        if (!prev) return prev;
                        // Avoid duplicates
                        if (prev.messages && prev.messages.some(m => m.id === newMessage.id)) return prev;
                        return {
                            ...prev,
                            messages: [...(prev.messages || []), newMessage]
                        };
                    });
                });
            }
        };

        if (dispute?.survey_id) {
            initSocket();
        }

        return () => {
            if (dispute?.survey_id) {
                socketService.leaveSurveyRoom(dispute.survey_id);
            }
        };
    }, [id, dispute?.survey_id]);

    const fetchDispute = async () => {
        try {
            const res = await api.get(`/admin/disputes/${id}`);
            if (res.success) {
                setDispute(res.data);
            }
        } catch (err) {
            setError('Failed to fetch dispute details');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        setResolving(true);
        setError(null);
        try {
            const payload = { decision, notes };
            if (decision === 'partial_payment') {
                payload.partial_amount = partialAmount;
            }

            const res = await api.put(`/admin/disputes/${id}/resolve`, payload);
            if (res.success) {
                setModalOpen(false);
                fetchDispute();
            } else {
                setError(res.message || 'Failed to resolve dispute');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setResolving(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setSending(true);
        try {
            const res = await api.post(`/admin/disputes/${id}/messages`, { message_text: newMessage });
            if (res.success) {
                setNewMessage('');
                fetchDispute(); // Refresh to see new message
            } else {
                alert('Failed to send message');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading dispute details...</div>;
    if (!dispute) return <div className="p-8 text-center text-red-500">Dispute not found</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        Dispute #{dispute.id}
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full items-center ${dispute.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : dispute.is_escalated
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                            {dispute.status === 'resolved' ? 'Resolved' : dispute.is_escalated ? 'Escalated' : 'Open'}
                        </span>
                    </h1>
                    <p className="text-slate-500 mt-1">Created on {new Date(dispute.created_at).toLocaleDateString()}</p>
                </div>
                {dispute.status !== 'resolved' && (
                    <button
                        onClick={() => setModalOpen(true)}
                        className="px-6 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white font-medium rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Resolve Dispute
                    </button>
                )}
            </div>

            {/* Context Cards */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Survey Context */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Survey Details</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-slate-500">LAID</span> <span className="font-mono text-slate-800">{dispute.laid}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Case Ref</span> <span className="font-mono text-slate-800">{dispute.case_reference || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Survey Status</span> <span className="font-medium text-slate-800">{dispute.survey_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></div>
                    </div>
                </div>

                {/* Parties */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Parties Involved</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">A</div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Assigner</p>
                                <p className="text-slate-800">{dispute.assigner_name}</p>
                                <p className="text-xs text-slate-500">{dispute.assigner_phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">S</div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Surveyor</p>
                                <p className="text-slate-800">{dispute.surveyor_name}</p>
                                <p className="text-xs text-slate-500">{dispute.surveyor_phone}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Decision (if resolved) */}
            {dispute.status === 'resolved' && (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                    <h2 className="text-lg font-semibold text-emerald-800 mb-2">Resolution Summary</h2>
                    <div className="space-y-2 text-emerald-700">
                        <p><span className="font-medium">Decision:</span> {dispute.admin_decision.replace('_', ' ').toUpperCase()}</p>
                        {dispute.admin_partial_amount && <p><span className="font-medium">Payout Amount:</span> ₹{dispute.admin_partial_amount}</p>}
                        <p><span className="font-medium">Notes:</span> {dispute.admin_decision_notes || 'No notes provided.'}</p>
                        <p className="text-xs mt-2 text-emerald-600">Resolved on {new Date(dispute.resolved_at).toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Message Thread */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-700">Communication Thread</h2>
                </div>
                <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
                    {dispute.messages && dispute.messages.length > 0 ? (
                        dispute.messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.sender_type === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                <div className={`px-4 py-3 rounded-xl ${msg.sender_type === 'admin' ? 'bg-[#AC9AFD] text-white rounded-br-none' :
                                    msg.sender_type === 'assigner' ? 'bg-blue-100 text-slate-800 rounded-bl-none' :
                                        'bg-slate-100 text-slate-800 rounded-bl-none'
                                    }`}>
                                    <p className="text-sm font-semibold mb-1 opacity-75 capitalize">{msg.sender_type}</p>
                                    <p>{msg.message_text}</p>
                                </div>
                                <span className="text-xs text-slate-400 mt-1">{new Date(msg.created_at).toLocaleString()}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-8">No messages in this dispute thread.</p>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message to the parties..."
                            disabled={sending}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#AC9AFD] focus:border-[#AC9AFD] disabled:bg-slate-50"
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={sending || !newMessage.trim()}
                            className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                            {sending ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Resolution Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Resolve Dispute</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Decision</label>
                                <select
                                    value={decision}
                                    onChange={(e) => setDecision(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#AC9AFD] focus:border-[#AC9AFD]"
                                >
                                    <option value="full_payment">Release Full Payment to Surveyor</option>
                                    <option value="partial_payment">Release Partial Payment</option>
                                    <option value="no_payment">No Payment (Refund Assigner)</option>
                                </select>
                            </div>

                            {decision === 'partial_payment' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Partial Payout Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={partialAmount}
                                        onChange={(e) => setPartialAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#AC9AFD] focus:border-[#AC9AFD]"
                                        placeholder="e.g. 1500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Resolution Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#AC9AFD] focus:border-[#AC9AFD]"
                                    placeholder="Explain the reason for this decision..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50">Cancel</button>
                            <button
                                onClick={handleResolve}
                                disabled={resolving}
                                className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {resolving ? 'Resolving...' : 'Confirm Resolution'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
