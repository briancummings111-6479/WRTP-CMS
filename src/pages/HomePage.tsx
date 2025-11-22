
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
  const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- UPDATED: Switched to Firebase real-time listener ---
  useEffect(() => {
    setLoading(true);
    // api.getClients() now returns an 'unsubscribe' function.
    // This listener will update the 'clients' state in real-time.
    const unsubscribe = api.getClients((fetchedClients: Client[]) => {
      setClients(fetchedClients);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array means this runs once on mount
  // --------------------------------------------------------

  // This fetch for Admins and Tasks can remain the same for now
  useEffect(() => {
    const fetchAdminsAndTasks = async () => {
      if (user) {
        try {
          // We use the real api for getAdmins, but getTasksByClientId is still a placeholder
          const [adminsData, tasksData] = await Promise.all([
            api.getAdmins(),
            api.getTasksByClientId('all') // This will use the placeholder in firebase.ts
          ]);
          setAdmins(adminsData || []);

          // Filter tasks for the current user
          const userTasks = (tasksData || []).filter(
            (task: Task) => task.assignedToId === user.uid && task.status !== 'Completed'
          );
          setTasks(userTasks);

        } catch (error) {
          console.error("Failed to fetch admins or tasks:", error);
        }
      }
    };
    fetchAdminsAndTasks();
  }, [user]); // Runs when user object is available

  const handleSaveNewClient = (newClient: Client) => {
    // This is now an optimistic update, as the listener will catch the "real" update
    // We don't even need this line, but it makes the UI feel faster
    setClients(prevClients => [newClient, ...prevClients]);
    setIsAddModalOpen(false);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      `${client.profile.firstName} ${client.profile.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactInfo.phone.includes(searchTerm) ||
      client.metadata.assignedAdminName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  return (
    // --- FIX: Added opening React Fragment tag ---
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Client Dashboard</h1>
          {/* --- STEP 3: Admin role check RESTORED --- */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Client
            </button>
          )}
          {/* ------------------------------------------- */}
        </div>

        {/* Client List */}
        <Card>
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, phone, or case manager..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case Manager</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading clients...</td></tr>
                ) : filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{client.profile.firstName} {client.profile.lastName}</div>
                        <div className="text-sm text-gray-500">{client.metadata.clientType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.contactInfo.phone}</div>
                        <div className="text-sm text-gray-500">{client.contactInfo.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.metadata.assignedAdminName || 'Unassigned'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ClientStatusBadge status={client.metadata.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">
                    No clients found.
                    {/* --- UPDATED: Friendly message for empty Firebase --- */}
                    {clients.length === 0 && !loading && ' Click "Add Client" to create your first real client.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* My Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6"> {/* Was md:grid-cols-2 */}
          <div className="md:col-span-1"> {/* Was md:col-span-1 */}
            <Card title="My Open Tasks">
              <div className="space-y-3">
                {/* This task logic will fail until we migrate tasks, but won't crash */}
                {tasks.map(task => (
                  <div key={task.id} className="p-3 bg-white rounded-md border border-gray-200 hover:border-gray-300 group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p onClick={() => navigate(`/clients/${task.clientId}`)} className="text-sm font-medium text-gray-800 hover:underline cursor-pointer group-hover:text-[#404E3B]">{task.title}</p>
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
      {/* --- STEP 3: Admin role check RESTORED --- */}
      {user?.role === 'admin' && (
        <AddClientModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveNewClient}
          admins={admins}
        />
      )}
      {/* ------------------------------------------- */}
    </>
  );
};

export default HomePage;