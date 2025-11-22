import React, { useState, useEffect } from 'react';
import { Workshop } from '../../types';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/mockApi';

interface AddEditWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workshop: Workshop) => void;
  workshopToEdit?: Workshop | null;
  clientId: string;
  clientName: string;
  admins: { id: string, name: string }[];
}

const workshopNames: Workshop['workshopName'][] = ['Career Explorations', 'Job Preparedness', 'Interview Success', 'Financial Literacy', 'Other'];

const AddEditWorkshopModal: React.FC<AddEditWorkshopModalProps> = ({ isOpen, onClose, onSave, workshopToEdit, clientId, clientName, admins }) => {
  const { user } = useAuth();
  // FIX: The form uses a string for the date, so the state type needs to reflect that.
  const [formData, setFormData] = useState<Omit<Partial<Workshop>, 'workshopDate'> & { workshopDate?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (workshopToEdit) {
        setFormData({
            ...workshopToEdit,
            // FIX: Error on line 29. Convert timestamp to a 'YYYY-MM-DD' string for the date input.
            workshopDate: new Date(workshopToEdit.workshopDate).toISOString().split('T')[0]
        });
      } else {
        // Reset form for new workshop
        setFormData({
            workshopName: 'Career Explorations',
            status: 'Scheduled',
            assignedToId: user?.uid || (admins.length > 0 ? admins[0].id : ''),
            workshopDate: '', // Initialize as empty string for controlled input
        });
      }
    }
  }, [workshopToEdit, isOpen, user, admins]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.workshopDate) return;
    
    setIsSaving(true);
    const selectedAdmin = admins.find(a => a.id === formData.assignedToId);
    
    const workshopData = {
      ...workshopToEdit,
      ...formData,
      clientId,
      // Convert string date back to timestamp for saving.
      workshopDate: new Date(formData.workshopDate).getTime(),
      assignedToName: selectedAdmin?.name || 'Unknown',
    };

    try {
      const savedWorkshop = await api.upsertWorkshop(workshopData as Omit<Workshop, 'id'> & { id?: string });
      onSave(savedWorkshop);
      onClose();
    } catch (error) {
      console.error("Failed to save workshop", error);
      alert("Failed to save workshop. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 pt-16" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{workshopToEdit ? 'Edit Workshop' : 'Add New Workshop'} for {clientName}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" aria-label="Close modal">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="workshopName" className="block text-sm font-medium text-gray-700">Workshop Name</label>
                    <select id="workshopName" name="workshopName" value={formData.workshopName} onChange={handleInputChange} className="form-input mt-1">
                        {workshopNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="workshopDate" className="block text-sm font-medium text-gray-700">Workshop Date</label>
                    {/* FIX: Error on line 96. The value is now correctly a string. Removed incorrect type cast. */}
                    <input type="date" id="workshopDate" name="workshopDate" value={formData.workshopDate || ''} onChange={handleInputChange} className="form-input mt-1" required />
                </div>
            </div>
            {formData.workshopName === 'Other' && (
                <div>
                    <label htmlFor="workshopNameOther" className="block text-sm font-medium text-gray-700">Custom Workshop Name</label>
                    <input type="text" id="workshopNameOther" name="workshopNameOther" value={formData.workshopNameOther} onChange={handleInputChange} className="form-input mt-1" required />
                </div>
            )}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" name="status" value={formData.status} onChange={handleInputChange} className="form-input mt-1">
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Declined">Declined</option>
                        <option value="No Show">No Show</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="assignedToId" className="block text-sm font-medium text-gray-700">Assigned Staff</label>
                    <select id="assignedToId" name="assignedToId" value={formData.assignedToId} onChange={handleInputChange} className="form-input mt-1" required>
                        {admins.map(admin => (
                        <option key={admin.id} value={admin.id}>{admin.name}</option>
                        ))}
                    </select>
                </div>
            </div>
          </div>
          <div className="flex justify-end items-center p-4 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3">Cancel</button>
            <button type="submit" disabled={isSaving} className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89]">
              {isSaving ? 'Saving...' : 'Save Workshop'}
            </button>
          </div>
        </form>
        <style>{`.form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; } .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }`}</style>
      </div>
    </div>
  );
};

export default AddEditWorkshopModal;