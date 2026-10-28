'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { SURVEYOR_CATEGORIES, isGrantExpired, toDateInputValue } from '@/components/CategoryChips';

export default function EditSurveyorPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        business_address: '',
        city: '',
        state: '',
        pincode: '',
        bank_ifsc_code: '',
        upi_id: '',
        is_investigator: true,
        categories: []
    });
    // Existing grants keyed by category, so saving preserves licence number / expiry
    // instead of silently blanking them (the endpoint replaces the whole set).
    const [grantDetails, setGrantDetails] = useState({});
    const [initialCategories, setInitialCategories] = useState('');

    useEffect(() => { fetchSurveyor(); }, [params.id]);

    const fetchSurveyor = async () => {
        try {
            const response = await api.get(`/admin/surveyors/${params.id}`);
            const data = response.data;
            const grants = {};
            (data.category_grants || []).forEach(g => {
                grants[g.category] = {
                    license_number: g.license_number || '',
                    valid_until: toDateInputValue(g.valid_until),
                    expired: isGrantExpired(g.valid_until)
                };
            });
            const granted = Object.keys(grants);
            setGrantDetails(grants);
            setInitialCategories([...granted].sort().join(','));
            setFormData({
                full_name: data.full_name || '',
                business_address: data.business_address || '',
                city: data.city || '',
                state: data.state || '',
                pincode: data.pincode || '',
                bank_ifsc_code: data.bank_ifsc_code || '',
                upi_id: data.upi_id || '',
                is_investigator: data.is_investigator !== false,
                categories: granted
            });
        } catch (error) {
            console.error('Failed to fetch surveyor:', error);
            alert('Failed to load surveyor details');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const toggleCategory = (value) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(value)
                ? prev.categories.filter(c => c !== value)
                : [...prev.categories, value]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData };
            if ([...formData.categories].sort().join(',') === initialCategories) {
                // Untouched — don't rewrite the grant rows (and their provenance) for nothing.
                delete payload.categories;
            } else {
                payload.categories = formData.categories.map(c => {
                    const d = grantDetails[c];
                    if (!d) return c;
                    return {
                        category: c,
                        ...(d.license_number ? { license_number: d.license_number } : {}),
                        ...(d.valid_until ? { valid_until: d.valid_until } : {})
                    };
                });
            }
            await api.put(`/admin/surveyors/${params.id}`, payload);
            alert('Surveyor updated successfully');
            router.push(`/surveyors/${params.id}`);
        } catch (error) {
            alert('Failed to update surveyor: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <Link href={`/surveyors/${params.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-[#AC9AFD] hover:text-[#AC9AFD] transition-all">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Surveyor
            </Link>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">Edit Surveyor</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                            placeholder="Enter full name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
                        <input
                            type="text"
                            name="business_address"
                            value={formData.business_address}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                            placeholder="Enter business address"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                placeholder="Enter city"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                placeholder="Enter state"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                        <input
                            type="text"
                            name="pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                            placeholder="Enter pincode"
                            maxLength="6"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bank IFSC Code</label>
                            <input
                                type="text"
                                name="bank_ifsc_code"
                                value={formData.bank_ifsc_code}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                placeholder="Enter IFSC code"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID</label>
                            <input
                                type="text"
                                name="upi_id"
                                value={formData.upi_id}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                placeholder="Enter UPI ID"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Licence Categories</label>
                        <p className="text-xs text-slate-500 mb-2">
                            {/* Expired grants do not count towards Prime — mirror the server rule. */}
                            {formData.categories.some(c => !grantDetails[c]?.expired)
                                ? 'At least one unexpired category granted — this surveyor is Prime and can be assigned category-restricted cases.'
                                : 'No unexpired categories granted — Investigator only, not Prime.'}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {SURVEYOR_CATEGORIES.map(cat => {
                                const checked = formData.categories.includes(cat.value);
                                const expired = checked && grantDetails[cat.value]?.expired;
                                return (
                                    <label key={cat.value} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#AC9AFD]/5 border-[#AC9AFD]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleCategory(cat.value)}
                                            className="w-4 h-4 accent-[#AC9AFD] shrink-0"
                                        />
                                        <span className="text-sm text-slate-700">
                                            {cat.label}
                                            {expired && <span className="block text-xs text-red-600">Expired</span>}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Licence numbers and expiry dates are edited on the surveyor detail page; they are preserved when you save here.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Investigator</label>
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_investigator"
                                checked={formData.is_investigator}
                                onChange={handleChange}
                                className="w-4 h-4 accent-[#AC9AFD] shrink-0"
                            />
                            <span className="text-sm text-slate-700">Can take investigation cases (baseline capability — not a licence category)</span>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <Link
                            href={`/surveyors/${params.id}`}
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
