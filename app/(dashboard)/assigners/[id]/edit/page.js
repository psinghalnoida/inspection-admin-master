'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function EditAssignerPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        contact_person_name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        bank_account_holder_name: '',
        bank_account_number_encrypted: '',
        bank_ifsc_code: '',
        bank_name: '',
        is_direct_assign: true
    });

    useEffect(() => { fetchAssigner(); }, [params.id]);

    const fetchAssigner = async () => {
        try {
            const response = await api.get(`/admin/assigners/${params.id}`);
            const data = response.data;
            setFormData({
                company_name: data.company_name || '',
                contact_person_name: data.contact_person_name || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                pincode: data.pincode || '',
                bank_account_holder_name: data.bank_account_holder_name || '',
                bank_account_number_encrypted: data.bank_account_number_encrypted || '',
                bank_ifsc_code: data.bank_ifsc_code || '',
                bank_name: data.bank_name || '',
                is_direct_assign: data.is_direct_assign !== false && data.is_direct_assign !== 0
            });
        } catch (error) {
            console.error('Failed to fetch assigner:', error);
            alert('Failed to load assigner details');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/admin/assigners/${params.id}`, formData);
            alert('Assigner updated successfully');
            router.push(`/assigners/${params.id}`);
        } catch (error) {
            alert('Failed to update assigner: ' + error.message);
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
            <Link href={`/assigners/${params.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-[#AC9AFD] hover:text-[#AC9AFD] transition-all">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Assigner
            </Link>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-6">Edit Assigner</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                        <input
                            type="text"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                            placeholder="Enter company name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person Name</label>
                        <input
                            type="text"
                            name="contact_person_name"
                            value={formData.contact_person_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                            placeholder="Enter contact person name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                            placeholder="Enter address"
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

                    {/* v2 §4.2 — needed to refund a credit balance back to the assigner. */}
                    <div className="pt-2">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 pb-2 border-b border-slate-200">Bank Details</h3>
                        <p className="text-xs text-slate-400 mb-4">Used when the platform owes this assigner money and the credit is refunded by bank transfer.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                                <input
                                    type="text"
                                    name="bank_account_holder_name"
                                    value={formData.bank_account_holder_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                    placeholder="Enter account holder name"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                    <input
                                        type="text"
                                        name="bank_account_number_encrypted"
                                        value={formData.bank_account_number_encrypted}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                        placeholder="Enter account number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                                    <input
                                        type="text"
                                        name="bank_ifsc_code"
                                        value={formData.bank_ifsc_code}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                        placeholder="Enter IFSC code"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    name="bank_name"
                                    value={formData.bank_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                                    placeholder="Enter bank name"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer w-fit">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={formData.is_direct_assign}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_direct_assign: e.target.checked }))}
                                />
                                <div className={`w-11 h-6 rounded-full transition-colors ${formData.is_direct_assign ? 'bg-[#AC9AFD]' : 'bg-slate-300'}`}></div>
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_direct_assign ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-slate-700">Allow Direct Assignment</span>
                                <p className="text-xs text-slate-400">When enabled, this assigner can assign surveys directly to a surveyor by phone number</p>
                            </div>
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
                            href={`/assigners/${params.id}`}
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
