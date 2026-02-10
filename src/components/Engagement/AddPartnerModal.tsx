import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Organization, OrganizationType, OrganizationStatus } from '../../types';
import { communityService } from '../../services/communityService';
import { X, Building2, Save } from 'lucide-react';

interface AddPartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (org: Organization) => void;
    organizationToEdit?: Organization;
}

const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ isOpen, onClose, onSave, organizationToEdit }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Employer' as OrganizationType,
        status: 'Prospect' as OrganizationStatus,
        industry: '',
        website: '',
        phone: '',
        cellPhone: '',
        email: '',
        contactPerson: '',
        address: '',
        notes: '',
    });

    useEffect(() => {
        if (organizationToEdit) {
            setFormData({
                name: organizationToEdit.name,
                type: organizationToEdit.type,
                status: organizationToEdit.status,
                industry: organizationToEdit.industry || '',
                website: organizationToEdit.website || '',
                phone: organizationToEdit.phone || '',
                cellPhone: organizationToEdit.cellPhone || '',
                email: organizationToEdit.email || '',
                contactPerson: organizationToEdit.contactPerson || '',
                address: organizationToEdit.address || '',
                notes: organizationToEdit.notes || '',
            });
        } else {
            // Reset for add mode
            setFormData({
                name: '',
                type: 'Employer',
                status: 'Prospect',
                industry: '',
                website: '',
                phone: '',
                cellPhone: '',
                email: '',
                contactPerson: '',
                address: '',
                notes: '',
            });
        }
    }, [organizationToEdit, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setLoading(true);
        try {
            if (organizationToEdit) {
                await communityService.updateOrganization(organizationToEdit.id, formData);
                onSave({ ...organizationToEdit, ...formData });
            } else {
                const newOrg = await communityService.addOrganization({
                    ...formData,
                    jobOpeningsCount: 0 // Default
                });
                onSave(newOrg);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save partner:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                        {organizationToEdit ? 'Edit Partner' : 'Add New Partner'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. Acme Industries"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Employer">Employer</option>
                                <option value="Social Service Agency">Social Service Agency</option>
                                <option value="Training Partner">Training Partner</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Prospect">Prospect</option>
                                <option value="Active Partner">Active Partner</option>
                                <option value="MOU Signed">MOU Signed</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Industry / Sector</label>
                        <input
                            type="text"
                            name="industry"
                            value={formData.industry}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Construction, Healthcare"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                        <input
                            type="text"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone</label>
                            <input
                                type="tel"
                                name="cellPhone"
                                value={formData.cellPhone}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Additional details..."
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
                            disabled={loading || !formData.name}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {loading ? 'Saving...' : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {organizationToEdit ? 'Update Partner' : 'Save Partner'}
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {organizationToEdit && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-md font-bold text-gray-900">Engagement History</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">View all interactions and notes for this partner.</p>

                        <button
                            onClick={() => {
                                onClose();
                                navigate('/engagements', { state: { organizationId: organizationToEdit.id } });
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center"
                        >
                            View Full Engagement History &rarr;
                        </button>
                        {/* 
                           Note: To pass state via hash link is tricky. 
                           Ideally we would use `navigate('/engagements', { state: { organizationId: organizationToEdit.id } })` 
                           but we don't have `useNavigate` easily here without refactoring to wrap in a hook or pass it down.
                           Let's change the link to use a simpler approach or just render a button that calls a prop.
                        */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddPartnerModal;
