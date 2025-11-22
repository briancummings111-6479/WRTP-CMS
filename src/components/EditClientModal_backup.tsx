import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { X } from 'lucide-react';
import api from '../services/mockApi';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSave: (updatedClient: Client) => Promise<void>;
}

const CheckboxInput = ({ label, name, checked, onChange }: { label: string, name: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}) => (
    <label className="flex items-center">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
        <span className="ml-2 text-gray-700">{label}</span>
    </label>
);

const EditClientModal: React.FC<EditClientModalProps> = ({ isOpen, onClose, client, onSave }) => {
  const [formData, setFormData] = useState(client);
  const [isSaving, setIsSaving] = useState(false);
  const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    setFormData(client);
    api.getAdmins().then(setAdmins);
  }, [client, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.includes('.')) {
        const [section, field] = name.split('.');
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...(prev[section as keyof Client] as object),
                [field]: type === 'checkbox' ? checked : value,
            },
        }));
    } else {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newMetadata = { ...prev.metadata };
        if (name === 'assignedAdminName') {
            const selectedAdmin = admins.find(a => a.name === value);
            newMetadata.assignedAdminName = value;
            // Handle "Unassigned" case
            newMetadata.assignedAdminId = selectedAdmin?.id || ''; 
        } else {
            (newMetadata as any)[name] = value;
        }
        return { ...prev, metadata: newMetadata };
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Failed to save client:", error);
      // Don't use alert() in production apps, but leaving as per original code
      alert("Failed to save client information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 pt-16" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Edit: {client.profile.firstName} {client.profile.lastName}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" aria-label="Close modal">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Profile Section */}
            <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-lg font-medium text-gray-700 px-1">Profile</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="label">First Name</label><input type="text" name="profile.firstName" value={formData.profile.firstName} onChange={handleInputChange} className="form-input" required /></div>
                    <div><label className="label">Last Name</label><input type="text" name="profile.lastName" value={formData.profile.lastName} onChange={handleInputChange} className="form-input" required /></div>
                    {/* Removed 'required' from DOB */}
                    <div><label className="label">Date of Birth</label><input type="date" name="profile.dob" value={formData.profile.dob} onChange={handleInputChange} className="form-input" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="label">Phone</label><input type="tel" name="contactInfo.phone" value={formData.contactInfo.phone} onChange={handleInputChange} className="form-input" /></div>
                    <div><label className="label">Second Phone</label><input type="tel" name="contactInfo.phone2" value={formData.contactInfo.phone2 || ''} onChange={handleInputChange} className="form-input" /></div>
                    {/* Email was already not required here, which is correct */}
                    <div><label className="label">Email</label><input type="email" name="contactInfo.email" value={formData.contactInfo.email} onChange={handleInputChange} className="form-input" /></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2"><label className="label">Street Address</label><input type="text" name="contactInfo.street" value={formData.contactInfo.street} onChange={handleInputChange} className="form-input" /></div>
                    <div><label className="label">Apt/Unit #</label><input type="text" name="contactInfo.apt" value={formData.contactInfo.apt || ''} onChange={handleInputChange} className="form-input" /></div>
                    <div className="md:col-span-2"><label className="label">City</label><input type="text" name="contactInfo.city" value={formData.contactInfo.city} onChange={handleInputChange} className="form-input" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2"><label className="label">State</label><input type="text" name="contactInfo.state" value={formData.contactInfo.state} onChange={handleInputChange} className="form-input" /></div>
                    <div><label className="label">Zip Code</label><input type="text" name="contactInfo.zip" value={formData.contactInfo.zip} onChange={handleInputChange} className="form-input" /></div>
                    <div className="md:col-span-2"><label className="label">Referral Source</label><input type="text" name="referralSource" value={formData.referralSource} onChange={handleInputChange} className="form-input" /></div>
                </div>
                <div><label className="label">Google Drive Link</label><input type="url" name="googleDriveLink" value={formData.googleDriveLink || ''} onChange={handleInputChange} className="form-input" placeholder="https://drive.google.com/..." /></div>
            </fieldset>

            {/* Case Management Section */}
            <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-lg font-medium text-gray-700 px-1">Case Management</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="label">Client Status</label><select name="status" value={formData.metadata.status} onChange={handleMetadataChange} className="form-input"><option value="Prospect">Prospect</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                    <div><label className="label">Client Type</label><select name="clientType" value={formData.metadata.clientType} onChange={handleMetadataChange} className="form-input"><option value="General Population">General Population</option><option value="CHYBA">CHYBA</option></select></div>
                    {/* Removed 'required' from Assigned Case Manager */}
                    <div><label className="label">Assigned Case Manager</label><select name="assignedAdminName" value={formData.metadata.assignedAdminName} onChange={handleMetadataChange} className="form-input"><option value="">Unassigned</option>{admins.map(admin => (<option key={admin.id} value={admin.name}>{admin.name}</option>))}</select></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    <CheckboxInput label="Application Packet" name="caseManagement.applicationPacket" checked={formData.caseManagement.applicationPacket} onChange={handleInputChange} />
                    <CheckboxInput label="ID" name="caseManagement.id" checked={formData.caseManagement.id} onChange={handleInputChange} />
                    <CheckboxInput label="Proof of Income" name="caseManagement.proofOfIncome" checked={formData.caseManagement.proofOfIncome} onChange={handleInputChange} />
                    <CheckboxInput label="Initial Assessment" name="caseManagement.initialAssessment" checked={formData.caseManagement.initialAssessment} onChange={handleInputChange} />
                    <CheckboxInput label="ROI" name="caseManagement.roi" checked={formData.caseManagement.roi} onChange={handleInputChange} />
                    <CheckboxInput label="ISP Completed" name="caseManagement.ispCompleted" checked={formData.caseManagement.ispCompleted} onChange={handleInputChange} />
                </div>
            </fieldset>
            
            {/* Training Section */}
            <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-lg font-medium text-gray-700 px-1">Training & Certifications</legend>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <CheckboxInput label="CPR" name="training.cpr" checked={formData.training.cpr} onChange={handleInputChange} />
                    <CheckboxInput label="First Aid" name="training.firstAid" checked={formData.training.firstAid} onChange={handleInputChange} />
                    <CheckboxInput label="Food Handlers Card" name="training.foodHandlersCard" checked={formData.training.foodHandlersCard} onChange={handleInputChange} />
                    <CheckboxInput label="Construction CTE" name="training.constructionCTE" checked={formData.training.constructionCTE} onChange={handleInputChange} />
                    <CheckboxInput label="Cosmetology CTE" name="training.cosmetologyCTE" checked={formData.training.cosmetologyCTE} onChange={handleInputChange} />
                    <CheckboxInput label="Culinary CTE" name="training.culinaryCTE" checked={formData.training.culinaryCTE} onChange={handleInputChange} />
                    <CheckboxInput label="Fire CTE" name="training.fireCTE" checked={formData.training.fireCTE} onChange={handleInputChange} />
                    <CheckboxInput label="Medical CTE" name="training.medicalCTE" checked={formData.training.medicalCTE} onChange={handleInputChange} />
                </div>
            </fieldset>

          </div>
          <div className="flex justify-end items-center p-4 border-t bg-gray-50 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89]">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
         <style>{`
            .label { display: block; margin-bottom: 0.25rem; font-medium; color: #374151; font-size: 0.875rem; }
            .form-input {
                display: block;
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #D1D5DB;
                border-radius: 0.375rem;
                background-color: #fff;
                transition: border-color 0.2s;
            }
            .form-input:focus {
                outline: none;
                border-color: #404E3B;
                box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3);
            }
        `}</style>
      </div>
    </div>
  );
};

export default EditClientModal;