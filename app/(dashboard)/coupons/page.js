'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

const discountTypeOptions = [
    { value: 'percentage', label: 'Percentage' },
    { value: 'fixed', label: 'Fixed Amount' },
];

export default function CouponsPage() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [formData, setFormData] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_discount_amount: '', usage_limit: '', valid_from: '', valid_until: '' });

    useEffect(() => { fetchCoupons(); }, []);

    const fetchCoupons = async () => {
        try { const response = await api.get('/admin/coupons'); setCoupons(response.data || []); }
        catch (error) { console.error('Failed to fetch coupons:', error); }
        finally { setLoading(false); }
    };

    const handleOpenModal = () => {
        setFormData({ code: '', description: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_discount_amount: '', usage_limit: '', valid_from: new Date().toISOString().split('T')[0], valid_until: '' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const data = { code: formData.code.toUpperCase(), description: formData.description || null, discount_type: formData.discount_type, discount_value: parseFloat(formData.discount_value), min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0, max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null, usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null, valid_from: formData.valid_from, valid_until: formData.valid_until };
            await api.post('/admin/coupons', data);
            setShowModal(false);
            fetchCoupons();
        } catch (error) { alert('Failed to create coupon: ' + error.message); }
        finally { setActionLoading(false); }
    };

    const handleToggleActive = async (id, isActive) => {
        try { await api.put(`/admin/coupons/${id}`, { is_active: !isActive }); fetchCoupons(); }
        catch (error) { alert('Failed to update coupon: ' + error.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;
        try { await api.delete(`/admin/coupons/${id}`); fetchCoupons(); }
        catch (error) { alert('Failed to delete coupon: ' + error.message); }
    };

    const isExpired = (validUntil) => new Date(validUntil) < new Date();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div><h2 className="text-xl font-semibold text-slate-800">Coupons</h2><p className="text-sm text-slate-500 mt-1">Manage discount codes for surveys</p></div>
                <button onClick={handleOpenModal} className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">+ Create Coupon</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>
                ) : coupons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-4">
                        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5z" /></svg>
                        <p>No coupons created yet</p>
                        <button onClick={handleOpenModal} className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Create First Coupon</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usage</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valid Until</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {coupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3"><div><span className="font-mono font-semibold bg-slate-100 px-2 py-1 rounded text-sm text-slate-800">{coupon.code}</span>{coupon.description && <p className="text-xs text-slate-500 mt-1">{coupon.description}</p>}</div></td>
                                        <td className="px-4 py-3"><span className="font-semibold text-emerald-600">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}</span>{coupon.max_discount_amount && <p className="text-xs text-slate-500">Max ₹{coupon.max_discount_amount}</p>}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{coupon.usage_count || 0} / {coupon.usage_limit || '∞'}</td>
                                        <td className="px-4 py-3 text-sm"><span className={isExpired(coupon.valid_until) ? 'text-red-600' : 'text-slate-600'}>{new Date(coupon.valid_until).toLocaleDateString()}</span></td>
                                        <td className="px-4 py-3">{isExpired(coupon.valid_until) ? (<span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Expired</span>) : (<span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${coupon.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{coupon.is_active ? 'Active' : 'Inactive'}</span>)}</td>
                                        <td className="px-4 py-3"><div className="flex gap-2">
                                            {!isExpired(coupon.valid_until) && (<button onClick={() => handleToggleActive(coupon.id, coupon.is_active)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${coupon.is_active ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}>{coupon.is_active ? 'Disable' : 'Enable'}</button>)}
                                            <button onClick={() => handleDelete(coupon.id)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors">Delete</button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-slate-800 mb-6">Create Coupon</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Coupon Code *</label><input type="text" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-600">Discount Type *</label>
                                        <CustomSelect
                                            value={formData.discount_type}
                                            onChange={(val) => setFormData(p => ({ ...p, discount_type: val }))}
                                            options={discountTypeOptions}
                                            placeholder="Select type"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Description</label><input type="text" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Get 20% off on your first survey" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Discount Value *</label><input type="number" value={formData.discount_value} onChange={(e) => setFormData(p => ({ ...p, discount_value: e.target.value }))} placeholder={formData.discount_type === 'percentage' ? '20' : '100'} min="0" max={formData.discount_type === 'percentage' ? '100' : undefined} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Max Discount (₹)</label><input type="number" value={formData.max_discount_amount} onChange={(e) => setFormData(p => ({ ...p, max_discount_amount: e.target.value }))} placeholder="500" min="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Min Order Amount (₹)</label><input type="number" value={formData.min_order_amount} onChange={(e) => setFormData(p => ({ ...p, min_order_amount: e.target.value }))} placeholder="0" min="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Usage Limit</label><input type="number" value={formData.usage_limit} onChange={(e) => setFormData(p => ({ ...p, usage_limit: e.target.value }))} placeholder="Unlimited" min="1" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Valid From *</label><input type="date" value={formData.valid_from} onChange={(e) => setFormData(p => ({ ...p, valid_from: e.target.value }))} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Valid Until *</label><input type="date" value={formData.valid_until} onChange={(e) => setFormData(p => ({ ...p, valid_until: e.target.value }))} min={formData.valid_from} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} disabled={actionLoading} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-sm font-medium rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{actionLoading ? 'Creating...' : 'Create Coupon'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
