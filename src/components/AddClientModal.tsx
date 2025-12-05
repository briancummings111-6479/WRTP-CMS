import React, { useState, useEffect } from 'react';
import { Client, AuditChecklist, User as AppUser } from '../types';
import { X } from 'lucide-react';
import api from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newClient: Client) => void;
    staff: AppUser[];
}

// --- NEW Initial data for Audit Checklist ---
const initialAuditChecklist: AuditChecklist = [
    { id: "1.1", label: "1.1 WRTP Contact Form", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.2", label: "1.2 Completed WRTP Application", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.3", label: "1.3 Proof of Identity (e.g., ID, DL)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.5", label: "1.5 Income Verification", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.6", label: "1.6 WRTP Assessment", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.9", label: "1.9 Authorization of Release", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.1", label: "2.1 Initial ISP Completed & Signed", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.2", label: "2.2 Updated ISP (if applicable)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "referrals", label: "Referrals & Services Provided", present: false, complete: false, uploaded: false, notes: "" },
];
// ----------------------------------------

const initialFormData = {
    profile: {
        firstName: '',
        lastName: '',
        dob: '',
    },
    contactInfo: {
        phone: '',
        phone2: '',
        email: '',
        street: '',
        apt: '',
        city: '',
        state: 'CA',
        zip: '',
    },
    referralSource: '',
    googleDriveLink: '',

    // --- REPLACED caseManagement ---
    auditChecklist: initialAuditChecklist,
    // -------------------------------

    training: {
        cpr: false,
        firstAid: false,
        foodHandlersCard: false,
        osha10: false, // Added
        nccer: false, // Added
        otherCertificates: '',
        constructionCTE: false,
        cosmetologyCTE: false,
        culinaryCTE: false,
        fireCTE: false,
        medicalCTE: false,
        earlyChildhoodEducationCTE: false, // Added
        entrepreneurshipCTE: false, // Added
        otherCteProgram: '',
    },
    metadata: {
        assignedAdminId: '',
        assignedAdminName: '',
        clientType: 'General Population' as Client['metadata']['clientType'],
        status: 'Prospect' as Client['metadata']['status'],
    },
};

const CheckboxInput = ({ label, name, checked, onChange }: { label: string, name: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <label className="flex items-center">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
        <span className="ml-2 text-gray-700">{label}</span>
    </label>
);


const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSave, staff }) => {
    const [formData, setFormData] = useState<any>(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        // Set a default admin if one isn't selected, but it's no longer required
        if (isOpen && staff.length > 0 && !formData.metadata.assignedAdminId) {
            setFormData((prev: any) => ({
                ...prev,
                metadata: {
                    ...prev.metadata,
                    // Default to "Unassigned"
                    assignedAdminId: '',
                    assignedAdminName: '',
                }
            }));
        }
        // Reset form on close
        if (!isOpen) {
            setFormData(initialFormData);
        }
    }, [isOpen, staff]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name.includes('.')) {
            const [section, field] = name.split('.');
            setFormData((prev: any) => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData((prev: any) => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleMetadataChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => {
            const newMetadata = { ...prev.metadata };
            if (name === 'assignedAdminId') {
                const selectedStaff = staff.find(s => s.uid === value);
                newMetadata.assignedAdminId = value;
                newMetadata.assignedAdminName = selectedStaff?.name || '';
            } else {
                (newMetadata as any)[name] = value;
            }
            return { ...prev, metadata: newMetadata };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        try {
            const newClient = await api.addClient(formData, user.uid);
            onSave(newClient);
        } catch (error) {
            console.error("Failed to add client:", error);
            // Replaced alert() with console.error()
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 pt-16" aria-modal="true" role="dialog">
            <div className="bg-[#E6E6E6] rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-[#d1d1d1]">
                    <h2 className="text-xl font-semibold text-gray-800">Add New Client</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[#f2f2f2]" aria-label="Close modal">
                        <X className="h-6 w-6 text-gray-600" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Profile Section */}
                        <fieldset className="space-y-4 p-4 border border-[#d1d1d1] rounded-md">
                            <legend className="text-lg font-medium text-gray-700 px-1">Profile</legend>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="label">First Name</label><input type="text" name="profile.firstName" value={formData.profile.firstName} onChange={handleInputChange} className="form-input" required /></div>
                                <div><label className="label">Last Name</label><input type="text" name="profile.lastName" value={formData.profile.lastName} onChange={handleInputChange} className="form-input" required /></div>
                                {/* Removed 'required' from DOB */}
                                <div><label className="label">Date of Birth</label><input type="date" name="profile.dob" value={formData.profile.dob} onChange={handleInputChange} className="form-input" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="label">Phone</label><input type="tel" name="contactInfo.phone" value={formData.contactInfo.phone} onChange={handleInputChange} className="form-input" /></div>
                                <div><label className="label">Second Phone</label><input type="tel" name="contactInfo.phone2" value={formData.contactInfo.phone2} onChange={handleInputChange} className="form-input" /></div>
                                {/* Removed 'required' from Email */}
                                <div><label className="label">Email</label><input type="email" name="contactInfo.email" value={formData.contactInfo.email} onChange={handleInputChange} className="form-input" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="md:col-span-2"><label className="label">Street Address</label><input type="text" name="contactInfo.street" value={formData.contactInfo.street} onChange={handleInputChange} className="form-input" /></div>
                                <div><label className="label">Apt/Unit #</label><input type="text" name="contactInfo.apt" value={formData.contactInfo.apt} onChange={handleInputChange} className="form-input" /></div>
                                <div className="md:col-span-2"><label className="label">City</label><input type="text" name="contactInfo.city" value={formData.contactInfo.city} onChange={handleInputChange} className="form-input" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="md:col-span-2"><label className="label">State</label><input type="text" name="contactInfo.state" value={formData.contactInfo.state} onChange={handleInputChange} className="form-input" /></div>
                                <div><label className="label">Zip Code</label><input type="text" name="contactInfo.zip" value={formData.contactInfo.zip} onChange={handleInputChange} className="form-input" /></div>
                                <div className="md:col-span-2"><label className="label">Referral Source</label><input type="text" name="referralSource" value={formData.referralSource} onChange={handleInputChange} className="form-input" /></div>
                            </div>
                            <div><label className="label">Google Drive Link</label><input type="url" name="googleDriveLink" value={formData.googleDriveLink} onChange={handleInputChange} className="form-input" placeholder="httpss://drive.google.com/..." /></div>
                        </fieldset>

                        {/* Case Management Section */}
                        <fieldset className="space-y-4 p-4 border border-[#d1d1d1] rounded-md">
                            <legend className="text-lg font-medium text-gray-700 px-1">Case Management</legend>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="label">Client Status</label><select name="status" value={formData.metadata.status} onChange={handleMetadataChange} className="form-input"><option value="Prospect">Prospect</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                                <div><label className="label">Client Type</label><select name="clientType" value={formData.metadata.clientType} onChange={handleMetadataChange} className="form-input"><option value="General Population">General Population</option><option value="CHYBA">CHYBA</option></select></div>
                                {/* Removed 'required' from Assigned Case Manager */}
                                <div>
                                    <label className="label">Assigned Case Manager</label>
                                    <select name="assignedAdminId" value={formData.metadata.assignedAdminId} onChange={handleMetadataChange} className="form-input">
                                        <option value="">Unassigned</option>
                                        {staff.map(s => (
                                            <option key={s.uid} value={s.uid}>
                                                {s.name} {s.title ? `(${s.title})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {/* --- REMOVED old caseManagement checkboxes --- */}
                        </fieldset>

                        {/* --- DELETED: Training Section was here --- */}

                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-[#d1d1d1] bg-[#f2f2f2] sticky bottom-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3">Cancel</button>
                        <button type="submit" disabled={isSaving} className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89]">
                            {isSaving ? 'Creating...' : 'Create Client'}
                        </button>
                    </div>
                </form>
                <style>{`
                    .label { display: block; margin-bottom: 0.25rem; font-medium; color: #374151; font-size: 0.875rem; }
                    .form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; }
                    .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }
                `}</style>
            </div>
        </div>
    );
};

export default AddClientModal;