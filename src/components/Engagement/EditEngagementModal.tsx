import React, { useState, useEffect } from 'react';
import { EngagementLog, EngagementType } from '../../types';
import { communityService } from '../../services/communityService';
import { X, Save, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface EditEngagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedLog: EngagementLog) => void;
    log: EngagementLog;
}

const EditEngagementModal: React.FC<EditEngagementModalProps> = ({ isOpen, onClose, onSave, log }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        interactionType: '' as EngagementType,
        notes: '',
        outcome: '',
    });

    useEffect(() => {
        if (log) {
            setFormData({
                date: new Date(log.date).toISOString().split('T')[0],
                interactionType: log.interactionType,
                notes: log.notes || '',
                outcome: log.outcome || '',
            });
        }
    }, [log, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updatedData = {
                ...formData,
                date: new Date(formData.date).getTime(), // Convert back to timestamp
            };

            await communityService.updateEngagement(log.id, updatedData);

            onSave({
                ...log,
                ...updatedData
            });
            onClose();
        } catch (error) {
            console.error("Failed to update engagement:", error);
        } finally {
            setLoading(false);
        }
    };

    const engagementTypes: EngagementType[] = ['Outreach', 'Job Development', 'Presentation', 'Joint Training', 'Case Conference', 'Other'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                        Edit Engagement
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-sm text-gray-500 mb-2">
                        Partner: <span className="font-medium text-gray-900">{log.organizationName || 'Unknown'}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                                className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interaction Type</label>
                        <select
                            name="interactionType"
                            value={formData.interactionType}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            {engagementTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Details of the interaction..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                        <textarea
                            name="outcome"
                            value={formData.outcome}
                            onChange={handleChange}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Results or next steps..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {loading ? 'Saving...' : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEngagementModal;
