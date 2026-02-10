import React, { useState, useEffect } from 'react';
import { Organization, OrganizationType } from '../../types';
import { communityService } from '../../services/communityService';
import AddPartnerModal from './AddPartnerModal';
import NewEngagementForm from './NewEngagementForm';
import PartnerImportModal from './PartnerImportModal';
import {
    Search,
    MapPin,
    Building2,
    Briefcase,
    Plus,
    Filter,
    ExternalLink,
    Phone,
    ArrowRight,
    Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../Card';

const PartnerDirectory: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<OrganizationType | 'All'>('All');
    const [showEmployersOnly, setShowEmployersOnly] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | undefined>(undefined);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const data = await communityService.getOrganizations();
            setOrganizations(data);
        } catch (error) {
            console.error("Failed to fetch organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNewOrg = (newOrg: Organization) => {
        // Legacy handler, forwarding to generic
        handleSaveOrg(newOrg);
    };

    const handleSaveOrg = (savedOrg: Organization) => {
        if (editingOrg) {
            setOrganizations(prev => prev.map(o => o.id === savedOrg.id ? savedOrg : o));
        } else {
            setOrganizations(prev => [...prev, savedOrg]);
        }
        setIsAddModalOpen(false);
        setEditingOrg(undefined);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingOrg(undefined);
    };

    const handleEngagementSaved = () => {
        // Refresh orgs to update "Last Contact" date
        fetchOrganizations();
    };

    const filteredOrgs = organizations.filter(org => {
        const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.industry?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || org.type === filterType;
        const matchesEmployer = showEmployersOnly ? (org.type === 'Employer' && org.jobOpeningsCount > 0) : true;

        return matchesSearch && matchesType && matchesEmployer;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Community Partners</h1>
                    <p className="text-gray-500">Manage relationships with employers and service agencies.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Import CSV
                    </button>
                    <button
                        onClick={() => {
                            setEditingOrg(undefined);
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Partner
                    </button>
                </div>
            </div>

            <NewEngagementForm onSave={handleEngagementSaved} />

            <AddPartnerModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveOrg}
                organizationToEdit={editingOrg}
            />

            <PartnerImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportComplete={() => {
                    fetchOrganizations();
                    setIsImportModalOpen(false);
                }}
            />

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search partners..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as OrganizationType | 'All')}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="All">All Types</option>
                        <option value="Employer">Employer</option>
                        <option value="Social Service Agency">Social Service Agency</option>
                        <option value="Training Partner">Training Partner</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="flex items-center">
                    <input
                        id="showEmployersOnly"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        checked={showEmployersOnly}
                        onChange={(e) => setShowEmployersOnly(e.target.checked)}
                    />
                    <label htmlFor="showEmployersOnly" className="ml-2 block text-sm text-gray-900">
                        Hiring Employers Only
                    </label>
                </div>
            </div>

            {/* List Table */}
            <Card title="Partner List">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Contact</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Phone</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredOrgs.length > 0 ? (
                                filteredOrgs.map((org) => (
                                    <tr key={org.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`p-2 rounded-lg mr-3 ${org.type === 'Employer' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'}`}>
                                                    {org.type === 'Employer' ? <Briefcase className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    <button
                                                        onClick={() => {
                                                            setEditingOrg(org);
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="hover:text-indigo-600 hover:underline focus:outline-none text-left"
                                                    >
                                                        {org.name}
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.industry || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {org.contactPerson || '-'}
                                            {org.email && <div className="text-xs text-indigo-600">{org.email}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.phone || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {org.lastContactDate ? new Date(org.lastContactDate).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {/* Future: Edit/View link */}
                                            {/* <button className="text-indigo-600 hover:text-indigo-900">Edit</button> */}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-500">
                                        No partners found. Use the "Add New Partner" button to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default PartnerDirectory;
