'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function PricingPage() {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTier, setEditingTier] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [formData, setFormData] = useState({ tier_name: '', min_distance_km: '', max_distance_km: '', price_amount: '' });

    useEffect(() => { fetchTiers(); }, []);

    const fetchTiers = async () => {
        try { const response = await api.get('/admin/pricing-tiers'); setTiers(response.data || []); }
        catch (error) { console.error('Failed to fetch pricing tiers:', error); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (tier = null) => {
        if (tier) { setEditingTier(tier); setFormData({ tier_name: tier.tier_name, min_distance_km: tier.min_distance_km, max_distance_km: tier.max_distance_km || '', price_amount: tier.price_amount }); }
        else { setEditingTier(null); setFormData({ tier_name: '', min_distance_km: '', max_distance_km: '', price_amount: '' }); }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const data = { tier_name: formData.tier_name, min_distance_km: parseFloat(formData.min_distance_km), max_distance_km: formData.max_distance_km ? parseFloat(formData.max_distance_km) : null, price_amount: parseFloat(formData.price_amount) };
            if (editingTier) await api.put(`/admin/pricing-tiers/${editingTier.id}`, data);
            else await api.post('/admin/pricing-tiers', data);
            setShowModal(false);
            fetchTiers();
        } catch (error) { alert('Failed to save pricing tier: ' + error.message); }
        finally { setActionLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this pricing tier?')) return;
        try { await api.delete(`/admin/pricing-tiers/${id}`); fetchTiers(); }
        catch (error) { alert('Failed to delete pricing tier: ' + error.message); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div><h2 className="text-xl font-semibold text-slate-800">Pricing Tiers</h2><p className="text-sm text-slate-500 mt-1">Manage distance-based pricing for surveys</p></div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">+ Add Tier</button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>
            ) : tiers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                    <p>No pricing tiers configured</p>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg transition-colors">Add First Tier</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tiers.map((tier) => (
                        <div key={tier.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center">
                                <h3 className="font-medium text-slate-800">{tier.tier_name}</h3>
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${tier.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{tier.is_active !== false ? 'Active' : 'Inactive'}</span>
                            </div>
                            <p className="text-3xl font-bold text-[#AC9AFD]">₹{parseFloat(tier.price_amount).toLocaleString()}</p>
                            <p className="text-sm text-slate-500">{tier.min_distance_km} - {tier.max_distance_km || '∞'} km</p>
                            <div className="flex gap-2 mt-auto pt-2">
                                <button onClick={() => handleOpenModal(tier)} className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">Edit</button>
                                <button onClick={() => handleDelete(tier.id)} className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-slate-800 mb-6">{editingTier ? 'Edit Pricing Tier' : 'Add Pricing Tier'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Tier Name</label><input type="text" value={formData.tier_name} onChange={(e) => setFormData(p => ({ ...p, tier_name: e.target.value }))} placeholder="e.g., Short Distance" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Min Distance (km)</label><input type="number" value={formData.min_distance_km} onChange={(e) => setFormData(p => ({ ...p, min_distance_km: e.target.value }))} placeholder="0" min="0" step="0.1" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                    <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Max Distance (km)</label><input type="number" value={formData.max_distance_km} onChange={(e) => setFormData(p => ({ ...p, max_distance_km: e.target.value }))} placeholder="∞" min="0" step="0.1" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                                </div>
                                <div className="space-y-2"><label className="block text-sm font-medium text-slate-600">Price Amount (₹)</label><input type="number" value={formData.price_amount} onChange={(e) => setFormData(p => ({ ...p, price_amount: e.target.value }))} placeholder="500" min="0" step="0.01" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} disabled={actionLoading} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-sm font-medium rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{actionLoading ? 'Saving...' : editingTier ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
