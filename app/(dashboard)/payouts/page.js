'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

export default function PayoutsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('wallets');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState({
        show: false,
        percentage: 0,
        step: '',
        totalRecords: 0,
        matchedRecords: 0,
        type: '' // 'wallets' or 'payouts'
    });
    const [stats, setStats] = useState(null);
    const [wallets, setWallets] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

    // Wallet Filters
    const [walletFilters, setWalletFilters] = useState({
        search: '',
        balanceMin: '',
        balanceMax: '',
        sortBy: 'balance',
        sortOrder: 'desc',
        hasBalance: '' // 'yes', 'no', or ''
    });

    // Payout History Filters  
    const [payoutFilters, setPayoutFilters] = useState({
        search: '',
        status: '',
        method: '',
        dateFrom: '',
        dateTo: '',
        amountMin: '',
        amountMax: ''
    });

    const [showWalletFilters, setShowWalletFilters] = useState(false);
    const [showPayoutFilters, setShowPayoutFilters] = useState(false);

    useEffect(() => {
        fetchStats();
        if (activeTab === 'wallets') {
            fetchWallets();
        } else {
            fetchPayoutHistory();
        }
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/payouts/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchWallets = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 20,
                sort: walletFilters.sortBy,
                order: walletFilters.sortOrder
            };
            if (walletFilters.search) params.search = walletFilters.search;
            if (walletFilters.balanceMin) params.balance_min = walletFilters.balanceMin;
            if (walletFilters.balanceMax) params.balance_max = walletFilters.balanceMax;
            if (walletFilters.hasBalance) params.has_balance = walletFilters.hasBalance;

            const res = await api.get('/admin/payouts/wallets', params);
            setWallets(res.data || []);
            setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
        } catch (err) {
            console.error('Error fetching wallets:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayoutHistory = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (payoutFilters.search) params.search = payoutFilters.search;
            if (payoutFilters.status) params.status = payoutFilters.status;
            if (payoutFilters.method) params.method = payoutFilters.method;
            if (payoutFilters.dateFrom) params.date_from = payoutFilters.dateFrom;
            if (payoutFilters.dateTo) params.date_to = payoutFilters.dateTo;
            if (payoutFilters.amountMin) params.amount_min = payoutFilters.amountMin;
            if (payoutFilters.amountMax) params.amount_max = payoutFilters.amountMax;

            const res = await api.get('/admin/payouts/history', params);
            setPayouts(res.data || []);
            setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
        } catch (err) {
            console.error('Error fetching payouts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleWalletSearch = (e) => {
        e.preventDefault();
        fetchWallets(1);
    };

    const handlePayoutSearch = (e) => {
        e.preventDefault();
        fetchPayoutHistory(1);
    };

    const clearWalletFilters = () => {
        setWalletFilters({
            search: '',
            balanceMin: '',
            balanceMax: '',
            sortBy: 'balance',
            sortOrder: 'desc',
            hasBalance: ''
        });
        setTimeout(() => fetchWallets(1), 100);
    };

    const clearPayoutFilters = () => {
        setPayoutFilters({
            search: '',
            status: '',
            method: '',
            dateFrom: '',
            dateTo: '',
            amountMin: '',
            amountMax: ''
        });
        setTimeout(() => fetchPayoutHistory(1), 100);
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
            year: 'numeric'
        });
    };

    const formatDateForExcel = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Export Wallets to Excel
    const exportWalletsToExcel = async () => {
        setExporting(true);
        try {
            // Fetch all wallets without pagination
            const params = {
                page: 1,
                limit: 10000,
                sort: walletFilters.sortBy,
                order: walletFilters.sortOrder
            };
            if (walletFilters.search) params.search = walletFilters.search;
            if (walletFilters.balanceMin) params.balance_min = walletFilters.balanceMin;
            if (walletFilters.balanceMax) params.balance_max = walletFilters.balanceMax;
            if (walletFilters.hasBalance) params.has_balance = walletFilters.hasBalance;

            const res = await api.get('/admin/payouts/wallets', params);
            const allWallets = res.data || [];

            // Prepare data for Excel
            const excelData = allWallets.map((wallet, index) => ({
                'S.No': index + 1,
                'Surveyor Name': wallet.surveyor?.name || '',
                'Phone': wallet.surveyor?.phone || '',
                'Email': wallet.surveyor?.email || '',
                'City': wallet.surveyor?.city || '',
                'Current Balance (₹)': parseFloat(wallet.balance) || 0,
                'Total Earned (₹)': parseFloat(wallet.total_earned) || 0,
                'Total Withdrawn (₹)': parseFloat(wallet.total_withdrawn) || 0,
                'Last Activity': formatDateForExcel(wallet.last_transaction_at),
                'Status': wallet.surveyor?.is_active ? 'Active' : 'Inactive'
            }));

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            ws['!cols'] = [
                { wch: 6 },   // S.No
                { wch: 25 },  // Name
                { wch: 15 },  // Phone
                { wch: 25 },  // Email
                { wch: 15 },  // City
                { wch: 18 },  // Balance
                { wch: 18 },  // Total Earned
                { wch: 18 },  // Total Withdrawn
                { wch: 15 },  // Last Activity
                { wch: 10 }   // Status
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Surveyor Wallets');

            // Download file - browser compatible method
            const fileName = `Surveyor_Wallets_${new Date().toISOString().split('T')[0]}.xlsx`;
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('Error exporting wallets:', err);
            alert('Error exporting data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    // Export Payout History to Excel
    const exportPayoutsToExcel = async () => {
        setExporting(true);
        try {
            // Fetch all payouts without pagination
            const params = { page: 1, limit: 10000 };
            if (payoutFilters.search) params.search = payoutFilters.search;
            if (payoutFilters.status) params.status = payoutFilters.status;
            if (payoutFilters.method) params.method = payoutFilters.method;
            if (payoutFilters.dateFrom) params.date_from = payoutFilters.dateFrom;
            if (payoutFilters.dateTo) params.date_to = payoutFilters.dateTo;
            if (payoutFilters.amountMin) params.amount_min = payoutFilters.amountMin;
            if (payoutFilters.amountMax) params.amount_max = payoutFilters.amountMax;

            const res = await api.get('/admin/payouts/history', params);
            const allPayouts = res.data || [];

            // Debug: Log first payout to check structure
            console.log('Payout data sample:', allPayouts[0]);

            // Prepare data for Excel
            const excelData = allPayouts.map((payout, index) => ({
                'S.No': index + 1,
                'Date': formatDateForExcel(payout.created_at),
                'Surveyor Name': payout.surveyor?.name || '',
                'Surveyor Phone': payout.surveyor?.phone || '',
                'Survey ID': payout.survey?.laid || '-',
                'Amount (₹)': parseFloat(payout.amount) || 0,
                'Method': payout.method?.replace('_', ' ') || 'Wallet',
                'Type': payout.type || 'survey_completion',
                'Status': payout.status || '',
                'UTR Number': payout.utr_number || '',
                'Completed At': formatDateForExcel(payout.completed_at)
            }));

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            ws['!cols'] = [
                { wch: 6 },   // S.No
                { wch: 12 },  // Date
                { wch: 25 },  // Name
                { wch: 15 },  // Phone
                { wch: 20 },  // LAID
                { wch: 12 },  // Amount
                { wch: 15 },  // Method
                { wch: 18 },  // Type
                { wch: 12 },  // Status
                { wch: 20 },  // UTR
                { wch: 15 }   // Completed At
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Payout History');

            // Download file - browser compatible method
            const fileName = `Payout_History_${new Date().toISOString().split('T')[0]}.xlsx`;
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('Error exporting payouts:', err);
            alert('Error exporting data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    // Sync Wallets from Excel Upload
    const syncWalletsFromExcel = async (file) => {
        setSyncing(true);
        setSyncProgress({ show: true, percentage: 0, step: 'Reading Excel file...', totalRecords: 0, matchedRecords: 0, type: 'wallets' });

        try {
            // Step 1: Read the uploaded Excel file (0-20%)
            await new Promise(r => setTimeout(r, 300)); // Small delay for UI
            setSyncProgress(prev => ({ ...prev, percentage: 10, step: 'Parsing Excel data...' }));

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            setSyncProgress(prev => ({ ...prev, percentage: 20, step: 'Extracting phone numbers...', totalRecords: jsonData.length }));
            await new Promise(r => setTimeout(r, 200));

            // Step 2: Extract phone numbers (20-30%)
            const phones = jsonData.map(row => {
                return row['Phone'] || row['phone'] || row['Surveyor Phone'] || row['Mobile'] || '';
            }).filter(p => p);

            if (phones.length === 0) {
                setSyncProgress({ show: false, percentage: 0, step: '', totalRecords: 0, matchedRecords: 0, type: '' });
                alert('No phone numbers found in the Excel. Make sure you have a "Phone" column.');
                return;
            }

            setSyncProgress(prev => ({ ...prev, percentage: 30, step: 'Connecting to server...' }));
            await new Promise(r => setTimeout(r, 200));

            // Step 3: Call backend API (30-60%)
            setSyncProgress(prev => ({ ...prev, percentage: 40, step: 'Fetching latest data from database...' }));
            const res = await api.post('/admin/payouts/sync-by-phones', { phones });
            const syncedData = res.data?.data || {};

            setSyncProgress(prev => ({ ...prev, percentage: 60, step: 'Matching records...', matchedRecords: Object.keys(syncedData).length }));
            await new Promise(r => setTimeout(r, 300));

            // Step 4: Merge data (60-80%)
            setSyncProgress(prev => ({ ...prev, percentage: 70, step: 'Merging data...' }));
            const mergedData = jsonData.map((row, index) => {
                const phone = row['Phone'] || row['phone'] || row['Surveyor Phone'] || row['Mobile'] || '';
                const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

                if (syncedData[cleanPhone]) {
                    const synced = syncedData[cleanPhone];
                    return {
                        'S.No': index + 1,
                        'Surveyor Name': synced.surveyor_name,
                        'Phone': synced.phone,
                        'Email': synced.email,
                        'City': synced.city,
                        'Current Balance (₹)': synced.balance,
                        'Total Earned (₹)': synced.total_earned,
                        'Total Withdrawn (₹)': synced.total_withdrawn,
                        'Last Activity': formatDateForExcel(synced.last_activity),
                        'Status': synced.status,
                        'Sync Status': '✓ Updated'
                    };
                } else {
                    return { ...row, 'Sync Status': '✗ Not Found' };
                }
            });

            setSyncProgress(prev => ({ ...prev, percentage: 80, step: 'Generating Excel file...' }));
            await new Promise(r => setTimeout(r, 200));

            // Step 5: Create Excel (80-95%)
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(mergedData);
            ws['!cols'] = [
                { wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
                { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 10 }, { wch: 12 }
            ];
            XLSX.utils.book_append_sheet(wb, ws, 'Synced Wallets');

            setSyncProgress(prev => ({ ...prev, percentage: 95, step: 'Preparing download...' }));
            await new Promise(r => setTimeout(r, 200));

            // Step 6: Download (95-100%)
            const fileName = `Synced_Wallets_${new Date().toISOString().split('T')[0]}.xlsx`;
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setSyncProgress(prev => ({ ...prev, percentage: 100, step: 'Complete!' }));
            await new Promise(r => setTimeout(r, 800));

        } catch (err) {
            console.error('Error syncing wallets:', err);
            alert('Error syncing data. Please try again.');
        } finally {
            setSyncing(false);
            setSyncProgress({ show: false, percentage: 0, step: '', totalRecords: 0, matchedRecords: 0, type: '' });
        }
    };

    // Sync Payouts from Excel Upload
    const syncPayoutsFromExcel = async (file) => {
        setSyncing(true);
        setSyncProgress({ show: true, percentage: 0, step: 'Reading Excel file...', totalRecords: 0, matchedRecords: 0, type: 'payouts' });

        try {
            // Step 1: Read the uploaded Excel file (0-20%)
            await new Promise(r => setTimeout(r, 300));
            setSyncProgress(prev => ({ ...prev, percentage: 10, step: 'Parsing Excel data...' }));

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            setSyncProgress(prev => ({ ...prev, percentage: 20, step: 'Extracting Survey IDs...', totalRecords: jsonData.length }));
            await new Promise(r => setTimeout(r, 200));

            // Step 2: Extract LAIDs (20-30%)
            const laids = jsonData.map(row => {
                return row['Survey ID'] || row['LAID'] || row['Survey LAID'] || row['survey_id'] || '';
            }).filter(l => l && l !== '-');

            if (laids.length === 0) {
                setSyncProgress({ show: false, percentage: 0, step: '', totalRecords: 0, matchedRecords: 0, type: '' });
                alert('No Survey IDs found in the Excel. Make sure you have a "Survey ID" column.');
                return;
            }

            setSyncProgress(prev => ({ ...prev, percentage: 30, step: 'Connecting to server...' }));
            await new Promise(r => setTimeout(r, 200));

            // Step 3: Call backend API (30-60%)
            setSyncProgress(prev => ({ ...prev, percentage: 40, step: 'Fetching latest data from database...' }));
            const res = await api.post('/admin/payouts/sync-by-laids', { laids });
            const syncedData = res.data?.data || {};

            setSyncProgress(prev => ({ ...prev, percentage: 60, step: 'Matching records...', matchedRecords: Object.keys(syncedData).length }));
            await new Promise(r => setTimeout(r, 300));

            // Step 4: Merge data (60-80%)
            setSyncProgress(prev => ({ ...prev, percentage: 70, step: 'Merging data...' }));
            const mergedData = jsonData.map((row, index) => {
                const laid = row['Survey ID'] || row['LAID'] || row['Survey LAID'] || row['survey_id'] || '';

                if (syncedData[laid]) {
                    const synced = syncedData[laid];
                    return {
                        'S.No': index + 1,
                        'Date': formatDateForExcel(synced.date),
                        'Surveyor Name': synced.surveyor_name,
                        'Surveyor Phone': synced.surveyor_phone,
                        'Survey ID': synced.survey_id,
                        'Amount (₹)': synced.amount,
                        'Method': synced.method,
                        'Type': synced.type,
                        'Status': synced.status,
                        'UTR Number': synced.utr_number,
                        'Completed At': formatDateForExcel(synced.completed_at),
                        'Sync Status': '✓ Updated'
                    };
                } else {
                    return { ...row, 'Sync Status': '✗ Not Found' };
                }
            });

            setSyncProgress(prev => ({ ...prev, percentage: 80, step: 'Generating Excel file...' }));
            await new Promise(r => setTimeout(r, 200));

            // Step 5: Create Excel (80-95%)
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(mergedData);
            ws['!cols'] = [
                { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 18 },
                { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
            ];
            XLSX.utils.book_append_sheet(wb, ws, 'Synced Payouts');

            setSyncProgress(prev => ({ ...prev, percentage: 95, step: 'Preparing download...' }));
            await new Promise(r => setTimeout(r, 200));

            // Step 6: Download (95-100%)
            const fileName = `Synced_Payouts_${new Date().toISOString().split('T')[0]}.xlsx`;
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setSyncProgress(prev => ({ ...prev, percentage: 100, step: 'Complete!' }));
            await new Promise(r => setTimeout(r, 800));

        } catch (err) {
            console.error('Error syncing payouts:', err);
            alert('Error syncing data. Please try again.');
        } finally {
            setSyncing(false);
            setSyncProgress({ show: false, percentage: 0, step: '', totalRecords: 0, matchedRecords: 0, type: '' });
        }
    };

    // Handle file upload for sync
    const handleWalletSyncUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            syncWalletsFromExcel(file);
            e.target.value = ''; // Reset input
        }
    };

    const handlePayoutSyncUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            syncPayoutsFromExcel(file);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="space-y-6">
            {/* Sync Progress Modal */}
            {syncProgress.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-fade-in">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">
                                Syncing {syncProgress.type === 'wallets' ? 'Wallets' : 'Payouts'}
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Please wait while we sync your data</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-600">{syncProgress.step}</span>
                                <span className="text-sm font-bold text-blue-600">{syncProgress.percentage}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${syncProgress.percentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-800">{syncProgress.totalRecords}</p>
                                <p className="text-xs text-slate-500">Total Records</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-green-600">{syncProgress.matchedRecords}</p>
                                <p className="text-xs text-slate-500">Matched</p>
                            </div>
                        </div>

                        {/* Complete Animation */}
                        {syncProgress.percentage === 100 && (
                            <div className="mt-6 flex items-center justify-center gap-2 text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-semibold">Sync Complete! Downloading...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Pending Balance</p>
                    <p className="text-2xl font-bold text-amber-600">{formatAmount(stats?.pending_balance)}</p>
                    <p className="text-xs text-slate-400 mt-1">{stats?.surveyors_with_balance || 0} surveyors</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Total Earned</p>
                    <p className="text-2xl font-bold text-green-600">{formatAmount(stats?.total_earned)}</p>
                    <p className="text-xs text-slate-400 mt-1">All time</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Total Withdrawn</p>
                    <p className="text-2xl font-bold text-blue-600">{formatAmount(stats?.total_withdrawn)}</p>
                    <p className="text-xs text-slate-400 mt-1">All time</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Recent Payouts</p>
                    <p className="text-2xl font-bold text-purple-600">{formatAmount(stats?.recent_payouts_amount)}</p>
                    <p className="text-xs text-slate-400 mt-1">{stats?.recent_payouts_count || 0} in last 30 days</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('wallets')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'wallets'
                                ? 'border-[#AC9AFD] text-[#AC9AFD]'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Surveyor Wallets
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                                ? 'border-[#AC9AFD] text-[#AC9AFD]'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Payout History
                        </button>
                    </div>
                </div>

                {/* Wallet Filters */}
                {activeTab === 'wallets' && (
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <form onSubmit={handleWalletSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={walletFilters.search}
                                onChange={(e) => setWalletFilters({ ...walletFilters, search: e.target.value })}
                                placeholder="Search by name, phone, or email..."
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD] focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowWalletFilters(!showWalletFilters)}
                                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${showWalletFilters ? 'bg-[#AC9AFD] text-white border-[#AC9AFD]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filters
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#AC9AFD] text-white rounded-lg text-sm font-medium hover:bg-[#9B89EC] transition-colors"
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={exportWalletsToExcel}
                                disabled={exporting}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {exporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Export Excel
                                    </>
                                )}
                            </button>
                            {/* Upload & Sync Button */}
                            <input
                                type="file"
                                id="wallet-sync-upload"
                                accept=".xlsx,.xls"
                                onChange={handleWalletSyncUpload}
                                className="hidden"
                            />
                            <label
                                htmlFor="wallet-sync-upload"
                                className={`px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer ${syncing ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {syncing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Upload & Sync
                                    </>
                                )}
                            </label>
                        </form>

                        {showWalletFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Balance Status</label>
                                    <select
                                        value={walletFilters.hasBalance}
                                        onChange={(e) => setWalletFilters({ ...walletFilters, hasBalance: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    >
                                        <option value="">All</option>
                                        <option value="yes">With Balance</option>
                                        <option value="no">Zero Balance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Min Balance</label>
                                    <input
                                        type="number"
                                        value={walletFilters.balanceMin}
                                        onChange={(e) => setWalletFilters({ ...walletFilters, balanceMin: e.target.value })}
                                        placeholder="₹0"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Max Balance</label>
                                    <input
                                        type="number"
                                        value={walletFilters.balanceMax}
                                        onChange={(e) => setWalletFilters({ ...walletFilters, balanceMax: e.target.value })}
                                        placeholder="₹∞"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Sort By</label>
                                    <select
                                        value={`${walletFilters.sortBy}-${walletFilters.sortOrder}`}
                                        onChange={(e) => {
                                            const [sortBy, sortOrder] = e.target.value.split('-');
                                            setWalletFilters({ ...walletFilters, sortBy, sortOrder });
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    >
                                        <option value="balance-desc">Balance (High to Low)</option>
                                        <option value="balance-asc">Balance (Low to High)</option>
                                        <option value="total_earned-desc">Total Earned (High to Low)</option>
                                        <option value="total_earned-asc">Total Earned (Low to High)</option>
                                        <option value="last_transaction_at-desc">Recent Activity</option>
                                        <option value="created_at-desc">Newest First</option>
                                    </select>
                                </div>
                                <div className="md:col-span-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={clearWalletFilters}
                                        className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fetchWallets(1)}
                                        className="px-4 py-2 bg-[#AC9AFD] text-white rounded-lg text-sm font-medium hover:bg-[#9B89EC] transition-colors"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Payout History Filters */}
                {activeTab === 'history' && (
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <form onSubmit={handlePayoutSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={payoutFilters.search}
                                onChange={(e) => setPayoutFilters({ ...payoutFilters, search: e.target.value })}
                                placeholder="Search by surveyor name, LAID..."
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD] focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPayoutFilters(!showPayoutFilters)}
                                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${showPayoutFilters ? 'bg-[#AC9AFD] text-white border-[#AC9AFD]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filters
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#AC9AFD] text-white rounded-lg text-sm font-medium hover:bg-[#9B89EC] transition-colors"
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={exportPayoutsToExcel}
                                disabled={exporting}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {exporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Export Excel
                                    </>
                                )}
                            </button>
                            {/* Upload & Sync Button */}
                            <input
                                type="file"
                                id="payout-sync-upload"
                                accept=".xlsx,.xls"
                                onChange={handlePayoutSyncUpload}
                                className="hidden"
                            />
                            <label
                                htmlFor="payout-sync-upload"
                                className={`px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer ${syncing ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {syncing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Upload & Sync
                                    </>
                                )}
                            </label>
                        </form>

                        {showPayoutFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Status</label>
                                    <select
                                        value={payoutFilters.status}
                                        onChange={(e) => setPayoutFilters({ ...payoutFilters, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    >
                                        <option value="">All Status</option>
                                        <option value="completed">Completed</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Method</label>
                                    <select
                                        value={payoutFilters.method}
                                        onChange={(e) => setPayoutFilters({ ...payoutFilters, method: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    >
                                        <option value="">All Methods</option>
                                        <option value="upi">UPI</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">From Date</label>
                                    <input
                                        type="date"
                                        value={payoutFilters.dateFrom}
                                        onChange={(e) => setPayoutFilters({ ...payoutFilters, dateFrom: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">To Date</label>
                                    <input
                                        type="date"
                                        value={payoutFilters.dateTo}
                                        onChange={(e) => setPayoutFilters({ ...payoutFilters, dateTo: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Min Amount</label>
                                    <input
                                        type="number"
                                        value={payoutFilters.amountMin}
                                        onChange={(e) => setPayoutFilters({ ...payoutFilters, amountMin: e.target.value })}
                                        placeholder="₹0"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Max Amount</label>
                                    <input
                                        type="number"
                                        value={payoutFilters.amountMax}
                                        onChange={(e) => setPayoutFilters({ ...payoutFilters, amountMax: e.target.value })}
                                        placeholder="₹∞"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#AC9AFD]"
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={clearPayoutFilters}
                                        className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fetchPayoutHistory(1)}
                                        className="px-4 py-2 bg-[#AC9AFD] text-white rounded-lg text-sm font-medium hover:bg-[#9B89EC] transition-colors"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-3 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div>
                        </div>
                    ) : activeTab === 'wallets' ? (
                        /* Wallets Table */
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap">Surveyor</th>
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap">City</th>
                                        <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap min-w-[100px]">Balance</th>
                                        <th className="pb-3 pr-4 font-medium text-right whitespace-nowrap min-w-[100px]">Total Earned</th>
                                        <th className="pb-3 pr-6 font-medium text-right whitespace-nowrap min-w-[100px]">Withdrawn</th>
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap min-w-[120px]">Last Activity</th>
                                        <th className="pb-3 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {wallets.map((wallet) => (
                                        <tr key={wallet.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pr-4">
                                                <div>
                                                    <p className="font-medium text-slate-800">{wallet.surveyor?.name}</p>
                                                    <p className="text-xs text-slate-500">{wallet.surveyor?.phone}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 text-slate-600 text-sm">{wallet.surveyor?.city || '-'}</td>
                                            <td className="py-3 pr-4 text-right min-w-[100px]">
                                                <span className={`font-semibold ${wallet.balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {formatAmount(wallet.balance)}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-right text-green-600 text-sm min-w-[100px]">{formatAmount(wallet.total_earned)}</td>
                                            <td className="py-3 pr-4 text-right text-blue-600 text-sm min-w-[80px]">{formatAmount(wallet.total_withdrawn)}</td>
                                            <td className="py-3 pr-4 text-slate-500 text-sm min-w-[100px]">{formatDate(wallet.last_transaction_at)}</td>
                                            <td className="py-3">
                                                <button
                                                    onClick={() => router.push(`/payouts/${wallet.surveyor_id}`)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {wallets.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    No wallets found
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Payout History Table */
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap min-w-[100px]">Date</th>
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap min-w-[150px]">Surveyor</th>
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap min-w-[160px]">Survey</th>
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap text-right min-w-[100px]">Amount</th>
                                        <th className="pb-3 pr-4 font-medium whitespace-nowrap min-w-[100px]">Method</th>
                                        <th className="pb-3 font-medium whitespace-nowrap min-w-[90px]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payouts.map((payout) => (
                                        <tr key={payout.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pr-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(payout.created_at)}</td>
                                            <td className="py-3 pr-4">
                                                <div>
                                                    <p className="font-medium text-slate-800 text-sm">{payout.surveyor?.name}</p>
                                                    <p className="text-xs text-slate-500">{payout.surveyor?.phone}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 text-sm text-slate-600 font-mono">{payout.survey?.laid || '-'}</td>
                                            <td className="py-3 pr-4 text-right font-semibold text-green-600 whitespace-nowrap">{formatAmount(payout.amount)}</td>
                                            <td className="py-3 pr-4 text-sm text-slate-600 capitalize whitespace-nowrap">{payout.method?.replace('_', ' ') || 'Wallet'}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${payout.status === 'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : payout.status === 'pending'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {payout.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {payouts.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    No payout history found
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-500">
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => activeTab === 'wallets' ? fetchWallets(pagination.page - 1) : fetchPayoutHistory(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => activeTab === 'wallets' ? fetchWallets(pagination.page + 1) : fetchPayoutHistory(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
