'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function NewAssignerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ email: '', phone: '', password: '', company_name: '', contact_person_name: '', gst_number: '', address: '', city: '', state: '', pincode: '', bank_account_holder_name: '', bank_account_number_encrypted: '', bank_ifsc_code: '', bank_name: '', is_direct_assign: true });

    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (!formData.email || !formData.phone || !formData.password) throw new Error('Email, phone, and PIN are required');
            if (!/^\d{4}$/.test(formData.password)) throw new Error('PIN must be exactly 4 digits');
            await api.post('/admin/assigners', formData);
            router.push('/assigners');
        } catch (err) { setError(err.message || 'Failed to create assigner'); }
        finally { setLoading(false); }
    };

    return (
        <div>
            <Link href="/assigners" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-[#AC9AFD] hover:text-[#AC9AFD] transition-all">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                Back to Assigners
            </Link>

            <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-800 mb-1">Add New Assigner</h2>
                <p className="text-sm text-slate-500 mb-6">Create a new insurance company/agency account</p>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Account Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2"><label htmlFor="email" className="block text-sm font-medium text-slate-600">Email Address *</label><input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="company@example.com" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="phone" className="block text-sm font-medium text-slate-600">Phone Number *</label><input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="9876543210" maxLength={10} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="password" className="block text-sm font-medium text-slate-600">PIN (4 digits) *</label><input id="password" name="password" type="text" inputMode="numeric" pattern="[0-9]{4}" value={formData.password} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setFormData(prev => ({ ...prev, password: val })); }} placeholder="••••" maxLength={4} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD] tracking-widest text-center font-mono text-lg" /></div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Company Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><label htmlFor="company_name" className="block text-sm font-medium text-slate-600">Company Name</label><input id="company_name" name="company_name" type="text" value={formData.company_name} onChange={handleChange} placeholder="XYZ Insurance Company" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="contact_person_name" className="block text-sm font-medium text-slate-600">Contact Person</label><input id="contact_person_name" name="contact_person_name" type="text" value={formData.contact_person_name} onChange={handleChange} placeholder="John Doe" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            {/* GSTIN decides the tax split on every invoice raised for this assigner — capture it up front. */}
                            <div className="space-y-2"><label htmlFor="gst_number" className="block text-sm font-medium text-slate-600">GSTIN</label><input id="gst_number" name="gst_number" type="text" value={formData.gst_number} onChange={handleChange} placeholder="27AAAAA0000A1Z5" maxLength={15} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD] uppercase" /></div>
                        </div>
                    </div>

                    {/* v2 §4.2 — captured now so a credit balance can be refunded without a follow-up edit. */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Bank Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2"><label htmlFor="bank_account_holder_name" className="block text-sm font-medium text-slate-600">Account Holder Name</label><input id="bank_account_holder_name" name="bank_account_holder_name" type="text" value={formData.bank_account_holder_name} onChange={handleChange} placeholder="XYZ Insurance Company" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="bank_account_number_encrypted" className="block text-sm font-medium text-slate-600">Account Number</label><input id="bank_account_number_encrypted" name="bank_account_number_encrypted" type="text" value={formData.bank_account_number_encrypted} onChange={handleChange} placeholder="123456789012" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="bank_ifsc_code" className="block text-sm font-medium text-slate-600">IFSC Code</label><input id="bank_ifsc_code" name="bank_ifsc_code" type="text" value={formData.bank_ifsc_code} onChange={handleChange} placeholder="HDFC0001234" maxLength={11} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD] uppercase" /></div>
                            <div className="space-y-2"><label htmlFor="bank_name" className="block text-sm font-medium text-slate-600">Bank Name</label><input id="bank_name" name="bank_name" type="text" value={formData.bank_name} onChange={handleChange} placeholder="HDFC Bank" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Optional — needed only when the platform has to refund a credit balance to this assigner.</p>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Permissions</h3>
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

                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Address</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="sm:col-span-2 lg:col-span-4 space-y-2"><label htmlFor="address" className="block text-sm font-medium text-slate-600">Street Address</label><input id="address" name="address" type="text" value={formData.address} onChange={handleChange} placeholder="123 Main Street, Suite 100" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="city" className="block text-sm font-medium text-slate-600">City</label><input id="city" name="city" type="text" value={formData.city} onChange={handleChange} placeholder="Mumbai" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="state" className="block text-sm font-medium text-slate-600">State</label><input id="state" name="state" type="text" value={formData.state} onChange={handleChange} placeholder="Maharashtra" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                            <div className="space-y-2"><label htmlFor="pincode" className="block text-sm font-medium text-slate-600">Pincode</label><input id="pincode" name="pincode" type="text" value={formData.pincode} onChange={handleChange} placeholder="400001" maxLength={6} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD]" /></div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <Link href="/assigners" className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">Cancel</Link>
                        <button type="submit" disabled={loading} className="px-4 py-2.5 bg-[#AC9AFD] hover:bg-[#9B85FC] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                            {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Creating...</>) : 'Create Assigner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
