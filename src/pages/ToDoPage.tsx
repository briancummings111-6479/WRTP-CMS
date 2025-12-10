import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/firebase';
import { Task, User as AppUser } from '../types';
import Card from '../components/Card';
import TaskItem from '../components/Tasks/TaskItem';
import AddEditTaskModal from '../components/Tasks/AddEditTaskModal';
import { Bell } from 'lucide-react';

const ToDoPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [staff, setStaff] = useState<AppUser[]>([]); // For refreshing tasks or task details if needed
    const [loading, setLoading] = useState(true);

    // Filters
    const [serviceTypeFilter, setServiceTypeFilter] = useState('All Types');
    const [statusFilter, setStatusFilter] = useState('All Open'); // Default to All Open (Active)
    const [urgencyFilter, setUrgencyFilter] = useState('All Urgencies');

    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                try {
                    const [tasksData, staffData] = await Promise.all([
                        api.getTasksByUserId(user.uid),
                        api.getStaffUsers()
                    ]);
                    // Sort by due date
                    tasksData.sort((a, b) => a.dueDate - b.dueDate);
                    setTasks(tasksData);
                    setStaff(staffData);
                } catch (error) {
                    console.error("Failed to fetch tasks:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesServiceType = serviceTypeFilter === 'All Types' || task.serviceType === serviceTypeFilter;

            let matchesStatus = true;
            if (statusFilter === 'All Open') {
                matchesStatus = task.status !== 'Completed';
            } else {
                matchesStatus = statusFilter === 'All Statuses' || task.status === statusFilter;
            }

            const matchesUrgency = urgencyFilter === 'All Urgencies' || task.urgency === urgencyFilter;

            return matchesServiceType && matchesStatus && matchesUrgency;
        });
    }, [tasks, serviceTypeFilter, statusFilter, urgencyFilter]);

    const handleEditTask = (task: Task) => {
        setTaskToEdit(task);
        setIsEditModalOpen(true);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            try {
                await api.deleteTask(taskId);
                setTasks(prev => prev.filter(t => t.id !== taskId));
            } catch (error) {
                console.error("Failed to delete task", error);
            }
        }
    };

    const handleSaveTask = (savedTask: Task) => {
        // Update local state
        setTasks(prev => {
            const idx = prev.findIndex(t => t.id === savedTask.id);
            if (idx >= 0) {
                const newTasks = [...prev];
                newTasks[idx] = savedTask;
                return newTasks.sort((a, b) => a.dueDate - b.dueDate);
            }
            return [...prev, savedTask].sort((a, b) => a.dueDate - b.dueDate);
        });
        setIsEditModalOpen(false);
        setTaskToEdit(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">To-Do Tasks</h1>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column: 2/3 */}
                <div className="lg:w-2/3 space-y-4">

                    {/* Filters */}
                    <Card>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                                <select
                                    value={serviceTypeFilter}
                                    onChange={e => setServiceTypeFilter(e.target.value)}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                                >
                                    <option value="All Types">All Types</option>
                                    <option>Job Search</option>
                                    <option>Supportive Service</option>
                                    <option>Training</option>
                                    <option>Intake Meeting</option>
                                    <option>ISP Review</option>
                                    <option>General Check-in</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                                >
                                    <option value="All Open">All Open (Active)</option>
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Waiting">Waiting</option>
                                    <option value="Completed">Completed</option>
                                    <option value="All Statuses">All Statuses</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                                <select
                                    value={urgencyFilter}
                                    onChange={e => setUrgencyFilter(e.target.value)}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                                >
                                    <option value="All Urgencies">All Urgencies</option>
                                    <option value="Green">Green (Normal)</option>
                                    <option value="Yellow">Yellow (Medium)</option>
                                    <option value="Red">Red (High)</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Task List */}
                    <Card title="My Tasks">
                        <div className="p-4 space-y-3">
                            {loading ? (
                                <div className="text-center py-4 text-gray-500">Loading tasks...</div>
                            ) : filteredTasks.length > 0 ? (
                                filteredTasks.map(task => (
                                    <div key={task.id} onClick={() => navigate(`/clients/${task.clientId}`)} className="cursor-pointer group">
                                        {/* Wrapping TaskItem to add navigation, assuming clicking the row usually navigates. 
                                            TaskItem itself has stopPropagation on buttons.
                                            However TaskItem styles specifically handle hover etc. 
                                            Ideally TaskItem should handle the click or be wrapped. 
                                            I'll wrap it in a div that handles click, but TaskItem has its own styling.
                                            Let's just place TaskItem. TaskItem handles Edit/Delete events.
                                            If I want navigation, I need to pass it or wrap it.
                                            The rendered TaskItem is a div.
                                         */}
                                        <div className="relative">
                                            <TaskItem
                                                task={task}
                                                onEdit={handleEditTask}
                                                onDelete={handleDeleteTask}
                                            />
                                            {/* Overlay for click to navigate? Or just rely on user knowing? 
                                                The Home page had navigation. I should probably add it.
                                                But TaskItem stops propagation on buttons. 
                                                If I wrap TaskItem in a div with onClick, it should work as long as buttons stop prop.
                                                TaskItem.tsx:
                                                `return (<div className="...">...</div>)`
                                                I can't pass onClick to TaskItem unless I modify it.
                                                I'll just wrap it.
                                            */}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No tasks match your filters.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column: 1/3 */}
                <div className="lg:w-1/3">
                    <Card title="Notifications">
                        <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center min-h-[200px]">
                            <Bell className="h-10 w-10 text-gray-300 mb-3" />
                            <p>No new notifications.</p>
                            <p className="text-xs text-gray-400 mt-1">Notifications will appear here later.</p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            {taskToEdit && (
                <AddEditTaskModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveTask}
                    taskToEdit={taskToEdit}
                    clientId={taskToEdit.clientId}
                    clientName={taskToEdit.clientName}
                    admins={staff.map(s => ({ id: s.uid, name: s.name }))}
                />
            )}
        </div>
    );
};

export default ToDoPage;
