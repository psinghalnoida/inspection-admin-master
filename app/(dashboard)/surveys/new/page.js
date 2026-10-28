'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const SURVEY_TYPES = [
    { value: 'motor_spot', label: 'Motor Spot Survey', icon: 'car' },
    { value: 'motor_final', label: 'Motor Final Survey', icon: 'car' },
    { value: 'marine_final', label: 'Marine Spot Survey', icon: 'ship' },
    { value: 'investigation', label: 'Investigation', icon: 'search' },
];

// SVG Icons
const Icons = {
    clipboard: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    building: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    user: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    location: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    document: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    shield: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    car: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
    ship: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
    search: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    pencil: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    clock: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    userGroup: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    info: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>,
    upload: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    trash: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    file: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    wrench: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    receipt: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    plus: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    minus: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>,
};

const LOCATION_METHODS = [
    { value: 'manual_coordinates', label: 'Coordinates' },
    { value: 'pincode_entry', label: 'Manual Entry' },
    { value: 'sms_link', label: 'SMS Link' },
];

const VEHICLE_CATEGORIES = [
    { value: 'private', label: 'Private' },
    { value: 'commercial', label: 'Commercial' },
];

const VEHICLE_TYPES = [
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'motor_car', label: 'Motor Car' },
    { value: 'tractor', label: 'Tractor' },
    { value: 'bus', label: 'Bus' },
    { value: 'goods_carrier', label: 'Goods Carrier' },
    { value: 'construction_equipment', label: 'Construction Equipment' },
    { value: 'others', label: 'Others' },
];

const LOSS_ITEM_TYPES = [
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'cattle', label: 'Cattle' },
    { value: 'human', label: 'Human' },
    { value: 'others', label: 'Others' },
];

// Section component defined OUTSIDE to prevent remounting on every render
const Section = ({ title, icon, children }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-[#AC9AFD]">{Icons[icon]}</span> {title}
        </h3>
        {children}
    </div>
);

export default function CreateSurveyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [assigners, setAssigners] = useState([]);
    const [surveyors, setSurveyors] = useState([]);
    const [loadingAssigners, setLoadingAssigners] = useState(true);
    const [fieldErrors, setFieldErrors] = useState({});

    // Form state
    const [surveyType, setSurveyType] = useState('motor_spot');
    const [selectedAssigner, setSelectedAssigner] = useState('');
    const [selectedSurveyor, setSelectedSurveyor] = useState('');
    const [locationMethod, setLocationMethod] = useState('pincode_entry');
    const [vehicleCategory, setVehicleCategory] = useState('private');
    const [isEmergency, setIsEmergency] = useState(false);
    const [investigationSubType, setInvestigationSubType] = useState('inspection'); // 'inspection' or 'investigation'

    const [formData, setFormData] = useState({
        contact_person_name: '',
        contact_person_mobile: '',
        alternate_whatsapp_number: '',
        latitude: '',
        longitude: '',
        pincode: '',
        city: '',
        state: '',
        address: '',
        google_maps_link: '',
        case_reference: '',
        insurer_name: '',
        name_of_insured: '',
        policy_number: '',
        cause_of_loss: '',
        instructions: '',
        // Motor specific
        vehicle_type: '',
        vehicle_number: '',
        workshop_name: '',
        workshop_advisor_name: '',
        workshop_advisor_contact: '',
        // Marine specific
        name_of_consignee: '',
        name_of_consignor: '',
        commodity: '',
        // Investigation specific
        loss_item_type: '',
        investigation_vehicle_number: '',
        cattle_tag_number: '',
        cattle_name: '',
        human_name: '',
        human_contact_number: '',
        human_relation: '',
        other_loss_item_name: '',
        items_to_inspect: '',
    });

    // Document upload state
    const [uploadedDocs, setUploadedDocs] = useState([]);

    // Marine: Invoice and GR state
    const [invoices, setInvoices] = useState([{ invoice_number: '', invoice_date: '', invoice_amount: '' }]);
    const [grItems, setGrItems] = useState([{ gr_number: '', gr_date: '' }]);

    const addInvoice = () => {
        setInvoices([...invoices, { invoice_number: '', invoice_date: '', invoice_amount: '' }]);
    };
    const updateInvoice = (index, field, value) => {
        const updated = [...invoices];
        updated[index][field] = value;
        setInvoices(updated);
    };
    const removeInvoice = (index) => {
        if (invoices.length > 1) {
            setInvoices(invoices.filter((_, i) => i !== index));
        }
    };

    const addGR = () => {
        setGrItems([...grItems, { gr_number: '', gr_date: '' }]);
    };
    const updateGR = (index, field, value) => {
        const updated = [...grItems];
        updated[index][field] = value;
        setGrItems(updated);
    };
    const removeGR = (index) => {
        if (grItems.length > 1) {
            setGrItems(grItems.filter((_, i) => i !== index));
        }
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const newDocs = files.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
        }));
        setUploadedDocs(prev => [...prev, ...newDocs]);
    };

    const removeDoc = (index) => {
        setUploadedDocs(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        fetchAssigners();
        fetchSurveyors();
    }, []);

    const fetchAssigners = async () => {
        try {
            const response = await api.get('/admin/assigners', { limit: 100, status: 'active' });
            setAssigners(response.data || []);
        } catch (error) {
            console.error('Failed to fetch assigners:', error);
        } finally {
            setLoadingAssigners(false);
        }
    };

    const fetchSurveyors = async () => {
        try {
            const response = await api.get('/admin/surveyors/available');
            setSurveyors(response.data || []);
        } catch (error) {
            console.error('Failed to fetch surveyors:', error);
        }
    };

    const updateForm = (key, value) => {
        let finalValue = value;
        // Auto-uppercase vehicle number
        if (key === 'vehicle_number' || key === 'investigation_vehicle_number') {
            finalValue = value.toUpperCase();
        }
        setFormData(prev => ({ ...prev, [key]: finalValue }));
        validateField(key, finalValue);
    };

    const validateField = (key, value) => {
        let errorMsg = '';
        switch (key) {
            case 'contact_person_name':
                if (!value?.trim()) errorMsg = 'Contact person name is required';
                break;
            case 'contact_person_mobile':
                if (!value) errorMsg = 'Mobile number is required';
                else if (!/^\d+$/.test(value)) errorMsg = 'Only digits allowed';
                else if (value.length !== 10) errorMsg = 'Must be 10 digits';
                break;
            case 'case_reference':
                if (!value?.trim()) errorMsg = 'Claim number is required';
                break;
            case 'vehicle_number':
                if (surveyType.includes('motor') && !value?.trim()) errorMsg = 'Vehicle number is required';
                else if (value && !/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/i.test(value)) errorMsg = 'Invalid format (e.g., MH01AB1234)';
                break;
            case 'commodity':
                if (surveyType.includes('marine') && !value?.trim()) errorMsg = 'Commodity is required';
                break;
            case 'pincode':
                if (locationMethod === 'pincode_entry' && value && !/^\d{6}$/.test(value)) errorMsg = 'Must be 6 digits';
                break;
        }
        setFieldErrors(prev => ({ ...prev, [key]: errorMsg }));
        return errorMsg;
    };

    const handleBlur = (key, value) => validateField(key, value);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!selectedAssigner) {
            alert('Please select an assigner');
            return;
        }
        if (!formData.contact_person_name || !formData.contact_person_mobile) {
            alert('Please fill in contact information');
            return;
        }
        if (!formData.case_reference) {
            alert('Please enter case reference/claim number');
            return;
        }

        // Motor-specific validation
        if (surveyType.includes('motor')) {
            if (!formData.vehicle_type || !formData.vehicle_number) {
                alert('Please fill in vehicle information');
                return;
            }
        }

        // Marine-specific validation
        if (surveyType.includes('marine')) {
            if (!formData.name_of_consignee || !formData.name_of_consignor || !formData.commodity) {
                alert('Please fill in consignee, consignor, and commodity');
                return;
            }
        }

        setLoading(true);
        try {
            const payload = {
                survey_type: surveyType,
                assigner_id: selectedAssigner,
                surveyor_id: selectedSurveyor || null,
                location_method: locationMethod,
                vehicle_category: vehicleCategory,
                is_emergency: isEmergency,
                ...formData,
            };

            const response = await api.post('/admin/surveys', payload);

            if (response.success) {
                alert(`Survey created successfully! LAID: ${response.data.laid}`);
                router.push('/surveys');
            }
        } catch (error) {
            console.error('Failed to create survey:', error);
            alert(error.message || 'Failed to create survey');
        } finally {
            setLoading(false);
        }
    };

    const renderInput = useCallback((label, key, type = 'text', required = false, placeholder = '') => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                value={formData[key] || ''}
                onChange={(e) => updateForm(key, e.target.value)}
                onBlur={() => handleBlur(key, formData[key])}
                placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                className={`w-full px-4 py-2.5 border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${fieldErrors[key] ? 'bg-red-50 border-red-300 focus:border-red-400 focus:ring-red-200' : 'bg-slate-50 border-slate-200 focus:border-[#AC9AFD] focus:ring-[#AC9AFD]'}`}
            />
            {fieldErrors[key] && <p className="text-xs text-red-500 mt-1">{fieldErrors[key]}</p>}
        </div>
    ), [formData, updateForm, fieldErrors, handleBlur]);

    const renderTextarea = useCallback((label, key, placeholder = '') => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <textarea
                value={formData[key] || ''}
                onChange={(e) => updateForm(key, e.target.value)}
                rows={3}
                placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#AC9AFD] focus:ring-1 focus:ring-[#AC9AFD] resize-none"
            />
        </div>
    ), [formData, updateForm]);

    const renderSelect = (label, value, onChange, options, required = false) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#AC9AFD] focus:ring-1 focus:ring-[#AC9AFD]"
            >
                <option value="">Select {label.toLowerCase()}</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Create Survey</h1>
                    <p className="text-sm text-slate-500 mt-1">Create a new survey and optionally assign a surveyor</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Survey Type Selection */}
                <Section title="Survey Type" icon="clipboard">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {SURVEY_TYPES.map(type => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setSurveyType(type.value)}
                                className={`p-4 rounded-xl border-2 transition-all ${surveyType === type.value
                                    ? 'border-[#AC9AFD] bg-[#AC9AFD]/10'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className={`mb-2 ${surveyType === type.value ? 'text-[#AC9AFD]' : 'text-slate-400'}`}>
                                    {Icons[type.icon]}
                                </div>
                                <div className={`text-sm font-medium ${surveyType === type.value ? 'text-[#AC9AFD]' : 'text-slate-600'}`}>
                                    {type.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Assigner Selection */}
                <Section title="Assigner (On Behalf Of)" icon="building">
                    <select
                        value={selectedAssigner}
                        onChange={(e) => setSelectedAssigner(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                        required
                    >
                        <option value="">Select an assigner *</option>
                        {assigners.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.company_name || a.contact_person_name} ({a.email})
                            </option>
                        ))}
                    </select>
                </Section>

                {/* Investigation Sub-Type Toggle - Appears at top for Investigation */}
                {surveyType === 'investigation' && (
                    <Section title="Survey Sub-Type" icon="search">
                        <div className="flex gap-4">
                            <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${investigationSubType === 'inspection' ? 'border-[#AC9AFD] bg-[#AC9AFD]/10' : 'border-slate-200'}`}>
                                <input
                                    type="radio"
                                    name="investigation_sub_type"
                                    checked={investigationSubType === 'inspection'}
                                    onChange={() => setInvestigationSubType('inspection')}
                                    className="sr-only"
                                />
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${investigationSubType === 'inspection' ? 'border-[#AC9AFD]' : 'border-slate-300'}`}>
                                        {investigationSubType === 'inspection' && <div className="w-2.5 h-2.5 rounded-full bg-[#AC9AFD]" />}
                                    </div>
                                    <div className="font-medium text-slate-800">Inspection</div>
                                </div>
                            </label>
                            <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${investigationSubType === 'investigation' ? 'border-[#AC9AFD] bg-[#AC9AFD]/10' : 'border-slate-200'}`}>
                                <input
                                    type="radio"
                                    name="investigation_sub_type"
                                    checked={investigationSubType === 'investigation'}
                                    onChange={() => setInvestigationSubType('investigation')}
                                    className="sr-only"
                                />
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${investigationSubType === 'investigation' ? 'border-[#AC9AFD]' : 'border-slate-300'}`}>
                                        {investigationSubType === 'investigation' && <div className="w-2.5 h-2.5 rounded-full bg-[#AC9AFD]" />}
                                    </div>
                                    <div className="font-medium text-slate-800">Investigation</div>
                                </div>
                            </label>
                        </div>
                    </Section>
                )}

                {/* Contact Information */}
                <Section title="Contact Information" icon="user">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('Contact Person Name', 'contact_person_name', 'text', true)}
                        {renderInput('Contact Person Mobile', 'contact_person_mobile', 'tel', true, '10-digit mobile number')}
                    </div>
                    <div className="mt-2">
                        {renderInput('Alternate WhatsApp Number (Optional)', 'alternate_whatsapp_number', 'tel', false, '10-digit WhatsApp number')}
                    </div>
                    {/* Motor Final has Name of Insurer in Contact section */}
                    {surveyType === 'motor_final' && (
                        <div className="mt-2">
                            {renderInput('Name of Insurer', 'name_of_insured', 'text', false, 'Name of insured')}
                        </div>
                    )}
                </Section>

                {/* Location */}
                <Section title="Location of Survey" icon="location">
                    <div className="flex gap-2 mb-4">
                        {LOCATION_METHODS.map(method => (
                            <button
                                key={method.value}
                                type="button"
                                onClick={() => setLocationMethod(method.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${locationMethod === method.value
                                    ? 'bg-[#AC9AFD] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {method.label}
                            </button>
                        ))}
                    </div>

                    {locationMethod === 'manual_coordinates' && (
                        <div className="grid grid-cols-2 gap-4">
                            {renderInput('Latitude', 'latitude', 'text', false, 'e.g., 28.6139')}
                            {renderInput('Longitude', 'longitude', 'text', false, 'e.g., 77.2090')}
                        </div>
                    )}

                    {locationMethod === 'pincode_entry' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {renderInput('Pincode', 'pincode')}
                                {renderInput('City', 'city')}
                                {renderInput('State', 'state')}
                            </div>
                            {renderInput('Full Address', 'address')}
                        </>
                    )}

                    {locationMethod === 'sms_link' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex items-center gap-2">
                            <span className="text-blue-500">{Icons.info}</span>
                            An SMS will be sent to the contact person to share their location.
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        {renderInput('Google Maps Link (Optional)', 'google_maps_link', 'url', false, 'https://maps.google.com/...')}
                        <p className="text-xs text-slate-400 -mt-2">Paste a maps link the surveyor can open for navigation.</p>
                    </div>
                </Section>

                {/* Workshop Details - Motor Final only, separate section */}
                {surveyType === 'motor_final' && (
                    <Section title="Workshop Details" icon="wrench">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {renderInput('Name of Workshop', 'workshop_name')}
                            {renderInput('Workshop Advisor Name', 'workshop_advisor_name')}
                            {renderInput('Workshop Contact Number', 'workshop_advisor_contact', 'tel')}
                        </div>
                    </Section>
                )}

                {/* Case Reference */}
                <Section title="Case Reference Details" icon="document">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('Claim Number / Case Reference', 'case_reference', 'text', true)}
                        {surveyType === 'motor_spot' && renderInput('Cause of Loss', 'cause_of_loss', 'text', false, 'e.g., Accident, Theft, Fire')}
                    </div>
                </Section>

                {/* Insurance Details */}
                <Section title="Insurance Details" icon="shield">
                    <div className={`grid grid-cols-1 ${surveyType === 'motor_final' ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
                        {surveyType === 'motor_spot' && renderInput('Name of Insurer', 'insurer_name')}
                        {surveyType !== 'motor_final' && renderInput('Name of Insured', 'name_of_insured')}
                        {renderInput('Policy Number', 'policy_number')}
                    </div>
                </Section>

                {/* Document Upload */}
                <Section title="Document Upload" icon="upload">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-[#AC9AFD] transition-colors">
                        <input
                            type="file"
                            id="doc-upload"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <label htmlFor="doc-upload" className="cursor-pointer">
                            <div className="text-slate-400 mb-2">{Icons.upload}</div>
                            <p className="text-sm text-slate-600 font-medium">Click to upload documents</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 10MB each)</p>
                        </label>
                    </div>
                    {uploadedDocs.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {uploadedDocs.map((doc, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-400">{Icons.file}</span>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{doc.name}</p>
                                            <p className="text-xs text-slate-400">{(doc.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeDoc(index)}
                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                        {Icons.trash}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* Motor-specific fields */}
                {surveyType.includes('motor') && (
                    <Section title="Vehicle Information" icon="car">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                            <div className="flex gap-4">
                                {VEHICLE_CATEGORIES.map(cat => (
                                    <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="vehicle_category"
                                            checked={vehicleCategory === cat.value}
                                            onChange={() => setVehicleCategory(cat.value)}
                                            className="w-4 h-4 text-[#AC9AFD] focus:ring-[#AC9AFD]"
                                        />
                                        <span className="text-sm text-slate-700">{cat.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderSelect('Vehicle Type', formData.vehicle_type, (v) => updateForm('vehicle_type', v), VEHICLE_TYPES, true)}
                            {renderInput('Vehicle Number', 'vehicle_number', 'text', true, 'e.g., MH01AB1234')}
                        </div>
                    </Section>
                )}

                {/* Marine-specific fields */}
                {surveyType.includes('marine') && (
                    <>
                        <Section title="Consignee & Consignor Details" icon="ship">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderInput('Name of Consignee', 'name_of_consignee', 'text', true)}
                                {renderInput('Name of Consignor', 'name_of_consignor', 'text', true)}
                            </div>
                            {renderInput('Commodity', 'commodity', 'text', true, 'Describe the goods being transported')}
                        </Section>

                        {/* Invoice Details */}
                        <Section title="Invoice Details" icon="receipt">
                            {invoices.map((invoice, index) => (
                                <div key={index} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-medium text-slate-700">Invoice {index + 1}</span>
                                        {invoices.length > 1 && (
                                            <button type="button" onClick={() => removeInvoice(index)} className="text-red-400 hover:text-red-600">
                                                {Icons.trash}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Invoice Number</label>
                                            <input
                                                type="text"
                                                value={invoice.invoice_number}
                                                onChange={(e) => updateInvoice(index, 'invoice_number', e.target.value)}
                                                placeholder="INV-2025/001"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#AC9AFD]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Invoice Date</label>
                                            <input
                                                type="date"
                                                value={invoice.invoice_date}
                                                onChange={(e) => updateInvoice(index, 'invoice_date', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#AC9AFD]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Amount</label>
                                            <input
                                                type="number"
                                                value={invoice.invoice_amount}
                                                onChange={(e) => updateInvoice(index, 'invoice_amount', e.target.value)}
                                                placeholder="Amount"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#AC9AFD]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addInvoice} className="flex items-center gap-2 text-[#AC9AFD] hover:text-[#9B85FC] text-sm font-medium">
                                {Icons.plus} Add More Invoice
                            </button>
                        </Section>

                        {/* GR (Goods Receipt) Details */}
                        <Section title="GR (Good Receipt) Details" icon="receipt">
                            {grItems.map((gr, index) => (
                                <div key={index} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-medium text-slate-700">GR {index + 1}</span>
                                        {grItems.length > 1 && (
                                            <button type="button" onClick={() => removeGR(index)} className="text-red-400 hover:text-red-600">
                                                {Icons.trash}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">GR Number</label>
                                            <input
                                                type="text"
                                                value={gr.gr_number}
                                                onChange={(e) => updateGR(index, 'gr_number', e.target.value)}
                                                placeholder="GR-4582/24"
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#AC9AFD]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">GR Date</label>
                                            <input
                                                type="date"
                                                value={gr.gr_date}
                                                onChange={(e) => updateGR(index, 'gr_date', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#AC9AFD]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addGR} className="flex items-center gap-2 text-[#AC9AFD] hover:text-[#9B85FC] text-sm font-medium">
                                {Icons.plus} Add More GR
                            </button>
                        </Section>
                    </>
                )}

                {/* Investigation-specific fields */}
                {surveyType === 'investigation' && (
                    <>
                        {/* Items to be Inspect - Only for Inspection */}
                        {investigationSubType === 'inspection' && (
                            <Section title="Items to be Inspect" icon="document">
                                {renderTextarea('Items to Inspect', 'items_to_inspect', 'List of details of the item(s) to be inspected...')}
                            </Section>
                        )}

                        {/* Investigation Details - Only for Investigation */}
                        {investigationSubType === 'investigation' && (
                            <Section title="Investigation Details" icon="search">
                                {renderSelect('Loss Item Type', formData.loss_item_type, (v) => updateForm('loss_item_type', v), LOSS_ITEM_TYPES, true)}

                                {formData.loss_item_type === 'vehicle' && renderInput('Vehicle Number', 'investigation_vehicle_number')}

                                {formData.loss_item_type === 'cattle' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput('Cattle Tag Number', 'cattle_tag_number')}
                                        {renderInput('Cattle Name', 'cattle_name')}
                                    </div>
                                )}

                                {formData.loss_item_type === 'human' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {renderInput('Person Name', 'human_name')}
                                        {renderInput('Contact Number', 'human_contact_number', 'tel')}
                                        {renderInput('Relation to Insured', 'human_relation', 'text', false, 'e.g., Self, Spouse, Son')}
                                    </div>
                                )}

                                {formData.loss_item_type === 'others' && renderInput('Loss Item Name', 'other_loss_item_name')}
                            </Section>
                        )}
                    </>
                )}

                {/* Instructions */}
                <Section title="Instructions / Notes" icon="pencil">
                    {renderTextarea('Instructions for Surveyor', 'instructions', 'Enter any additional details for the surveyor...')}
                </Section>

                {/* Survey Timing */}
                <Section title="Survey Timing" icon="clock">
                    <div className="flex gap-4">
                        <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${!isEmergency ? 'border-[#AC9AFD] bg-[#AC9AFD]/10' : 'border-slate-200'}`}>
                            <input
                                type="radio"
                                name="is_emergency"
                                checked={!isEmergency}
                                onChange={() => setIsEmergency(false)}
                                className="sr-only"
                            />
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!isEmergency ? 'border-[#AC9AFD]' : 'border-slate-300'}`}>
                                    {!isEmergency && <div className="w-2.5 h-2.5 rounded-full bg-[#AC9AFD]" />}
                                </div>
                                <div>
                                    <div className="font-medium text-slate-800">Regular Survey</div>
                                    <div className="text-xs text-slate-500">7 AM - 5 PM</div>
                                </div>
                            </div>
                        </label>
                        <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${isEmergency ? 'border-[#AC9AFD] bg-[#AC9AFD]/10' : 'border-slate-200'}`}>
                            <input
                                type="radio"
                                name="is_emergency"
                                checked={isEmergency}
                                onChange={() => setIsEmergency(true)}
                                className="sr-only"
                            />
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isEmergency ? 'border-[#AC9AFD]' : 'border-slate-300'}`}>
                                    {isEmergency && <div className="w-2.5 h-2.5 rounded-full bg-[#AC9AFD]" />}
                                </div>
                                <div>
                                    <div className="font-medium text-slate-800">Emergency Survey</div>
                                    <div className="text-xs text-slate-500">After 5 PM</div>
                                </div>
                            </div>
                        </label>
                    </div>
                </Section>

                {/* Assign Surveyor (Optional) */}
                <Section title="Assign Surveyor (Optional)" icon="userGroup">
                    <select
                        value={selectedSurveyor}
                        onChange={(e) => setSelectedSurveyor(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#AC9AFD]"
                    >
                        <option value="">Leave unassigned (broadcast to all)</option>
                        {surveyors.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.full_name} - {s.city}, {s.state} ({s.phone})
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                        If left unassigned, the survey will be broadcast to all available surveyors in the area.
                    </p>
                </Section>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-[#AC9AFD] hover:bg-[#9B85FC] disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Survey'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
