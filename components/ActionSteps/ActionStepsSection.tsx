import React, { useState } from 'react';
import { ISP, PlanOfActionItem } from '../../types';
import Card from '../Card';
import ActionStepForm from './ActionStepForm';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface ActionStepsSectionProps {
    isp: ISP | null;
    onIspUpdate: (updatedIsp: ISP) => Promise<void>;
}

const emptyStep: Omit<PlanOfActionItem, 'id' | 'completionDate' | 'reviewDate'> = {
    goal: '',
    action: '',
    responsibleParty: '',
    targetDate: '',
};

const ActionStepsSection: React.FC<ActionStepsSectionProps> = ({ isp, onIspUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [stepData, setStepData] = useState<Omit<PlanOfActionItem, 'id' | 'completionDate'>>(emptyStep as any);

    const actionSteps = isp?.planOfAction || [];

    const handleStartAdding = () => {
        setStepData(emptyStep as any);
        setIsAdding(true);
        setEditingId(null);
    };

    const handleEdit = (step: PlanOfActionItem) => {
        setEditingId(step.id);
        setStepData(step);
        setIsAdding(false);
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setStepData(emptyStep as any);
    };

    const handleSave = async () => {
        if (!isp) {
             console.error("Cannot save action step: No ISP exists.");
             alert("An ISP must be created before adding action steps.");
             return;
        }

        let newPlanOfAction;
        if (editingId) {
            newPlanOfAction = actionSteps.map(step => step.id === editingId ? { ...step, ...stepData } : step);
        } else {
            const newStep: PlanOfActionItem = { ...stepData, id: crypto.randomUUID(), completionDate: '', reviewDate: '' };
            newPlanOfAction = [...actionSteps, newStep];
        }

        await onIspUpdate({ ...isp, planOfAction: newPlanOfAction });
        handleCancel();
    };

    const handleDelete = async (id: string) => {
        if (!isp || !window.confirm("Are you sure you want to delete this action step?")) return;
        const newPlanOfAction = actionSteps.filter(step => step.id !== id);
        await onIspUpdate({ ...isp, planOfAction: newPlanOfAction });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setStepData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Card
            title="Action Steps"
            titleAction={
                <button
                    onClick={handleStartAdding}
                    disabled={!isp || isAdding || !!editingId}
                    className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none disabled:bg-[#8d9b89]"
                    aria-label="Add new action step"
                >
                    <Plus className="h-4 w-4" />
                </button>
            }
        >
            <div className="space-y-3">
                {!isp && (
                    <p className="text-center text-sm text-gray-500 py-4">Create an ISP to manage Action Steps.</p>
                )}
                {isp && actionSteps.length === 0 && !isAdding && (
                    <p className="text-center text-sm text-gray-500 py-4">No action steps defined in the ISP.</p>
                )}
                {actionSteps.map(step => (
                    editingId === step.id ? (
                        <ActionStepForm
                            key={step.id}
                            stepData={stepData}
                            onDataChange={handleInputChange}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                    ) : (
                        <div key={step.id} className="p-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-2">
                                    <p className="font-semibold text-gray-800">{step.goal}</p>
                                    <p className="text-sm text-gray-600">{step.action}</p>
                                </div>
                                <div className="flex-shrink-0 flex items-center space-x-2">
                                    <button onClick={() => handleEdit(step)} className="text-gray-400 hover:text-[#404E3B]" aria-label="Edit action step"><Edit className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(step.id)} className="text-gray-400 hover:text-red-600" aria-label="Delete action step"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                <span>Owner: {step.responsibleParty}</span> &bull; <span>Target: {step.targetDate}</span>
                            </div>
                        </div>
                    )
                ))}
                {isAdding && (
                     <ActionStepForm
                        stepData={stepData}
                        onDataChange={handleInputChange}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}
            </div>
        </Card>
    );
};

export default ActionStepsSection;