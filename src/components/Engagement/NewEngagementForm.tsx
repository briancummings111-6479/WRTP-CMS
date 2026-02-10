import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Organization, EngagementType } from '../../types';
import { communityService } from '../../services/communityService';
import api from '../../lib/firebase';
import { Bold, Italic, List } from 'lucide-react';
import Card from '../Card';
import MultiSelect from '../MultiSelect';

interface NewEngagementFormProps {
    onSave: () => void;
}

const NewEngagementForm: React.FC<NewEngagementFormProps> = ({ onSave }) => {
    const { user } = useAuth();

    // -- Data Helper --
    const getTodayString = () => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const todayWithOffset = new Date(today.getTime() - (offset * 60 * 1000));
        return todayWithOffset.toISOString().split('T')[0];
    };

    // -- State --
    const [date, setDate] = useState<string>(getTodayString());
    const [interactionType, setInteractionType] = useState<EngagementType>('Outreach');
    const [duration, setDuration] = useState<string>('');

    const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

    const [staffId, setStaffId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // -- Data Sources --
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
    const [staffMembers, setStaffMembers] = useState<{ uid: string; name: string }[]>([]);

    const editorRef = useRef<HTMLDivElement>(null);

    // -- Fetch Data on Mount --
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orgs, staffData, clientsData] = await Promise.all([
                    communityService.getOrganizations(),
                    api.getStaffUsers(),
                    api.getClients()
                ]);

                setOrganizations(orgs);
                setStaffMembers(staffData.map(s => ({ uid: s.uid, name: s.name })));

                // Format clients for dropdown
                const formattedClients = clientsData.map(c => ({
                    id: c.id,
                    name: `${c.profile.firstName} ${c.profile.lastName}`
                })).sort((a, b) => a.name.localeCompare(b.name));

                setClients(formattedClients);

            } catch (error) {
                console.error("Failed to load form data", error);
            }
        };
        fetchData();
    }, []);

    // -- Set Default User --
    useEffect(() => {
        if (user && !staffId) {
            setStaffId(user.uid);
        }
    }, [user, staffId]);

    // -- Handlers --
    const handleFormat = (command: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: At least one partner OR one client? Or strictly partner?
        // User said "record engagements with partners", so probably at least one partner is required. 
        // But what if it's just a client event? The prompt implies Partner Dashboard.
        // Let's enforce at least one Partner for now, as it's the Partner Directory.
        if (selectedOrgIds.length === 0) {
            alert("Please select at least one Community Partner.");
            return;
        }

        const noteBody = editorRef.current?.innerHTML || '';
        if (!noteBody.trim()) {
            alert("Please enter some notes.");
            return;
        }

        setLoading(true);
        try {
            const staff = staffMembers.find(s => s.uid === staffId);

            // Resolve Names
            const orgNames = selectedOrgIds.map(id => organizations.find(o => o.id === id)?.name || 'Unknown');
            const clientNames = selectedClientIds.map(id => clients.find(c => c.id === id)?.name || 'Unknown');

            await communityService.addEngagement({
                date: new Date(date).getTime(),
                interactionType,
                // Primary Org (Legacy/Main) - use first one
                organizationId: selectedOrgIds[0],
                organizationName: orgNames[0],
                // Multi-select Fields
                organizationIds: selectedOrgIds,
                organizationNames: orgNames,
                clientIds: selectedClientIds,
                clientNames: clientNames,

                staffId,
                staffName: staff?.name || 'Unknown',
                notes: noteBody,
                durationMinutes: duration ? parseInt(duration) : undefined
            });

            // Reset
            setDate(getTodayString());
            setInteractionType('Outreach');
            setDuration('');
            setSelectedOrgIds([]);
            setSelectedClientIds([]);

            if (editorRef.current) editorRef.current.innerHTML = '';

            onSave();
        } catch (error) {
            console.error("Failed to save engagement", error);
            alert("Error saving engagement.");
        } finally {
            setLoading(false);
        }
    };

    // Options for MultiSelect
    const orgOptions = organizations.map(o => ({ value: o.id, label: o.name }));
    const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));

    return (
        <Card title="Record Engagement">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>

                    {/* Partners (Multi) */}
                    <div>
                        <MultiSelect
                            label="Community Partner(s)"
                            options={orgOptions}
                            selectedValues={selectedOrgIds}
                            onChange={setSelectedOrgIds}
                            placeholder="Select Partners..."
                        />
                    </div>

                    {/* Clients (Multi) */}
                    <div>
                        <MultiSelect
                            label="Client(s)"
                            options={clientOptions}
                            selectedValues={selectedClientIds}
                            onChange={setSelectedClientIds}
                            placeholder="Select Clients..."
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Type</label>
                        <select
                            value={interactionType}
                            onChange={e => setInteractionType(e.target.value as EngagementType)}
                            className="form-input"
                        >
                            <option value="Outreach">Outreach</option>
                            <option value="Case Conference">Case Conference</option>
                            <option value="Presentation">Presentation</option>
                            <option value="Job Development">Job Development</option>
                            <option value="Joint Training">Joint Training</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                </div>


                {/* Rich Text Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Engagement Notes</label>
                    <div className="mt-1 border border-gray-300 rounded-md">
                        <div className="flex items-center p-2 border-b bg-gray-50 space-x-2 rounded-t-md">
                            <button type="button" onClick={() => handleFormat('bold')} className="p-1.5 rounded hover:bg-gray-200"><Bold className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleFormat('italic')} className="p-1.5 rounded hover:bg-gray-200"><Italic className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 rounded hover:bg-gray-200"><List className="w-4 h-4" /></button>
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable
                            className="p-3 min-h-[100px] focus:outline-none"
                            aria-label="Notes editor"
                        ></div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex space-x-4 w-2/3">
                        {/* Duration */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Duration (Min)</label>
                            <input
                                type="number"
                                min="0"
                                step="15"
                                placeholder="30"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                                className="text-sm p-1 border border-gray-300 rounded focus:ring-indigo-500 w-24"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Staff Member</label>
                            <select
                                value={staffId}
                                onChange={e => setStaffId(e.target.value)}
                                className="text-sm p-1 border border-gray-300 rounded focus:ring-indigo-500 max-w-[200px]"
                            >
                                {staffMembers.map(s => (
                                    <option key={s.uid} value={s.uid}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B] disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Record Engagement'}
                    </button>
                </div>
            </form>
            <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid #D1D5DB;
                    border-radius: 0.375rem;
                    background-color: #fff;
                    transition: border-color 0.2s;
                    margin-top: 0.25rem;
                    min-height: 42px; /* Accessbility & Alignment */
                }
                .form-input:focus {
                    outline: none;
                    border-color: #404E3B;
                    box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3);
                }
            `}</style>
        </Card >
    );
};

export default NewEngagementForm;
