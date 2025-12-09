import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowRight, User, Calendar, Circle, AlertTriangle, Flame } from 'lucide-react';
import api from '../lib/firebase';
import Card from '../components/Card';
import AddClientModal from '../components/AddClientModal';
import { useAuth } from '../context/AuthContext';
import { Client, Task, User as AppUser } from '../types';

const UrgencyBadge: React.FC<{ urgency: Task['urgency'] }> = ({ urgency }) => {
  const urgencyConfig = {
    Green: {
      styles: 'bg-green-100 text-green-800',
      icon: <Circle className="h-3 w-3 mr-1.5" />,
      text: 'Normal'
    },
    Yellow: {
      styles: 'bg-yellow-100 text-yellow-800',
      icon: <AlertTriangle className="h-3 w-3 mr-1.5" />,
      text: 'Medium'
    },
    Red: {
      styles: 'bg-red-100 text-red-800',
      icon: <Flame className="h-3 w-3 mr-1.5" />,
      text: 'High'
    },
  };
  const config = urgencyConfig[urgency];
  return (
    <span className={`px-2.5 py-1 inline-flex items-center text-xs leading-4 font-semibold rounded-full ${config.styles}`}>
      {config.icon}
      {config.text}
    </span>
  );
};

const TaskStatusBadge: React.FC<{ status: Task['status'] }> = ({ status }) => {
  const styles = {
    'Open': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Waiting': 'bg-gray-100 text-gray-800',
    'Completed': 'bg-green-100 text-green-800',
  };
  return <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${styles[status]}`}>{status}</span>
};

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
  const [tasks, setTasks] = useState<Task[]>([]);
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
    const fetchStaffAndTasks = async () => {
      if (user) {
        try {
          const [tasksData, staffData] = await Promise.all([
            api.getTasksByUserId(user.uid),
            api.getStaffUsers()
          ]);

          setStaff(staffData);

          // Sort by due date (soonest first)
          tasksData.sort((a, b) => a.dueDate - b.dueDate);

          setTasks(tasksData);

        } catch (error) {
          console.error("Failed to fetch staff or tasks:", error);
        }
      }
    };
    fetchStaffAndTasks();
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List */}
          <div className="lg:col-span-2">
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

          {/* My Tasks */}
          <div className="lg:col-span-1">
            <Card title="To-Do Tasks">
              <div className="space-y-3">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/clients/${task.clientId}`)}
                    className="p-3 bg-white rounded-md border border-gray-200 hover:border-gray-300 group cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-[#404E3B]">{task.title}</p>
                        <p className="text-sm text-gray-500 flex items-center mt-1"><User className="h-4 w-4 mr-1.5" />{task.clientName}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#404E3B] transition-transform transform group-hover:translate-x-1 ml-2 flex-shrink-0" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-red-600 flex items-center"><Calendar className="h-4 w-4 mr-1.5" />Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                      <div className="flex items-center space-x-2">
                        <TaskStatusBadge status={task.status} />
                        <UrgencyBadge urgency={task.urgency} />
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No open tasks assigned to you.</p>}
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