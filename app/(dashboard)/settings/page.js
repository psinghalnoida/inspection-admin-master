'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function SettingsPage() {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // specific key being saved
    const [error, setError] = useState(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    const [showUnlockPwd, setShowUnlockPwd] = useState(false);
    const [showModalPwd, setShowModalPwd] = useState(false);
    const [visibleKeys, setVisibleKeys] = useState(new Set());

    const HIDDEN_KEYS = ['qr_code_base_url', 'settings_view_password'];

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await api.get('/admin/config');
            if (res.success) {
                setConfigs(res.data);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = (e) => {
        e.preventDefault();
        let correctPassword = 'admin123';
        for (const cat in configs) {
            const pwdConfig = configs[cat].find(c => c.config_key === 'settings_view_password');
            if (pwdConfig) {
                correctPassword = pwdConfig.config_value;
                break;
            }
        }

        if (passwordInput === correctPassword) {
            setIsUnlocked(true);
            setPasswordError(false);
        } else {
            setPasswordError(true);
        }
    };

    const handleUpdate = async (key, value) => {
        setSaving(key);
        try {
            const res = await api.put(`/admin/config/${key}`, { value });
            if (res.success) {
                setConfigs(prev => {
                    const updated = {};
                    for (const cat in prev) {
                        updated[cat] = prev[cat].map(c =>
                            c.config_key === key ? { ...c, config_value: value } : c
                        );
                    }
                    return updated;
                });
                return true;
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update: ' + err.message);
        } finally {
            setSaving(null);
        }
        return false;
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!newPassword) return;

        const success = await handleUpdate('settings_view_password', newPassword);
        if (success) {
            setShowPasswordModal(false);
            setNewPassword('');
            alert('Password changed successfully');
        }
    };

    const toggleKeyVisibility = (key) => {
        setVisibleKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );

    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
    );

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    if (!isUnlocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-[#AC9AFD]/10 text-[#AC9AFD] rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Protected Settings</h2>
                    <p className="text-slate-500 mb-8">Please enter the system password to access configuration.</p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div className="relative">
                            <input
                                type={showUnlockPwd ? "text" : "password"}
                                placeholder="Enter Password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-[#AC9AFD] focus:border-[#AC9AFD] outline-none transition-all ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowUnlockPwd(!showUnlockPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showUnlockPwd ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                            {passwordError && <p className="text-red-500 text-xs mt-1 text-left ml-1">Incorrect password. Please try again.</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 bg-[#AC9AFD] text-white rounded-xl font-semibold shadow-lg shadow-[#AC9AFD]/20 hover:bg-[#9684F6] transition-all transform active:scale-[0.98]"
                        >
                            Unlock Settings
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const grouped = configs || {};

    // v2 §3: place of supply is derived from platform_state vs the assigner's
    // state. With either of these unset, every invoice silently falls back to
    // IGST and carries no platform GSTIN — i.e. legally incorrect tax documents.
    const missingBillingKeys = ['platform_state', 'platform_gstin'].filter((key) => {
        const row = Object.values(grouped).flat().find((c) => c.config_key === key);
        return row && !String(row.config_value || '').trim();
    });

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
                <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change System Password
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

            {missingBillingKeys.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-semibold text-amber-800">
                        Billing is not fully configured
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                        {missingBillingKeys.map(k => k.replace(/_/g, ' ')).join(' and ')}{' '}
                        {missingBillingKeys.length === 1 ? 'is' : 'are'} not set. Place of supply is
                        derived from the platform state, so until it is set every invoice defaults to
                        IGST — producing incorrect tax documents. Set{' '}
                        {missingBillingKeys.length === 1 ? 'it' : 'them'} under Billing Configuration
                        below before issuing invoices.
                    </p>
                </div>
            )}

            {Object.entries(grouped).map(([category, items]) => {
                const visibleItems = items.filter(i => !HIDDEN_KEYS.includes(i.config_key));
                if (visibleItems.length === 0) return null;

                return (
                    <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-700 capitalize">{category} Configuration</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {visibleItems.map(config => {
                                const isPwdField = config.config_key.includes('password');
                                const isVisible = visibleKeys.has(config.config_key);

                                return (
                                    <div key={config.config_key} className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                {config.config_key.replace(/_/g, ' ').toUpperCase()}
                                            </label>
                                            <p className="text-xs text-slate-500">{config.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2 relative">
                                            {config.value_type === 'boolean' ? (
                                                <select
                                                    defaultValue={config.config_value === 'true' || config.config_value === '1' ? 'true' : 'false'}
                                                    onChange={(e) => {
                                                        if (e.target.value !== config.config_value) {
                                                            handleUpdate(config.config_key, e.target.value);
                                                        }
                                                    }}
                                                    disabled={!config.is_editable}
                                                    className="w-56 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#AC9AFD] focus:border-[#AC9AFD] disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                                                >
                                                    <option value="false">false</option>
                                                    <option value="true">true</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type={isPwdField && !isVisible ? 'password' : (config.value_type === 'number' ? 'number' : 'text')}
                                                    defaultValue={config.config_value}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== config.config_value) {
                                                            handleUpdate(config.config_key, e.target.value);
                                                        }
                                                    }}
                                                    disabled={!config.is_editable}
                                                    className={`w-56 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#AC9AFD] focus:border-[#AC9AFD] disabled:bg-slate-100 disabled:text-slate-400 font-mono ${isPwdField ? 'pr-10' : ''}`}
                                                />
                                            )}
                                            {isPwdField && (
                                                <button
                                                    onClick={() => toggleKeyVisibility(config.config_key)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                                                </button>
                                            )}
                                            {saving === config.config_key && (
                                                <div className="w-4 h-4 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin ml-1"></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Change System Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showModalPwd ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#AC9AFD] outline-none"
                                        placeholder="Enter new system password"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowModalPwd(!showModalPwd)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showModalPwd ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 italic">This password will be required next time you access the Settings page.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newPassword || saving === 'settings_view_password'}
                                    className="flex-1 py-2 bg-[#AC9AFD] text-white font-medium rounded-lg hover:bg-[#9684F6] transition-colors shadow-lg shadow-[#AC9AFD]/20 flex items-center justify-center gap-2"
                                >
                                    {saving === 'settings_view_password' && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                                    Save Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
