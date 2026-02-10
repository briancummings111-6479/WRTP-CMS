import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Organization,
    OrganizationType,
    EngagementType,
    Client
} from '../../types';
import { communityService } from '../../services/communityService';
import api from '../../lib/firebase';
import {
    Search,
    Plus,
    ArrowLeft,
    ArrowRight,
    Check,
    Users,
    Briefcase,
    Calendar,
    Building2,
    UserPlus
} from 'lucide-react';

const EngagementWizard: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data Options
    const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);

    // Form State
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgType, setNewOrgType] = useState<OrganizationType>('Employer');

    const [interactionType, setInteractionType] = useState<EngagementType | null>(null);

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [outcome, setOutcome] = useState('');

    // Group Session Specifics
    const [topic, setTopic] = useState('');
    const [externalAttendees, setExternalAttendees] = useState(0);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [clientSearchTerm, setClientSearchTerm] = useState('');

    // Flags
    const isGroupSession = interactionType === 'Joint Training' || interactionType === 'Presentation' || interactionType === 'Case Conference';

    useEffect(() => {
        const loadData = async () => {
            const orgs = await communityService.getOrganizations();
            setAllOrgs(orgs);

            const clients = await api.getClients();
            setAllClients(clients);
        };
        loadData();
    }, []);

    const handleOrgSearch = (term: string) => {
        // For now, filtering is done in render or simple state, 
        // real implementation might debounce search here
    };

    const createNewOrg = async () => {
        if (!newOrgName) return;
        setLoading(true);
        try {
            const newOrg = await communityService.addOrganization({
                name: newOrgName,
                type: newOrgType,
                status: 'Prospect',
                jobOpeningsCount: 0
            });
            setAllOrgs([...allOrgs, newOrg]);
            setSelectedOrg(newOrg);
            setIsCreatingOrg(false);
        } catch (e) {
            console.error("Error creating org", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedOrg || !interactionType) return;
        setLoading(true);

        try {
            if (isGroupSession && selectedClientIds.length > 0) {
                // Create Group Session
                await communityService.createGroupSession({
                    date: new Date(date).getTime(),
                    organizationId: selectedOrg.id,
                    organizationName: selectedOrg.name,
                    topic: topic || `${interactionType} with ${selectedOrg.name}`,
                    totalExternalAttendees: Number(externalAttendees),
                    internalClientIds: selectedClientIds,
                    notes: notes,
                    createdBy: 'current-user-uid' // TODO: Get from AuthContext
                });
            } else {
                // Create Standard Engagement
                await communityService.addEngagement({
                    date: new Date(date).getTime(),
                    interactionType,
                    organizationId: selectedOrg.id,
                    organizationName: selectedOrg.name,
                    staffId: 'current-user-uid', // TODO: Get from AuthContext
                    staffName: 'Current User', // TODO: Get from AuthContext
                    notes,
                    outcome
                });
            }
            navigate('/partners');
        } catch (e) {
            console.error("Error submitting", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrgs = allOrgs.filter(o => o.name.toLowerCase().includes(newOrgName.toLowerCase()));

    // Render Steps
    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8">
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between text-sm font-medium text-gray-500 mb-2">
                    <span>Partner</span>
                    <span>Interaction</span>
                    <span>Details</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'
                        }`}></div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
                {/* Step 1: Who */}
                {step === 1 && (
                    <div className="p-6 flex-1 flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Who are you meeting with?</h2>

                        {!isCreatingOrg ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Search organizations..."
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {filteredOrgs.map(org => (
                                        <button
                                            key={org.id}
                                            onClick={() => { setSelectedOrg(org); setStep(2); }}
                                            className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg flex items-center justify-between group transition-colors"
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900">{org.name}</div>
                                                <div className="text-sm text-gray-500">{org.type}</div>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-600" />
                                        </button>
                                    ))}
                                    {newOrgName && filteredOrgs.length === 0 && (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 mb-2">No organization found matching "{newOrgName}"</p>
                                            <button
                                                onClick={() => setIsCreatingOrg(true)}
                                                className="text-indigo-600 font-medium hover:text-indigo-800 flex items-center justify-center mx-auto"
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Create new organization
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                    <input
                                        type="text"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        value={newOrgType}
                                        onChange={(e) => setNewOrgType(e.target.value as OrganizationType)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Employer">Employer</option>
                                        <option value="Social Service Agency">Social Service Agency</option>
                                        <option value="Training Partner">Training Partner</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setIsCreatingOrg(false)}
                                        className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={createNewOrg}
                                        disabled={loading || !newOrgName}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Creating...' : 'Create & Continue'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: What */}
                {step === 2 && (
                    <div className="p-6 flex-1 flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">What type of interaction?</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { type: 'Outreach', icon: Users, desc: 'Initial contact or follow-up' },
                                { type: 'Job Development', icon: Briefcase, desc: 'Discussing job openings' },
                                { type: 'Presentation', icon: Calendar, desc: 'Presenting our program' },
                                { type: 'Joint Training', icon: UserPlus, desc: 'Co-hosted workshop' },
                                { type: 'Case Conference', icon: Users, desc: 'Staff meeting about clients' },
                                { type: 'Other', icon: Building2, desc: 'General meeting' }
                            ].map((item) => (
                                <button
                                    key={item.type}
                                    onClick={() => { setInteractionType(item.type as EngagementType); setStep(3); }}
                                    className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group text-center"
                                >
                                    <item.icon className="h-8 w-8 text-gray-400 group-hover:text-indigo-600 mb-3" />
                                    <div className="font-medium text-gray-900">{item.type}</div>
                                    <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Details */}
                {step === 3 && (
                    <div className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900">Engagement Details</h2>

                        <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center text-sm">
                            <span className="font-medium">{selectedOrg?.name}</span>
                            <span className="text-gray-500">{interactionType}</span>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500"
                            />
                        </div>

                        {isGroupSession && (
                            <div className="space-y-4 border-l-4 border-indigo-200 pl-4 py-2 bg-indigo-50/30 rounded-r-lg">
                                <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">Group Session Info</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Title</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="e.g. Intro to Construction"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">External Attendees (Headcount)</label>
                                    <input
                                        type="number"
                                        value={externalAttendees}
                                        onChange={(e) => setExternalAttendees(Number(e.target.value))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Internal Clients Attending</label>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Search client name..."
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                            value={clientSearchTerm}
                                            onChange={(e) => setClientSearchTerm(e.target.value)}
                                        />
                                        {clientSearchTerm && (
                                            <div className="bg-white border text-sm max-h-32 overflow-y-auto rounded-md shadow-sm">
                                                {allClients.filter(c =>
                                                    `${c.profile.firstName} ${c.profile.lastName}`.toLowerCase().includes(clientSearchTerm.toLowerCase()) &&
                                                    !selectedClientIds.includes(c.id)
                                                ).map(client => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => {
                                                            setSelectedClientIds([...selectedClientIds, client.id]);
                                                            setClientSearchTerm('');
                                                        }}
                                                        className="w-full text-left p-2 hover:bg-gray-100"
                                                    >
                                                        {client.profile.firstName} {client.profile.lastName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedClientIds.map(id => {
                                                const c = allClients.find(cl => cl.id === id);
                                                return (
                                                    <span key={id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        {c?.profile.firstName} {c?.profile.lastName}
                                                        <button onClick={() => setSelectedClientIds(selectedClientIds.filter(cid => cid !== id))} className="ml-1 text-indigo-600 hover:text-indigo-900">×</button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 min-h-[100px]"
                                placeholder="What was discussed?"
                            />
                        </div>

                        {!isGroupSession && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome / Next Steps</label>
                                <textarea
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 min-h-[80px]"
                                    placeholder="Follow-up actions..."
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto flex justify-between">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="flex items-center text-gray-600 font-medium hover:text-gray-900 px-4 py-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/partners')}
                            className="flex items-center text-gray-600 font-medium hover:text-gray-900 px-4 py-2"
                        >
                            Cancel
                        </button>
                    )}

                    {step === 3 && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Finish'}
                            {!loading && <Check className="h-4 w-4 ml-2" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EngagementWizard;
