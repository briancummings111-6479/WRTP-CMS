import React from 'react';
import { PlanOfActionItem } from '../../types';
import { Save, X } from 'lucide-react';

interface ActionStepFormProps {
    stepData: Omit<PlanOfActionItem, 'id' | 'completionDate'>;
    onDataChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSave: () => void;
    onCancel: () => void;
}

const ActionStepForm: React.FC<ActionStepFormProps> = ({ stepData, onDataChange, onSave, onCancel }) => {
    return (
        <div className="p-4 bg-gray-50 rounded-lg border border-[#d1d1d1] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="goal" className="block text-sm font-medium text-gray-700">Goal</label>
                    <textarea id="goal" name="goal" value={stepData.goal} onChange={onDataChange} rows={2} className="form-input mt-1" required />
                </div>
                <div>
                    <label htmlFor="action" className="block text-sm font-medium text-gray-700">Action</label>
                    <textarea id="action" name="action" value={stepData.action} onChange={onDataChange} rows={2} className="form-input mt-1" required />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="responsibleParty" className="block text-sm font-medium text-gray-700">Action Owner</label>
                    <input type="text" id="responsibleParty" name="responsibleParty" value={stepData.responsibleParty} onChange={onDataChange} className="form-input mt-1" required />
                </div>
                 <div>
                    <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">Target Date</label>
                    <input type="date" id="targetDate" name="targetDate" value={(stepData as any).targetDate} onChange={onDataChange} className="form-input mt-1" required />
                </div>
            </div>
            <div className="flex justify-end space-x-2">
                <button onClick={onCancel} className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <X className="h-4 w-4 mr-2"/>Cancel
                </button>
                <button onClick={onSave} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53]">
                    <Save className="h-4 w-4 mr-2"/>Save
                </button>
            </div>
             <style>{`.form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; } .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }`}</style>
        </div>
    );
};

export default ActionStepForm;