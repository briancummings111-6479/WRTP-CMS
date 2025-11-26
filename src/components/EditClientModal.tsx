import React, { useState, useEffect } from 'react';
import { Client, User as AppUser } from '../types';
import { X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSave: (updatedClient: Client) => Promise<void>;
  onDelete?: () => Promise<void>;
  staff: AppUser[];
}

const EditClientModal: React.FC<EditClientModalProps> = ({ isOpen, onClose, client, onSave, onDelete, staff }) => {
  const [formData, setFormData] = useState<Client>(client);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    setFormData(client);
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

  const handleMetadataChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newMetadata = { ...prev.metadata };
      if (name === 'metadata.assignedAdminId') {
        const selectedStaff = staff.find(s => s.uid === value);
        newMetadata.assignedAdminId = value;
        newMetadata.assignedAdminName = selectedStaff?.name || '';
      } else if (name.startsWith('metadata.')) {
        const field = name.split('.')[1];
        (newMetadata as any)[field] = value;
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      if (onDelete) {
        await onDelete();
      }
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
                <div><label className="label">Date of Birth</label><input type="date" name="profile.dob" value={formData.profile.dob || ''} onChange={handleInputChange} className="form-input" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="label">Phone</label><input type="tel" name="contactInfo.phone" value={formData.contactInfo.phone} onChange={handleInputChange} className="form-input" /></div>
                <div><label className="label">Second Phone</label><input type="tel" name="contactInfo.phone2" value={formData.contactInfo.phone2 || ''} onChange={handleInputChange} className="form-input" /></div>
                <div><label className="label">Email</label><input type="email" name="contactInfo.email" value={formData.contactInfo.email || ''} onChange={handleInputChange} className="form-input" /></div>
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

            {/* Metadata Section (formerly Case Management) */}
            <fieldset className="space-y-4 p-4 border rounded-md">
              <legend className="text-lg font-medium text-gray-700 px-1">Client Metadata</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Client Status</label>
                  <select name="metadata.status" value={formData.metadata.status} onChange={handleMetadataChange} className="form-input">
                    <option value="Prospect">Prospect</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="label">Client Type</label>
                  <select name="metadata.clientType" value={formData.metadata.clientType} onChange={handleMetadataChange} className="form-input">
                    <option value="General Population">General Population</option>
                    <option value="CHYBA">CHYBA</option>
                  </select>
                </div>
                <div>
                  <label className="label">Assigned Case Manager</label>
                  <select
                    name="metadata.assignedAdminId"
                    value={formData.metadata.assignedAdminId || ''}
                    onChange={handleMetadataChange}
                    className="form-input"
                  >
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s.uid} value={s.uid}>
                        {s.name} {s.title ? `(${s.title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

          </div>
          <div className="flex justify-between items-center p-4 border-t bg-gray-50 sticky bottom-0">
            <div>
              {isAdmin && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Client
                </button>
              )}
            </div>
            <div className="flex items-center">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89]">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
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
