import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/mockApi';
import { Client, Task, CaseNote } from '../types';
import { useAuth } from '../context/AuthContext';
import { Search, User, Calendar, ArrowRight, Plus, Flame, AlertTriangle, Circle } from 'lucide-react';
import Card from '../components/Card';
import AddClientModal from '../components/AddClientModal';

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
        <span className={`px-2.5 py-1 inline-flex items-center text-xs font-medium rounded-full ${config.styles}`}>
            {config.icon}
            {config.text}
        </span>
    );
};

const ClientTypeBadge: React.FC<{ clientType: Client['metadata']['clientType'] }> = ({ clientType }) => {
    const styles = {
        'General Population': 'bg-purple-100 text-purple-800',
        'CHYBA': 'bg-teal-100 text-teal-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[clientType]}`}>{clientType}</span>
};

const StatusBadge: React.FC<{ status: Client['metadata']['status'] }> = ({ status }) => {
    const styles = {
        'Prospect': 'bg-blue-100 text-blue-800',
        'Active': 'bg-green-100 text-green-800',
        'Inactive': 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>
};

const TaskStatusBadge: React.FC<{ status: Task['status'] }> = ({ status }) => {
    const statusConfig: { [key in Task['status']]: { styles: string, text: string } } = {
        Open: { styles: 'bg-blue-100 text-blue-800', text: 'Open' },
        'In Progress': { styles: 'bg-purple-100 text-purple-800', text: 'In Progress' },
        Waiting: { styles: 'bg-yellow-100 text-yellow-800', text: 'Waiting' },
        Completed: { styles: 'bg-green-100 text-green-800', text: 'Completed' },
    };
    const config = statusConfig[status];
    return (
        <span className={`px-2.5 py-1 inline-flex items-center text-xs font-medium rounded-full ${config.styles}`}>
            {config.text}
        </span>
    );
};


const HomePage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [adminFilter, setAdminFilter] = useState('All');
  const [mostRecentCaseNoteFilterDays, setMostRecentCaseNoteFilterDays] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!user) return;
        const [clientsData, tasksData, adminsData, caseNotesData] = await Promise.all([
          api.getClients(),
          api.getTasksByAssigneeId(user!.uid),
          api.getAdmins(),
          api.getAllCaseNotes()
        ]);
        setClients(clientsData);
        setTasks(tasksData.filter(t => t.status !== 'Completed'));
        setAdmins(adminsData);
        setCaseNotes(caseNotesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleClientAdded = (newClient: Client) => {
    setClients(prevClients => [newClient, ...prevClients].sort((a,b) => a.profile.lastName.localeCompare(b.profile.lastName)));
    setIsAddModalOpen(false);
  };

  const mostRecentCaseNoteMap = useMemo(() => {
    const map = new Map<string, number>();
    caseNotes
      .filter(note => note.noteType === 'Case Note') // Explicitly filter for Case Notes
      .forEach(note => {
        const existingDate = map.get(note.clientId);
        if (!existingDate || note.noteDate > existingDate) {
          map.set(note.clientId, note.noteDate);
        }
      });
    return map;
  }, [caseNotes]);

  const filteredClients = useMemo(() => {
    const filterDaysNum = parseInt(mostRecentCaseNoteFilterDays, 10);
    const hasCaseNoteFilter = !isNaN(filterDaysNum) && filterDaysNum >= 0;

    return clients.filter(client => {
      const nameOrEmailMatch = !searchTerm ||
        `${client.profile.firstName} ${client.profile.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contactInfo.email.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = statusFilter === 'All' || client.metadata.status === statusFilter;

      const adminMatch = adminFilter === 'All' || client.metadata.assignedAdminName === adminFilter;

      const mostRecentCaseNoteMatch = (() => {
        if (!hasCaseNoteFilter) {
          return true; // No filter active, so it's a match
        }

        const lastNoteDate = mostRecentCaseNoteMap.get(client.id);

        if (!lastNoteDate) {
          return true; // Client has no case notes, so they match "no notes within X days"
        }

        const now = Date.now();
        const daysSinceLastNote = (now - lastNoteDate) / (1000 * 60 * 60 * 24);
        
        // Match if the last note is older than the filter days
        return daysSinceLastNote > filterDaysNum;
      })();
      
      return nameOrEmailMatch && statusMatch && adminMatch && mostRecentCaseNoteMatch;
    });
  }, [clients, searchTerm, statusFilter, adminFilter, mostRecentCaseNoteFilterDays, mostRecentCaseNoteMap]);

  const clientStatuses = useMemo(() => ['All', 'Prospect', 'Active', 'Inactive'], []);

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List View */}
          <div className="lg:col-span-2">
            <Card 
              title="Client List"
              titleAction={
                user?.role === 'admin' && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53]"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Add Client
                  </button>
                )
              }
            >
              <div className="p-4 rounded-t-lg border-b border-[#d1d1d1]">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-[#404E3B] focus:border-[#404E3B]"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#404E3B] focus:border-[#404E3B]">
                      {clientStatuses.map(status => <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>)}
                    </select>
                    <select value={adminFilter} onChange={e => setAdminFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#404E3B] focus:border-[#404E3B]">
                      <option value="All">All Case Managers</option>
                      {admins.map(admin => <option key={admin.id} value={admin.name}>{admin.name}</option>)}
                    </select>
                    <input
                      type="number"
                      placeholder="Days since last case note"
                      value={mostRecentCaseNoteFilterDays}
                      onChange={(e) => setMostRecentCaseNoteFilterDays(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#404E3B] focus:border-[#404E3B]"
                      min="0"
                    />
                  </div>
                </form>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#d1d1d1]">
                  <thead className="bg-[#f2f2f2]">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case Manager</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Most Recent Case Note</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#E6E6E6] divide-y divide-[#d1d1d1]">
                    {filteredClients.map(client => (
                      <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="hover:bg-[#f2f2f2] cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-800">{`${client.profile.firstName} ${client.profile.lastName}`}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.metadata.assignedAdminName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {client.metadata.status !== 'Prospect' && <ClientTypeBadge clientType={client.metadata.clientType} />}
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <StatusBadge status={client.metadata.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          { mostRecentCaseNoteMap.has(client.id) ? new Date(mostRecentCaseNoteMap.get(client.id)!).toLocaleDateString() : 'N/A' }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.contactInfo.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          
          {/* My To Do List */}
          <div className="lg:col-span-1">
            <Card title="To-Do Tasks">
              <div className="space-y-4">
                {tasks.sort((a,b) => a.dueDate - b.dueDate).map(task => (
                  <div key={task.id} onClick={() => navigate(`/clients/${task.clientId}`)} className="p-4 rounded-lg border border-[#d1d1d1] hover:bg-[#f2f2f2] cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-[#404E3B]">{task.title}</p>
                        <p className="text-sm text-gray-500 flex items-center mt-1"><User className="h-4 w-4 mr-1.5"/>{task.clientName}</p>
                      </div>
                       <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#404E3B] transition-transform transform group-hover:translate-x-1 ml-2 flex-shrink-0" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-red-600 flex items-center"><Calendar className="h-4 w-4 mr-1.5"/>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
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
            onSave={handleClientAdded}
            admins={admins}
        />
      )}
    </>
  );
};

export default HomePage;
