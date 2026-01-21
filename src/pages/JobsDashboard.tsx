import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { defaultDemographics } from '../lib/firebase';
import { Client, Task, User as AppUser, ClientAttachment, ISP, Workshop } from '../types';
import { Search, Filter, ExternalLink, FileText, CheckCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WorkshopStatus {
    CE: boolean; // Career Explorations
    JR: boolean; // Job Readiness (Preparedness)
    IS: boolean; // Interview Success
    FL: boolean; // Financial Literacy
}

interface JobClient extends Client {
    cmName: string;
    industry: string;
    jobType: string;
    desiredWage: string;
    resumeUrl: string | null;
    status: 'Searching' | 'Interviewing' | 'Offer Received' | 'Hired' | 'Not Searching' | 'Unknown';
    lastCheckInDate: number | null; // Timestamp for sorting
    lastCheckInLabel: string; // "Overdue" or date string
    tasks: Task[];
    workshops: WorkshopStatus;
    isp?: ISP;
}

type SortConfig = {
    key: keyof JobClient | 'lastCheckInDate';
    direction: 'asc' | 'desc';
};

const JobsDashboard: React.FC = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState<JobClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [industryFilter, setIndustryFilter] = useState('All Industries');
    const [statusFilter, setStatusFilter] = useState('Searching');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastCheckInDate', direction: 'desc' });

    // Editable State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null); // 'industry', 'jobType', 'wage'
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allClients, allTasks, allWorkshops] = await Promise.all([
                api.getClients(),
                api.getTasks(),
                api.getAllWorkshops()
            ]);

            const processedClients: JobClient[] = await Promise.all(allClients.map(async (client) => {
                // 1. Tasks
                const clientTasks = allTasks.filter(t => t.clientId === client.id && t.status !== 'Completed');

                // 2. Attachments
                const attachments = await api.getAttachmentsByClientId(client.id);
                const resume = attachments.find(a =>
                    a.fileName.toLowerCase().includes('resume') ||
                    (a.category && a.category === 'Resume')
                );

                // 3. ISP
                const isp = await api.getISPByClientId(client.id);

                // 4. Industry Inference
                let industry = client.demographics?.jobInterests || '';
                if (!industry) {
                    if (client.training?.constructionCTE) industry = 'Construction';
                    else if (client.training?.cosmetologyCTE) industry = 'Cosmetology';
                    else if (client.training?.culinaryCTE) industry = 'Culinary';
                    else if (client.training?.fireCTE) industry = 'Fire';
                    else if (client.training?.medicalCTE) industry = 'Medical';
                    else if (client.training?.earlyChildhoodEducationCTE) industry = 'ECE';
                    else if (client.training?.entrepreneurshipCTE) industry = 'Entrepreneurship';
                }
                if (industry.includes(',')) {
                    industry = industry.split(',')[0].trim();
                }
                if (!industry && isp && isp.longTermGoals) {
                    industry = "See ISP";
                }
                if (!industry) industry = "Unknown";


                // 5. Job Type 
                let jobType = client.demographics?.desiredJobType || 'Any';
                if (jobType === 'Any' && client.demographics?.jobInterests) {
                    const interestString = client.demographics.jobInterests.toLowerCase();
                    if (interestString.includes('part-time') || interestString.includes('part time')) jobType = 'Part-time';
                    else if (interestString.includes('full-time') || interestString.includes('full time')) jobType = 'Full-time';
                }

                // 6. Wage
                const desiredWage = client.demographics?.desiredWage || "$ --";

                // 7. Status Mapping
                let status: JobClient['status'] = client.demographics?.jobSearchStatus || 'Unknown';
                if (status === 'Unknown') {
                    if (client.metadata.status === 'Inactive') status = 'Hired';
                    else status = 'Searching';
                }

                // 8. Last Check-in
                const lastNoteDate = client.metadata.lastCaseNoteDate;
                let lastCheckInLabel = "Never";
                let lastCheckInDate: number | null = lastNoteDate || 0;

                if (lastNoteDate) {
                    const daysAgo = Math.floor((Date.now() - lastNoteDate) / (1000 * 60 * 60 * 24));
                    if (daysAgo > 14) lastCheckInLabel = "Overdue";
                    else lastCheckInLabel = `${daysAgo} days ago`;
                }

                // 9. Workshops Status
                const clientWorkshops = allWorkshops.filter(w => w.clientId === client.id && w.status === 'Completed');
                const workshops: WorkshopStatus = {
                    CE: clientWorkshops.some(w => w.workshopName === 'Career Explorations'),
                    JR: clientWorkshops.some(w => w.workshopName === 'Job Preparedness'),
                    IS: clientWorkshops.some(w => w.workshopName === 'Interview Success'),
                    FL: clientWorkshops.some(w => w.workshopName === 'Financial Literacy'),
                };

                return {
                    ...client,
                    cmName: client.metadata.assignedAdminName || 'Unassigned',
                    industry,
                    jobType,
                    desiredWage,
                    resumeUrl: resume ? resume.storageUrl : null,
                    status,
                    lastCheckInDate,
                    lastCheckInLabel,
                    tasks: clientTasks,
                    workshops,
                    isp: isp || undefined
                };
            }));

            // Filter out inactive unless they are explicitly Hired/Searching via new status
            setClients(processedClients.filter(c => c.metadata.status !== 'Inactive' || c.status === 'Hired'));
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Edit Handlers ---
    const startEditing = (id: string, field: string, currentValue: string) => {
        setEditingId(id);
        setEditingField(field);
        setEditValue(currentValue);
    };

    const saveEdit = async (client: JobClient) => {
        if (!editingField) return;

        try {
            // Optimistic Update
            setClients(prev => prev.map(c => {
                if (c.id === client.id) {
                    return { ...c, [editingField]: editValue };
                }
                return c;
            }));

            // Update DB
            const updatedDemographics = {
                ...(client.demographics || defaultDemographics),
            };

            if (editingField === 'industry') updatedDemographics.jobInterests = editValue;
            if (editingField === 'jobType') updatedDemographics.desiredJobType = editValue as any;
            if (editingField === 'desiredWage') updatedDemographics.desiredWage = editValue;
            if (editingField === 'status') updatedDemographics.jobSearchStatus = editValue as any;

            const cleanClient: Client = {
                id: client.id,
                profile: client.profile,
                contactInfo: client.contactInfo,
                referralSource: client.referralSource,
                auditChecklist: client.auditChecklist,
                training: client.training,
                demographics: updatedDemographics,
                metadata: client.metadata,
                participantId: client.participantId,
                googleDriveLink: client.googleDriveLink
            };

            await api.updateClient(cleanClient);
            setEditingId(null);
            setEditingField(null);

        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save changes.");
            fetchData(); // Revert
        }
    };

    const handleStatusChange = async (client: JobClient, newStatus: string) => {
        try {
            setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: newStatus as any } : c));
            const updatedDemographics = {
                ...(client.demographics || defaultDemographics),
                jobSearchStatus: newStatus as any
            };
            const cleanClient: Client = {
                id: client.id,
                profile: client.profile,
                contactInfo: client.contactInfo,
                referralSource: client.referralSource,
                auditChecklist: client.auditChecklist,
                training: client.training,
                demographics: updatedDemographics,
                metadata: client.metadata,
                participantId: client.participantId,
                googleDriveLink: client.googleDriveLink
            };
            await api.updateClient(cleanClient);
        } catch (err) {
            console.error(err);
        }
    };


    // --- Sorting ---
    const handleSort = (key: SortConfig['key']) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    // --- Rendering Helpers ---
    const getSortedClients = () => {
        let filtered = clients.filter(client => {
            const matchesSearch = (client.profile.firstName + ' ' + client.profile.lastName).toLowerCase().includes(searchTerm.toLowerCase());
            const matchesIndustry = industryFilter === 'All Industries' || client.industry.toLowerCase().includes(industryFilter.toLowerCase());
            const matchesStatus = statusFilter === 'All Statuses' || client.status === statusFilter;
            return matchesSearch && matchesIndustry && matchesStatus;
        });

        return filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === bValue) return 0;
            // Handle null/undefined 
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (sortConfig.direction === 'asc') return aValue > bValue ? 1 : -1;
            else return aValue < bValue ? 1 : -1;
        });
    };

    const industries = Array.from(new Set(clients.map(c => c.industry))).filter(i => i !== 'Unknown').sort();

    const renderWorkshopIcon = (completed: boolean) => {
        return completed ? <Check className="w-5 h-5 text-green-500 font-bold" /> : <X className="w-5 h-5 text-red-500/50" />;
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="p-6 max-w-[1600px] mx-auto bg-[#F4F7F6] min-h-screen font-sans">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#404E3B] mb-2">Jobs Dashboard</h1>
                    <p className="text-gray-500">Active placement tracking and strategic intervention metrics.</p>
                </div>
                <div className="flex space-x-4 bg-white p-2 rounded-lg shadow-sm">
                    <div className="px-6 py-2 border-r border-gray-100 text-center">
                        <div className="text-2xl font-bold text-blue-600">{clients.filter(c => c.status === 'Searching').length}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Searching</div>
                    </div>
                    <div className="px-6 py-2 border-r border-gray-100 text-center">
                        <div className="text-2xl font-bold text-purple-600">{clients.filter(c => c.status === 'Interviewing').length}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Interviews</div>
                    </div>
                    <div className="px-6 py-2 text-center">
                        <div className="text-2xl font-bold text-green-600">{clients.filter(c => c.status === 'Hired').length}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Hired (Active)</div>
                    </div>
                </div>
            </div>

            <div className="bg-[#5a6e69] p-4 rounded-lg shadow-sm mb-6 flex space-x-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Find Participant by Name..."
                        className="w-full pl-10 pr-4 py-2 rounded shadow-inner focus:outline-none focus:ring-2 focus:ring-[#829b96]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-2 bg-white rounded px-3 py-2">
                    <Filter className="text-gray-400 h-4 w-4" />
                    <select
                        className="bg-transparent focus:outline-none text-sm text-gray-700"
                        value={industryFilter}
                        onChange={(e) => setIndustryFilter(e.target.value)}
                    >
                        <option>All Industries</option>
                        {industries.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded px-3 py-2">
                    <select
                        className="bg-transparent focus:outline-none text-sm text-gray-700"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option>All Statuses</option>
                        <option value="Searching">Searching</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Offer Received">Offer Received</option>
                        <option value="Hired">Hired</option>
                        <option value="Not Searching">Not Searching</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100 table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-1/5">Participant</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-1/6">Employment Industry</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-24">FT / PT</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-32">Min Desired Wage</th>

                            {/* Workshops Column Header */}
                            <th className="px-2 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-40">
                                <div className="flex flex-col items-center">
                                    <span>Workshops</span>
                                    <div className="flex space-x-3 mt-1 text-[10px] text-gray-300">
                                        <span>CE</span>
                                        <span>JR</span>
                                        <span>IS</span>
                                        <span>FL</span>
                                    </div>
                                </div>
                            </th>

                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-24">Resume</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-32">Status</th>
                            <th
                                className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 flex items-center w-32"
                                onClick={() => handleSort('lastCheckInDate')}
                            >
                                Last Check-in
                                {sortConfig.key === 'lastCheckInDate' && (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {getSortedClients().map(client => (
                            <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <Link to={`/clients/${client.id}`} className="font-bold text-gray-800 text-base hover:text-blue-600">
                                            {client.profile.firstName} {client.profile.lastName}
                                        </Link>
                                        <span className="text-xs text-gray-400 italic">CM: {client.cmName}</span>
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    {editingId === client.id && editingField === 'industry' ? (
                                        <input
                                            autoFocus
                                            className="border-b border-blue-500 focus:outline-none w-full text-sm"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveEdit(client)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(client)}
                                        />
                                    ) : (
                                        <div onClick={() => startEditing(client.id, 'industry', client.industry)} className="cursor-pointer group">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100 group-hover:bg-blue-100">
                                                {client.industry}
                                            </span>
                                        </div>
                                    )}
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {editingId === client.id && editingField === 'jobType' ? (
                                        <select
                                            autoFocus
                                            className="border-b border-blue-500 focus:outline-none w-full text-sm py-1"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveEdit(client)}
                                        >
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                            <option value="Both">Both</option>
                                            <option value="Any">Any</option>
                                        </select>
                                    ) : (
                                        <div onClick={() => startEditing(client.id, 'jobType', client.jobType)} className="cursor-pointer hover:text-blue-600 border-b border-transparent hover:border-blue-300 inline-block">
                                            {client.jobType}
                                        </div>
                                    )}
                                </td>

                                <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                    {editingId === client.id && editingField === 'desiredWage' ? (
                                        <input
                                            autoFocus
                                            className="border-b border-blue-500 focus:outline-none w-full text-sm"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveEdit(client)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(client)}
                                        />
                                    ) : (
                                        <div onClick={() => startEditing(client.id, 'desiredWage', client.desiredWage)} className="cursor-pointer hover:text-blue-600 border-b border-transparent hover:border-blue-300 inline-block">
                                            {client.desiredWage}
                                        </div>
                                    )}
                                </td>

                                {/* Workshop Icons */}
                                <td className="px-2 py-4">
                                    <div className="flex justify-center space-x-3">
                                        <div title="Career Explorations">{renderWorkshopIcon(client.workshops.CE)}</div>
                                        <div title="Job Preparedness">{renderWorkshopIcon(client.workshops.JR)}</div>
                                        <div title="Interview Success">{renderWorkshopIcon(client.workshops.IS)}</div>
                                        <div title="Financial Literacy">{renderWorkshopIcon(client.workshops.FL)}</div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                    {client.resumeUrl ? (
                                        <a href={client.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 hover:text-green-700 text-xs font-bold">
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            READY
                                        </a>
                                    ) : (
                                        <span className="flex items-center text-orange-400 text-xs font-bold">
                                            <Clock className="h-4 w-4 mr-1" />
                                            MISSING
                                        </span>
                                    )}
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="relative group">
                                        <select
                                            className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-bold cursor-pointer focus:outline-none
                                                ${client.status === 'Searching' ? 'bg-blue-100 text-blue-800' :
                                                    client.status === 'Interviewing' ? 'bg-purple-100 text-purple-800' :
                                                        client.status === 'Hired' ? 'bg-green-100 text-green-800' :
                                                            client.status === 'Offer Received' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                }`}
                                            value={client.status}
                                            onChange={(e) => handleStatusChange(client, e.target.value)}
                                        >
                                            <option value="Searching">Searching</option>
                                            <option value="Interviewing">Interviewing</option>
                                            <option value="Offer Received">Offer Received</option>
                                            <option value="Hired">Hired</option>
                                            <option value="Not Searching">Not Searching</option>
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-current pointer-events-none opacity-50" />
                                    </div>
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                    <span className={`${client.lastCheckInLabel === 'Overdue' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                        {client.lastCheckInLabel}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {getSortedClients().length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        No clients found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobsDashboard;
