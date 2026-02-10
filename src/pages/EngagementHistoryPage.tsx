import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { communityService } from '../services/communityService';
import { EngagementLog, Organization, EngagementType } from '../types';
import { Search, Filter, Calendar, User, Building2, Download } from 'lucide-react';
import api from '../lib/firebase';

const EngagementHistoryPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Data
    const [logs, setLogs] = useState<EngagementLog[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<EngagementType | 'All'>('All');
    const [staffSearch, setStaffSearch] = useState('');
    const [clientSearch, setClientSearch] = useState('');

    // Initial load from navigation state if present
    useEffect(() => {
        const state = location.state as { organizationId?: string } | null;
        if (state?.organizationId) {
            setSelectedOrgId(state.organizationId);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allLogs, allOrgs] = await Promise.all([
                    communityService.getAllEngagements(),
                    communityService.getOrganizations()
                ]);
                setLogs(allLogs);
                setOrganizations(allOrgs);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter Logic
    const filteredLogs = logs.filter(log => {
        // Filter by Org
        if (selectedOrgId !== 'all') {
            // Check both singular and array fields
            const matchesId = log.organizationId === selectedOrgId;
            const matchesArray = log.organizationIds?.includes(selectedOrgId);
            if (!matchesId && !matchesArray) return false;
        }

        // Filter by Type
        if (selectedType !== 'All' && log.interactionType !== selectedType) return false;

        // Filter by Staff
        if (staffSearch && !log.staffName.toLowerCase().includes(staffSearch.toLowerCase())) return false;

        // Filter by Client
        if (clientSearch) {
            const clientNames = log.clientNames?.join(' ').toLowerCase() || '';
            if (!clientNames.includes(clientSearch.toLowerCase())) return false;
        }

        return true;
    });

    const engagementTypes: EngagementType[] = ['Outreach', 'Job Development', 'Presentation', 'Joint Training', 'Case Conference', 'Other'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Engagement History</h1>
                    <p className="text-gray-500">View and filter all community partner engagements.</p>
                </div>
                {/* Placeholder for export if needed */}
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </button>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Partner Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Partner</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select
                                value={selectedOrgId}
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Partners</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Engagement Type Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Engagement Type</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value as EngagementType | 'All')}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="All">All Types</option>
                                {engagementTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Staff Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Staff Member</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search staff..."
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Client Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading engagements...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No engagements found matching your filters.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                    {/* Date & Type */}
                                    <div className="md:w-48 flex-shrink-0">
                                        <div className="flex items-center text-gray-900 font-medium">
                                            <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                                            {new Date(log.date).toLocaleDateString()}
                                        </div>
                                        <div className="mt-1 text-sm text-indigo-600 font-medium bg-indigo-50 inline-block px-2 py-0.5 rounded-full">
                                            {log.interactionType}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            {log.durationMinutes} minutes
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:justify-between mb-2">
                                            <h3 className="text-base font-semibold text-gray-900">
                                                {log.organizationNames?.join(', ') || log.organizationName || 'Unknown Partner'}
                                            </h3>
                                            <span className="text-sm text-gray-500 flex items-center mt-1 sm:mt-0">
                                                <User className="w-3 h-3 mr-1" />
                                                By {log.staffName}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600 whitespace-pre-wrap mb-2">
                                            {log.notes.replace(/<[^>]+>/g, '')}
                                        </div>

                                        {/* Meta: Clients / Contact */}
                                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
                                            {log.clientNames && log.clientNames.length > 0 && (
                                                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                                                    <span className="font-medium mr-1">Clients:</span>
                                                    {log.clientNames.join(', ')}
                                                </div>
                                            )}
                                            {log.contactName && (
                                                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                                                    <span className="font-medium mr-1">Contact:</span>
                                                    {log.contactName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && filteredLogs.length > 0 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
                        Showing {filteredLogs.length} results
                    </div>
                )}
            </div>
        </div>
    );
};

export default EngagementHistoryPage;
