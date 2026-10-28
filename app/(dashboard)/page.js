'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';

const getStatusColor = (status) => {
    switch (status) {
        case 'finished': return 'bg-emerald-100 text-emerald-700';
        case 'report_submitted': return 'bg-teal-100 text-teal-700';
        case 'visit_completed': return 'bg-cyan-100 text-cyan-700';
        case 'in_transit': return 'bg-blue-100 text-blue-700';
        case 'assigned': return 'bg-purple-100 text-purple-700';
        case 'location_detected': return 'bg-amber-100 text-amber-700';
        case 'pending': return 'bg-orange-100 text-orange-700';
        case 'cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-700';
    }
};

const formatStatus = (status) => {
    if (status === 'finished' || status === 'completed') return 'Completed';
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
};
const formatType = (type) => type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';

export default function DashboardPage() {
    const [stats, setStats] = useState({ totalSurveyors: 0, pendingVerifications: 0, totalAssigners: 0, totalSurveys: 0, activeSurveys: 0, completedSurveys: 0 });
    const [recentSurveyors, setRecentSurveyors] = useState([]);
    const [recentSurveys, setRecentSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            const surveyorsRes = await api.get('/admin/surveyors', { limit: 5 });
            await new Promise(resolve => setTimeout(resolve, 100));
            const pendingRes = await api.get('/admin/surveyors', { verification: 'pending', limit: 1 });
            await new Promise(resolve => setTimeout(resolve, 100));
            const assignersRes = await api.get('/admin/assigners', { limit: 1 });
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fetch surveys — KPIs use archived=all so archiving doesn't shrink all-time counts
            const surveysRes = await api.get('/admin/surveys', { limit: 10, archived: 'all' });
            await new Promise(resolve => setTimeout(resolve, 100));
            const activeSurveysRes = await api.get('/admin/surveys', { status: 'assigned', limit: 1, archived: 'all' });
            await new Promise(resolve => setTimeout(resolve, 100));
            const completedSurveysRes = await api.get('/admin/surveys', { status: 'finished', limit: 1, archived: 'all' });

            setStats({
                totalSurveyors: surveyorsRes.pagination?.total || 0,
                pendingVerifications: pendingRes.pagination?.total || 0,
                totalAssigners: assignersRes.pagination?.total || 0,
                totalSurveys: surveysRes.pagination?.total || 0,
                activeSurveys: activeSurveysRes.pagination?.total || 0,
                completedSurveys: completedSurveysRes.pagination?.total || 0,
            });
            setRecentSurveyors(surveyorsRes.data || []);
            setRecentSurveys(surveysRes.data || []);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError(err.message);
        }
        finally { setLoading(false); }
    };

    const statCards = [
        { title: 'Total Surveys', value: stats.totalSurveys, color: 'blue', icon: <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg> },
        { title: 'Active Surveys', value: stats.activeSurveys, color: 'purple', icon: <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> },
        { title: 'Completed Surveys', value: stats.completedSurveys, color: 'green', icon: <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> },
        { title: 'Total Surveyors', value: stats.totalSurveyors, color: 'purple', icon: <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg> },
        { title: 'Pending Verifications', value: stats.pendingVerifications, color: 'yellow', icon: <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> },
        { title: 'Total Assigners', value: stats.totalAssigners, color: 'green', icon: <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg> },
    ];

    if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-200 border-t-[#AC9AFD] rounded-full animate-spin"></div></div>;

    if (error) return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-red-500">{error}</p>
            <button onClick={() => { setError(null); setLoading(true); fetchDashboardData(); }} className="px-4 py-2 bg-[#AC9AFD] hover:bg-[#9B85FC] text-white text-sm font-medium rounded-lg">Retry</button>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {statCards.map((card, index) => <StatsCard key={index} {...card} />)}
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link href="/surveys" className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-[#AC9AFD] hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg></div>
                        <span className="text-sm font-medium text-slate-700">View All Surveys</span>
                    </Link>
                    <Link href="/surveyors?verification=pending" className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-[#AC9AFD] hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                        <span className="text-sm font-medium text-slate-700">Review Pending Verifications</span>
                    </Link>
                    <Link href="/assigners/new" className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-[#AC9AFD] hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg></div>
                        <span className="text-sm font-medium text-slate-700">Add New Assigner</span>
                    </Link>
                    <Link href="/pricing" className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-[#AC9AFD] hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-lg bg-[#AC9AFD]/10 text-[#AC9AFD] flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg></div>
                        <span className="text-sm font-medium text-slate-700">Manage Pricing</span>
                    </Link>
                </div>
            </div>

            {/* Recent Surveys */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-800">Recent Surveys</h2>
                    <Link href="/surveys" className="text-sm text-[#AC9AFD] hover:underline">View All →</Link>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {recentSurveys.length === 0 ? <p className="text-center py-8 text-slate-400">No surveys yet</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">LAID</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Case Ref</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigner</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Surveyor</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-200">
                                    {recentSurveys.map((survey) => (
                                        <tr key={survey.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800">{survey.laid || `#${survey.id}`}</span>
                                                    {survey.is_emergency && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">⚡</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatType(survey.survey_type)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{survey.case_reference || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{survey.assigner_name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{survey.surveyor_name || <span className="text-amber-600">Unassigned</span>}</td>
                                            <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(survey.status)}`}>{formatStatus(survey.status)}</span></td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{new Date(survey.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">
                                                <Link href={`/surveys/${survey.id}`} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">View</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Surveyors */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-800">Recent Surveyors</h2>
                    <Link href="/surveyors" className="text-sm text-[#AC9AFD] hover:underline">View All →</Link>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {recentSurveyors.length === 0 ? <p className="text-center py-8 text-slate-400">No surveyors yet</p> : (
                        <table className="w-full">
                            <thead><tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Verification</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {recentSurveyors.map((surveyor) => (
                                    <tr key={surveyor.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-[#AC9AFD] flex items-center justify-center font-semibold text-sm text-white">{surveyor.full_name?.charAt(0) || 'S'}</div><div><p className="font-medium text-slate-800">{surveyor.full_name}</p><p className="text-xs text-slate-500">{surveyor.email}</p></div></div></td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{surveyor.phone}</td>
                                        <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${surveyor.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{surveyor.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${surveyor.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : surveyor.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' : surveyor.verification_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-[#AC9AFD]/10 text-[#AC9AFD]'}`}>{surveyor.verification_status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
