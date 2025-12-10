import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowRight } from 'lucide-react';
import api from '../lib/firebase';
import Card from '../components/Card';
import AddClientModal from '../components/AddClientModal';
import { useAuth } from '../context/AuthContext';
import { Client, User as AppUser } from '../types';

const ClientStatusBadge: React.FC<{ status: Client['metadata']['status'] }> = ({ status }) => {
  const styles = {
    'Prospect': 'bg-blue-100 text-blue-800',
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-yellow-100 text-yellow-800',
  };
  return <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>
};

const HomePage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [caseManagerFilter, setCaseManagerFilter] = useState('All Case Managers');
  const [daysSinceNoteFilter, setDaysSinceNoteFilter] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const fetchedClients = await api.getClients();
        fetchedClients.sort((a, b) => a.profile.lastName.localeCompare(b.profile.lastName));
        setClients(fetchedClients);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const fetchStaff = async () => {
      if (user) {
        try {
          const staffData = await api.getStaffUsers();
          setStaff(staffData);
        } catch (error) {
          console.error("Failed to fetch staff:", error);
        }
      }
    };
    fetchStaff();
  }, [user]);

  const handleSaveNewClient = (newClient: Client) => {
    setClients(prevClients => [newClient, ...prevClients]);
    setIsAddModalOpen(false);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = `${client.profile.firstName} ${client.profile.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contactInfo.phone.includes(searchTerm) ||
        client.contactInfo.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.metadata.assignedAdminName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All Statuses' || client.metadata.status === statusFilter;

      const matchesManager = caseManagerFilter === 'All Case Managers' || client.metadata.assignedAdminId === caseManagerFilter;

      let matchesDaysSinceNote = true;
      if (daysSinceNoteFilter) {
        const daysThreshold = parseInt(daysSinceNoteFilter, 10);
        if (!isNaN(daysThreshold)) {
          if (!client.metadata.lastCaseNoteDate) {
            // If no note exists, it's been "infinite" days, so it matches if we are looking for > X days
            matchesDaysSinceNote = true;
          } else {
            const diffTime = Math.abs(Date.now() - client.metadata.lastCaseNoteDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            matchesDaysSinceNote = diffDays >= daysThreshold;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesManager && matchesDaysSinceNote;
    });
  }, [clients, searchTerm, statusFilter, caseManagerFilter, daysSinceNoteFilter]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Client
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Client List */}
          <div className="w-full">
            <Card title="Client List">
              <div className="p-4 border-b border-gray-200 space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <select
                    value={caseManagerFilter}
                    onChange={(e) => setCaseManagerFilter(e.target.value)}
                    className="block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                  >
                    <option value="All Case Managers">All Case Managers</option>
                    {staff.map(s => (
                      <option key={s.uid} value={s.uid}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Days since last case note"
                    value={daysSinceNoteFilter}
                    onChange={(e) => setDaysSinceNoteFilter(e.target.value)}
                    className="block w-full sm:w-1/3 pl-3 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case Manager</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Most Recent Case Note</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading clients...</td></tr>
                    ) : filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="hover:bg-gray-50 cursor-pointer">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{client.profile.firstName} {client.profile.lastName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.metadata.assignedAdminName || 'Unassigned'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.metadata.clientType}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <ClientStatusBadge status={client.metadata.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {client.metadata.lastCaseNoteDate ? new Date(client.metadata.lastCaseNoteDate).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.contactInfo.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} className="p-4 text-center text-gray-500">
                        No clients found matching your filters.
                        {clients.length === 0 && !loading && ' Click "Add Client" to create your first real client.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
      {user?.role === 'admin' && (
        <AddClientModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveNewClient}
          staff={staff}
        />
      )}
    </>
  );
};

export default HomePage;