import React, { useState, useEffect } from 'react';
import { Client, Demographics } from '../types';
import api, { defaultDemographics } from '../lib/firebase';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import AttachmentsSection from './Attachments/AttachmentsSection';

interface EnrollmentIntakeSectionProps {
    client: Client;
    onUpdate: (updatedClient: Client) => void;
}

const EnrollmentIntakeSection: React.FC<EnrollmentIntakeSectionProps> = ({ client, onUpdate }) => {
    const [formData, setFormData] = useState<Demographics | undefined>(client.demographics || defaultDemographics);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        setFormData(client.demographics || defaultDemographics);
    }, [client.demographics]);

    const handleChange = (section: keyof Demographics, field: string, value: any) => {
        if (!formData) return;
        setFormData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [section]: {
                    ...prev[section] as any,
                    [field]: value
                }
            };
        });
    };

    const handleRootChange = (field: keyof Demographics, value: any) => {
        if (!formData) return;
        setFormData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [field]: value
            };
        });
    };

    const handleSave = async () => {
        if (!formData) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const updatedClient = {
                ...client,
                demographics: formData
            };
            await api.updateClient(updatedClient);
            onUpdate(updatedClient);
            setSuccess("Intake form saved successfully.");
        } catch (err) {
            console.error("Error saving intake form:", err);
            setError("Failed to save intake form. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!formData) {
        return <div className="p-4 text-red-600">Error: Demographics data is missing and defaults failed to load.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Enrollment Intake Form</h2>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                </button>
            </div>

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

            {/* Section 1: Contact Information (Read-Only) */}
            <section className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Section 1: Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <label className="block text-gray-500">Full Name</label>
                        <div className="font-medium">{client.profile.firstName} {client.profile.lastName}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500">Date of Birth</label>
                        <div className="font-medium">{client.profile.dob || 'N/A'}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500">Phone Number</label>
                        <div className="font-medium">{client.contactInfo.phone}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500">Email Address</label>
                        <div className="font-medium">{client.contactInfo.email || 'N/A'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-gray-500">Address</label>
                        <div className="font-medium">
                            {client.contactInfo.street} {client.contactInfo.apt ? `Apt ${client.contactInfo.apt}` : ''}, {client.contactInfo.city}, {client.contactInfo.state} {client.contactInfo.zip}
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 2: Household and Employment Information */}
            <section className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Section 2: Household and Employment Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="residentOfShastaCounty"
                            checked={formData.residentOfShastaCounty}
                            onChange={(e) => handleRootChange('residentOfShastaCounty', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="residentOfShastaCounty" className="text-gray-700">Resident of Shasta County?</label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="currentlyEmployed"
                            checked={formData.currentlyEmployed}
                            onChange={(e) => handleRootChange('currentlyEmployed', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="currentlyEmployed" className="text-gray-700">Currently Employed?</label>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block font-medium text-gray-700">Public Assistance (Check all that apply):</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(formData.publicAssistance).map(([key, value]) => {
                            if (key === 'other') return null;
                            return (
                                <div key={key} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`pa-${key}`}
                                        checked={value as boolean}
                                        onChange={(e) => handleChange('publicAssistance', key, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`pa-${key}`} className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <label htmlFor="pa-other" className="text-sm text-gray-700">Other:</label>
                        <input
                            type="text"
                            id="pa-other"
                            value={formData.publicAssistance.other}
                            onChange={(e) => handleChange('publicAssistance', 'other', e.target.value)}
                            className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none text-sm py-1"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block font-medium text-gray-700">Barriers to Employment (Check all that apply):</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(formData.barriersToEmployment).map(([key, value]) => {
                            if (key === 'other') return null;
                            return (
                                <div key={key} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`barrier-${key}`}
                                        checked={value as boolean}
                                        onChange={(e) => handleChange('barriersToEmployment', key, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`barrier-${key}`} className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <label htmlFor="barrier-other" className="text-sm text-gray-700">Other:</label>
                        <input
                            type="text"
                            id="barrier-other"
                            value={formData.barriersToEmployment.other}
                            onChange={(e) => handleChange('barriersToEmployment', 'other', e.target.value)}
                            className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none text-sm py-1"
                        />
                    </div>
                </div>
            </section>

            {/* Section 3: Education & Training Interests */}
            <section className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Section 3: Education & Training Interests</h3>

                <div>
                    <label className="block font-medium text-gray-700 mb-2">Highest Level of Education Completed:</label>
                    <select
                        value={formData.educationLevel}
                        onChange={(e) => handleRootChange('educationLevel', e.target.value)}
                        className="w-full md:w-1/2 p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="No High School Diploma">No High School Diploma</option>
                        <option value="GED">GED</option>
                        <option value="High School Diploma">High School Diploma</option>
                        <option value="Some College">Some College</option>
                        <option value="Associate Degree">Associate Degree</option>
                        <option value="Bachelor's Degree">Bachelor's Degree</option>
                        <option value="Other">Other</option>
                    </select>
                    {formData.educationLevel === 'Other' && (
                        <input
                            type="text"
                            placeholder="Please specify"
                            value={formData.educationOther || ''}
                            onChange={(e) => handleRootChange('educationOther', e.target.value)}
                            className="mt-2 w-full md:w-1/2 p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="currentlyEnrolled"
                            checked={formData.currentlyEnrolled}
                            onChange={(e) => handleRootChange('currentlyEnrolled', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="currentlyEnrolled" className="text-gray-700">Currently enrolled in school/training?</label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="hasResume"
                            checked={formData.hasResume}
                            onChange={(e) => handleRootChange('hasResume', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="hasResume" className="text-gray-700">Do you have a resume?</label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="interestedInTraining"
                            checked={formData.interestedInTraining}
                            onChange={(e) => handleRootChange('interestedInTraining', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="interestedInTraining" className="text-gray-700">Interested in job training?</label>
                    </div>
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-1">Job/Career Fields of Interest:</label>
                    <input
                        type="text"
                        value={formData.jobInterests}
                        onChange={(e) => handleRootChange('jobInterests', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </section>

            {/* Section 4: Support Services */}
            <section className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Section 4: Support Services</h3>
                <div className="space-y-2">
                    <label className="block font-medium text-gray-700">What types of support would help you most? (Check all that apply):</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(formData.supportServices).map(([key, value]) => {
                            if (key === 'other') return null;
                            return (
                                <div key={key} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`support-${key}`}
                                        checked={value as boolean}
                                        onChange={(e) => handleChange('supportServices', key, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`support-${key}`} className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <label htmlFor="support-other" className="text-sm text-gray-700">Other:</label>
                        <input
                            type="text"
                            id="support-other"
                            value={formData.supportServices.other}
                            onChange={(e) => handleChange('supportServices', 'other', e.target.value)}
                            className="flex-1 border-b border-gray-300 focus:border-blue-500 outline-none text-sm py-1"
                        />
                    </div>
                </div>
            </section>

            {/* Section 5: Demographics (Income, Race, etc.) */}
            <section className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Section 5: Demographics & Income</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Applicant Name (Self-Certification)</label>
                        <input
                            type="text"
                            value={formData.incomeCertification.applicantName}
                            onChange={(e) => handleChange('incomeCertification', 'applicantName', e.target.value)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Household Size</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.incomeCertification.householdSize}
                            onChange={(e) => handleChange('incomeCertification', 'householdSize', parseInt(e.target.value) || 1)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Annual Household Income ($)</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.incomeCertification.annualIncome}
                            onChange={(e) => handleChange('incomeCertification', 'annualIncome', parseInt(e.target.value) || 0)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.incomeCertification.femaleHeadOfHousehold}
                            onChange={(e) => handleChange('incomeCertification', 'femaleHeadOfHousehold', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label className="text-sm text-gray-700">Female Head of Household</label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.incomeCertification.seniorHeadOfHousehold}
                            onChange={(e) => handleChange('incomeCertification', 'seniorHeadOfHousehold', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label className="text-sm text-gray-700">Senior Head of Household (62+)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.incomeCertification.singleParentFamily}
                            onChange={(e) => handleChange('incomeCertification', 'singleParentFamily', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label className="text-sm text-gray-700">Single Parent Family</label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.incomeCertification.disabledFamilyMember}
                            onChange={(e) => handleChange('incomeCertification', 'disabledFamilyMember', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label className="text-sm text-gray-700">Family member with disability</label>
                    </div>
                </div>

                <div>
                    <label className="block font-medium text-gray-700 mb-2">Race & Ethnicity</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(formData.incomeCertification.race).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`race-${key}`}
                                    checked={value as boolean}
                                    onChange={(e) => {
                                        const newRace = { ...formData.incomeCertification.race, [key]: e.target.checked };
                                        handleChange('incomeCertification', 'race', newRace);
                                    }}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor={`race-${key}`} className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <AttachmentsSection clientId={client.id} category="Enrollment" />
        </div>
    );
};

export default EnrollmentIntakeSection;
