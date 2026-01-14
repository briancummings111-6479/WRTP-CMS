import React, { useState, useEffect } from 'react';
import api from '../../lib/firebase';
import { ISP, Client } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Card from '../Card';
import { Printer, Plus, Trash2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import AttachmentsSection from '../Attachments/AttachmentsSection';

interface ISPSectionProps {
    client: Client;
    isp: ISP | null;
    onIspUpdate: (updatedIsp: ISP) => Promise<void>;
}

const barrierOptions = [
    "Housing instability", "Food insecurity", "Limited work experience",
    "Parenting/Childcare", "Disability", "Mental Health/Well-being",
    "Substance Use", "Transportation", "Criminal Background/Court", "Other"
];

const defaultISPForm: Omit<ISP, 'id' | 'clientId'> = {
    ispDate: Date.now(),
    jobDeveloper: '',
    acknowledgmentInitialed: false,
    shortTermGoals: '',
    longTermGoals: '',
    identifiedBarriers: [],
    careerPlanning: {
        workshopsAssigned: '',
        enrolledInCteOrCollege: false,
    },
    planOfAction: [],
    supportServices: [],
};

const ISPSection: React.FC<ISPSectionProps> = ({ client, isp, onIspUpdate }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<Partial<ISP>>(defaultISPForm);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { id: clientId, profile, metadata } = client;

    useEffect(() => {
        setFormData(isp || defaultISPForm);
    }, [isp]);

    // Auto-OCR Handler
    const handleFileUploaded = async (file: File) => {
        if (file.name.startsWith("2.1")) {
            setIsProcessing(true);
            setError(null);
            setSuccess(null);
            try {
                const extractedData = await api.extractFormData(file, 'ISP');

                // 1. Update Local State
                setFormData(prev => {
                    const newData = {
                        ...prev,
                        ...extractedData,
                        careerPlanning: { ...prev.careerPlanning, ...(extractedData.careerPlanning || {}) }
                    };

                    // 2. Auto-Save to Backend
                    const ispId = isp?.id || crypto.randomUUID();

                    const ispDataToSave = {
                        ...defaultISPForm,
                        ...isp,
                        ...newData,
                        clientId: clientId,
                        id: ispId,
                        ispDate: newData.ispDate || Date.now()
                    } as ISP;

                    api.upsertISP(ispDataToSave).then(() => {
                        onIspUpdate(ispDataToSave);
                        setSuccess(`ISP auto-filled and saved from ${file.name}`);
                    }).catch(err => {
                        console.error("Auto-save failed:", err);
                        setError("Auto-fill worked but save failed: " + err.message);
                    });

                    return newData;
                });

            } catch (err: any) {
                console.error("Failed to auto-fill ISP:", err);
                setError("Failed to auto-fill: " + err.message);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [parent, child] = name.split('.');
        setFormData(prev => ({ ...prev, [parent]: { ...(prev as any)[parent], [child]: value } }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleNestedCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        const [parent, child] = name.split('.');
        setFormData(prev => ({ ...prev, [parent]: { ...(prev as any)[parent], [child]: checked } }));
    };

    const handleBarrierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const currentBarriers = formData.identifiedBarriers || [];
        const newBarriers = checked ? [...currentBarriers, value] : currentBarriers.filter(b => b !== value);
        setFormData(prev => ({ ...prev, identifiedBarriers: newBarriers }));
    };

    const handleDynamicListChange = (listName: 'planOfAction' | 'supportServices', index: number, field: string, value: string) => {
        setFormData(prev => {
            const list = (prev[listName] as any[] || []).slice();
            list[index] = { ...list[index], [field]: value };
            return { ...prev, [listName]: list };
        });
    };

    const addDynamicListItem = (listName: 'planOfAction' | 'supportServices') => {
        const newItem = listName === 'planOfAction'
            ? { id: crypto.randomUUID(), goal: '', action: '', responsibleParty: '', targetDate: '', reviewDate: '', completionDate: '' }
            : { id: crypto.randomUUID(), agency: '', referralDate: '', outcome: '' };
        setFormData(prev => ({ ...prev, [listName]: [...(prev[listName] as any[] || []), newItem] }));
    };

    const removeDynamicListItem = (listName: 'planOfAction' | 'supportServices', index: number) => {
        setFormData(prev => ({ ...prev, [listName]: (prev[listName] as any[] || []).filter((_, i) => i !== index) }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        // Ensure ID is present for new ISPs
        const dataToSave = {
            ...formData,
            clientId,
            ispDate: formData.ispDate || Date.now(),
            id: isp?.id || crypto.randomUUID()
        } as ISP;

        try {
            await onIspUpdate(dataToSave);
            setSuccess("ISP saved successfully.");
        } catch (error: any) {
            console.error("Failed to save ISP:", error);
            setError(`Error saving ISP: ${error.message || error}`);
        } finally {
            setIsSaving(false);
        }
    };

    const generateISPPrintHTML = () => {
        if (!isp) return '';
        // Use formData if available for printing current state, or fallback to isp? 
        // Usually printing happens on saved data, but let's use formData so what they see is what they print if they haven't saved yet? 
        // Actually, usually print is for record, so maybe saved data. 
        // But the previous implementation used `isp` prop.
        // Let's use `formData` cast to ISP so it reflects current edits which is often desired.
        const dataToPrint = formData as ISP;
        if (!dataToPrint) return '';

        const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();
        const fieldStyle = "border-b border-gray-600 flex-grow min-w-0";
        const rowStyle = "flex items-end space-x-2 mb-2";
        const labelStyle = "font-semibold whitespace-nowrap";

        const barriersHTML = barrierOptions.map(b => `
            <div class="flex items-center">
                <div class="w-4 h-4 border border-gray-600 mr-2 flex-shrink-0">${(dataToPrint.identifiedBarriers || []).includes(b) ? '<span class="text-sm">✓</span>' : ''}</div>
                <span>${b}</span>
            </div>
        `).join('');

        const planOfActionHTML = (dataToPrint.planOfAction || []).map(item => `
            <tr class="border-b">
                <td class="p-1 border-r">${item.goal || '&nbsp;'}</td>
                <td class="p-1 border-r">${item.action || '&nbsp;'}</td>
                <td class="p-1 border-r">${item.responsibleParty || '&nbsp;'}</td>
                <td class="p-1 border-r">${item.targetDate || '&nbsp;'}</td>
                <td class="p-1 border-r">${item.reviewDate || '&nbsp;'}</td>
                <td class="p-1">${item.completionDate || '&nbsp;'}</td>
            </tr>
        `).join('') + Array(Math.max(0, 5 - (dataToPrint.planOfAction || []).length)).fill(0).map(() => `<tr class="border-b"><td class="p-1 border-r h-8">&nbsp;</td><td class="p-1 border-r">&nbsp;</td><td class="p-1 border-r">&nbsp;</td><td class="p-1 border-r">&nbsp;</td><td class="p-1 border-r">&nbsp;</td><td class="p-1">&nbsp;</td></tr>`).join('');

        const supportServicesHTML = (dataToPrint.supportServices || []).map(item => `
             <tr class="border-b">
                <td class="p-1 border-r">${item.agency || '&nbsp;'}</td>
                <td class="p-1 border-r">${item.referralDate || '&nbsp;'}</td>
                <td class="p-1">${item.outcome || '&nbsp;'}</td>
            </tr>
        `).join('') + Array(Math.max(0, 3 - (dataToPrint.supportServices || []).length)).fill(0).map(() => `<tr class="border-b"><td class="p-1 border-r h-8">&nbsp;</td><td class="p-1 border-r">&nbsp;</td><td class="p-1">&nbsp;</td></tr>`).join('');

        return `
            <html>
            <head>
                <title>WRTP Individual Service Plan</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style> body { font-family: sans-serif; } .content-avoid-break { page-break-inside: avoid; } </style>
            </head>
            <body class="p-8 text-sm">
                <header class="text-center mb-6">
                    <h1 class="text-xl font-bold">WORKFORCE RECOVERY TRAINING PROGRAM</h1>
                    <p>2960 Hartnell Ave., Redding, CA 96002 | Office: 530-245-8123</p>
                    <h2 class="text-lg font-bold mt-4">WRTP Individual Service Plan (ISP)</h2>
                </header>
                <main class="space-y-4">
                    <div class="${rowStyle}"><span class="${labelStyle}">Participant Name:</span><div class="${fieldStyle}">${profile.firstName} ${profile.lastName}</div></div>
                    <div class="grid grid-cols-2 gap-x-8">
                        <div class="${rowStyle}"><span class="${labelStyle}">DOB:</span><div class="${fieldStyle}">${profile.dob}</div></div>
                        <div class="${rowStyle}"><span class="${labelStyle}">Date:</span><div class="${fieldStyle}">${formatDate(dataToPrint.ispDate)}</div></div>
                    </div>
                    <div class="${rowStyle}"><span class="${labelStyle}">Case Manager:</span><div class="${fieldStyle}">${metadata.assignedAdminName}</div></div>
                    <div class="${rowStyle}"><span class="${labelStyle}">Job Developer:</span><div class="${fieldStyle}">${dataToPrint.jobDeveloper || ''}</div></div>

                    <div class="content-avoid-break mt-6">
                        <h3 class="font-bold">Acknowledgment</h3>
                        <p class="text-xs mt-1">By initialing, I acknowledge and agree to participate and engage in the WRTP program. As a participant, I agree to regularly meet with WRTP staff to support my individual participant outcomes in order for successful completion of the program.</p>
                        <p class="mt-2">Acknowledgment: ${dataToPrint.acknowledgmentInitialed ? '<strong>Initialed & Agreed</strong>' : 'Not Acknowledged'}</p>
                    </div>

                    <div class="content-avoid-break mt-4">
                        <h3 class="font-bold">How can WRTP be of service to you? (1–3 month goals)</h3>
                        <div class="border-b border-gray-600 mt-1 pl-2 whitespace-pre-wrap">${dataToPrint.shortTermGoals || ''}</div>
                        <div class="border-b border-gray-600 mt-2"></div>
                        <div class="border-b border-gray-600 mt-2"></div>
                    </div>
                    
                    <div class="content-avoid-break mt-4">
                        <h3 class="font-bold">Long-Term Goals (6−12+ months)</h3>
                        <div class="border-b border-gray-600 mt-1 pl-2 whitespace-pre-wrap">${dataToPrint.longTermGoals || ''}</div>
                        <div class="border-b border-gray-600 mt-2"></div>
                        <div class="border-b border-gray-600 mt-2"></div>
                    </div>
                    
                    <div class="content-avoid-break mt-4">
                        <h3 class="font-bold">Identified Barriers/Needs (check all that apply)</h3>
                        <div class="grid grid-cols-3 gap-2 mt-2">${barriersHTML}</div>
                    </div>

                    <div class="content-avoid-break mt-4">
                        <h3 class="font-bold">Career Planning</h3>
                        <div class="${rowStyle} mt-1"><span class="${labelStyle}">Workshop(s) Assigned:</span><div class="${fieldStyle}">${dataToPrint.careerPlanning?.workshopsAssigned || ''}</div></div>
                        <div class="flex items-center space-x-4">
                            <span>Enrolled in CTE/Training Program/College:</span>
                            <div class="flex items-center"><div class="w-4 h-4 border border-gray-600 mr-1">${dataToPrint.careerPlanning?.enrolledInCteOrCollege ? '✓' : ''}</div> YES</div>
                            <div class="flex items-center"><div class="w-4 h-4 border border-gray-600 mr-1">${!dataToPrint.careerPlanning?.enrolledInCteOrCollege ? '✓' : ''}</div> NO</div>
                        </div>
                    </div>
                
                    <div class="mt-8 pt-8" style="page-break-before: always;">
                        <h3 class="font-bold">Plan of Action - Who will do what and when?</h3>
                        <table class="w-full border-collapse border border-gray-600 mt-2 text-xs">
                            <thead><tr class="bg-gray-200"><th class="p-1 border-r">Participant goals?</th><th class="p-1 border-r">Actions to be completed:</th><th class="p-1 border-r">Who will complete the action?</th><th class="p-1 border-r">Target Date:</th><th class="p-1 border-r">Review Date:</th><th class="p-1">Completion Date</th></tr></thead>
                            <tbody>${planOfActionHTML}</tbody>
                        </table>
                    </div>
                    
                    <div class="content-avoid-break mt-6">
                        <h3 class="font-bold">Support Services</h3>
                        <table class="w-full border-collapse border border-gray-600 mt-2 text-xs">
                            <thead><tr class="bg-gray-200"><th class="p-1 border-r">Agency</th><th class="p-1 border-r">Date of Referral</th><th class="p-1">Outcome</th></tr></thead>
                            <tbody>${supportServicesHTML}</tbody>
                        </table>
                    </div>

                    <div class="mt-16 grid grid-cols-2 gap-8 text-center" style="page-break-before: auto; padding-top: 5rem;">
                        <div><div class="border-t border-gray-600 pt-1">Participant Signature</div></div>
                        <div><div class="border-t border-gray-600 pt-1">Date</div></div>
                        <div class="mt-8"><div class="border-t border-gray-600 pt-1">WRTP Case Manager Signature</div></div>
                        <div class="mt-8"><div class="border-t border-gray-600 pt-1">Date</div></div>
                    </div>
                </main>
            </body>
            </html>
        `;
    };

    const handlePrint = () => {
        const printContent = generateISPPrintHTML();
        if (printContent) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(printContent);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };

    return (
        <div className="space-y-6">
            <AttachmentsSection clientId={clientId} category="ISP" showList={true} onFileUploaded={handleFileUploaded} />

            <Card
                title={isp ? "Edit Individual Service Plan" : "Create Individual Service Plan"}
                titleAction={
                    <div className="flex items-center space-x-2">
                        <button onClick={handlePrint} className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </button>
                        {user?.role === 'admin' && (
                            <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                                {isProcessing ? 'Processing...' : 'Auto-Fill'}
                                <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileUploaded(e.target.files[0]);
                                            e.target.value = ''; // Reset
                                        }
                                    }}
                                />
                            </label>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89] disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center text-red-700">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 flex items-center text-green-700">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            {success}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="ispDate" className="label">ISP Date</label>
                            <input
                                type="date"
                                id="ispDate"
                                name="ispDate"
                                value={formData.ispDate ? new Date(formData.ispDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, ispDate: e.target.valueAsNumber }))}
                                className="form-input"
                            />
                        </div>
                        <div><label htmlFor="jobDeveloper" className="label">Job Developer</label><input type="text" id="jobDeveloper" name="jobDeveloper" value={formData.jobDeveloper || ''} onChange={handleInputChange} className="form-input" /></div>
                    </div>

                    <fieldset><legend className="legend">Goals</legend>
                        <div><label htmlFor="shortTermGoals" className="label">How can WRTP be of service to you? (1–3 month goals)</label><textarea id="shortTermGoals" name="shortTermGoals" value={formData.shortTermGoals || ''} onChange={handleInputChange} rows={3} className="form-input" /></div>
                        <div><label htmlFor="longTermGoals" className="label">Long-Term Goals (6−12+ months)</label><textarea id="longTermGoals" name="longTermGoals" value={formData.longTermGoals || ''} onChange={handleInputChange} rows={3} className="form-input" /></div>
                    </fieldset>

                    <fieldset><legend className="legend">Identified Barriers/Needs</legend>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">{barrierOptions.map(barrier => <label key={barrier} className="flex items-center"><input type="checkbox" value={barrier} checked={formData.identifiedBarriers?.includes(barrier)} onChange={handleBarrierChange} className="form-checkbox" /><span className="ml-2 text-sm text-gray-700">{barrier}</span></label>)}</div>
                    </fieldset>

                    <fieldset><legend className="legend">Career Planning</legend>
                        <div><label htmlFor="careerPlanning.workshopsAssigned" className="label">Workshops Assigned</label><input type="text" id="careerPlanning.workshopsAssigned" name="careerPlanning.workshopsAssigned" value={formData.careerPlanning?.workshopsAssigned || ''} onChange={handleNestedInputChange} className="form-input" /></div>
                        <label className="flex items-center mt-2"><input type="checkbox" name="careerPlanning.enrolledInCteOrCollege" checked={formData.careerPlanning?.enrolledInCteOrCollege} onChange={handleNestedCheckboxChange} className="form-checkbox" /><span className="ml-2 text-sm text-gray-700">Enrolled in CTE or College Program</span></label>
                    </fieldset>

                    <fieldset><legend className="legend">Plan of Action - Who will do what and when?</legend>
                        {(formData.planOfAction || []).map((item, index) => (
                            <div key={item.id} className="p-2 border rounded-md space-y-2 mb-2">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                    <textarea placeholder="Goal" value={item.goal} onChange={e => handleDynamicListChange('planOfAction', index, 'goal', e.target.value)} rows={2} className="form-input md:col-span-2" />
                                    <textarea placeholder="Action" value={item.action} onChange={e => handleDynamicListChange('planOfAction', index, 'action', e.target.value)} rows={2} className="form-input md:col-span-2" />
                                    <input type="text" placeholder="Who?" value={item.responsibleParty} onChange={e => handleDynamicListChange('planOfAction', index, 'responsibleParty', e.target.value)} className="form-input" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                    <div><label className="text-xs">Target Date</label><input type="date" value={item.targetDate} onChange={e => handleDynamicListChange('planOfAction', index, 'targetDate', e.target.value)} className="form-input" /></div>
                                    <div><label className="text-xs">Review Date</label><input type="date" value={item.reviewDate} onChange={e => handleDynamicListChange('planOfAction', index, 'reviewDate', e.target.value)} className="form-input" /></div>
                                    <div><label className="text-xs">Completion Date</label><input type="date" value={item.completionDate} onChange={e => handleDynamicListChange('planOfAction', index, 'completionDate', e.target.value)} className="form-input" /></div>
                                    <button type="button" onClick={() => removeDynamicListItem('planOfAction', index)} className="self-end text-red-500 hover:text-red-700 justify-self-center"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addDynamicListItem('planOfAction')} className="inline-flex items-center text-sm text-[#404E3B] hover:text-[#313c2e] mt-2"><Plus className="w-4 h-4 mr-1" />Add Action Item</button>
                    </fieldset>

                    <fieldset><legend className="legend">Support Services</legend>
                        {(formData.supportServices || []).map((item, index) => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center mb-2 p-2 border rounded-md">
                                <input type="text" placeholder="Agency" value={item.agency} onChange={e => handleDynamicListChange('supportServices', index, 'agency', e.target.value)} className="form-input md:col-span-2" />
                                <div><label className="text-xs">Referral Date</label><input type="date" value={item.referralDate} onChange={e => handleDynamicListChange('supportServices', index, 'referralDate', e.target.value)} className="form-input" /></div>
                                <input type="text" placeholder="Outcome" value={item.outcome} onChange={e => handleDynamicListChange('supportServices', index, 'outcome', e.target.value)} className="form-input md:col-span-3" />
                                <button type="button" onClick={() => removeDynamicListItem('supportServices', index)} className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addDynamicListItem('supportServices')} className="inline-flex items-center text-sm text-[#404E3B] hover:text-[#313c2e] mt-2"><Plus className="w-4 h-4 mr-1" />Add Referral</button>
                    </fieldset>

                    <fieldset><label className="flex items-center"><input type="checkbox" name="acknowledgmentInitialed" checked={!!formData.acknowledgmentInitialed} onChange={handleCheckboxChange} className="form-checkbox" /><span className="ml-2 font-medium text-gray-700">Client has initialed and acknowledged this ISP.</span></label></fieldset>
                </div>
                <style>{`
                    .label { display: block; margin-bottom: 0.25rem; font-medium; color: #374151; font-size: 0.875rem; }
                    .legend { font-size: 1.125rem; font-medium: 600; color: #111827; margin-bottom: 0.5rem; }
                    .form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; }
                    .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }
                    .form-checkbox { height: 1rem; width: 1rem; color: #404E3B; border-color: #D1D5DB; border-radius: 0.25rem; focus:ring-[#404E3B]; }
                `}</style>
            </Card>
        </div>
    );
};

export default ISPSection;