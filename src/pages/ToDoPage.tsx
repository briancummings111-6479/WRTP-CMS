import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/firebase';
import { Task, User as AppUser, Notification } from '../types';
import Card from '../components/Card';
import TaskItem from '../components/Tasks/TaskItem';
import AddEditTaskModal from '../components/Tasks/AddEditTaskModal';
import { Bell, X } from 'lucide-react';

const ToDoPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [staff, setStaff] = useState<AppUser[]>([]); // For refreshing tasks or task details if needed
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [serviceTypeFilter, setServiceTypeFilter] = useState('All Types');
    const [statusFilter, setStatusFilter] = useState('All Open'); // Default to All Open (Active)
    const [urgencyFilter, setUrgencyFilter] = useState('All Urgencies');
    const [sortBy, setSortBy] = useState<'dueDate' | 'created'>('dueDate');

    // Admin Filters
    const [staffFilter, setStaffFilter] = useState('All Staff');

    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                try {
                    const isAdmin = user.title === 'Administrator';

                    // If Admin, fetch ALL tasks. If not, fetch only assigned tasks.
                    const tasksPromise = isAdmin ? api.getTasks() : api.getTasksByUserId(user.uid);

                    // Fetch staff list if Admin (for filter & modal) or if needed for Edit Modal (which uses staff list for changing assignee)
                    // Currently Edit Modal is only available to owner or maybe admin? 
                    // Let's always fetch staff if we are editing, but for the page filter we definitely need it if Admin.
                    // The original code passed `staff` to `AddEditTaskModal`.
                    // We can just always fetch staff since the list is likely small, or conditionally.
                    // Let's stick to original pattern but ensure we get all tasks for Admin.

                    const [tasksData, staffData, notificationsData] = await Promise.all([
                        tasksPromise,
                        api.getStaffUsers(),
                        api.getNotificationsByUserId(user.uid)
                    ]);
                    setTasks(tasksData);
                    setStaff(staffData);
                    setNotifications(notificationsData);
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
        let result = tasks.filter(task => {
            // Admin Filter: Staff Member
            let matchesStaff = true;
            if (user?.title === 'Administrator' && staffFilter !== 'All Staff') {
                matchesStaff = task.assignedToId === staffFilter;
            }

            const matchesServiceType = serviceTypeFilter === 'All Types' || task.serviceType === serviceTypeFilter;

            let matchesStatus = true;
            if (statusFilter === 'All Open') {
                matchesStatus = task.status !== 'Completed';
            } else {
                matchesStatus = statusFilter === 'All Statuses' || task.status === statusFilter;
            }

            const matchesUrgency = urgencyFilter === 'All Urgencies' || task.urgency === urgencyFilter;

            return matchesStaff && matchesServiceType && matchesStatus && matchesUrgency;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'created') {
                // Newest Created First
                const dateA = a.dateCreated || 0;
                const dateB = b.dateCreated || 0;
                // If created date is missing, treat as oldest (0)
                return dateB - dateA;
            } else {
                // Due Date: Earliest Date at Top
                return a.dueDate - b.dueDate;
            }
        });

        return result;
    }, [tasks, serviceTypeFilter, statusFilter, urgencyFilter, sortBy, staffFilter, user]);

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

    const handleDeleteNotification = async (notificationId: string) => {
        try {
            await api.deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error("Failed to delete notification", error);
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
            <h1 className="text-3xl font-bold text-gray-800">Task Management</h1>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Task List Column */}
                <div className={`${user?.title === 'Administrator' ? 'w-full' : 'lg:w-2/3'} space-y-4`}>

                    {/* Filters */}
                    <Card>
                        <div className={`p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${user?.title === 'Administrator' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                            {user?.title === 'Administrator' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                                    <select
                                        value={staffFilter}
                                        onChange={e => setStaffFilter(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                                    >
                                        <option value="All Staff">All Tasks (Admin View)</option>
                                        {staff.map(s => (
                                            <option key={s.uid} value={s.uid}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value as 'dueDate' | 'created')}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                                >
                                    <option value="dueDate">Due Date (Earliest First)</option>
                                    <option value="created">Recently Created</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Task List */}
                    <Card title="My Tasks">
                        <div className={`p-4 ${user?.title === 'Administrator' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}`}>
                            {loading ? (
                                <div className="text-center py-4 text-gray-500 col-span-full">Loading tasks...</div>
                            ) : filteredTasks.length > 0 ? (
                                filteredTasks.map(task => (
                                    <div key={task.id} onClick={() => navigate(`/clients/${task.clientId}`)} className="cursor-pointer group h-full">
                                        <div className="relative h-full">
                                            <TaskItem
                                                task={task}
                                                onEdit={handleEditTask}
                                                onDelete={handleDeleteTask}
                                                hasNotification={notifications.some(n => n.relatedItemId === task.id)}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 col-span-full">
                                    No tasks match your filters.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column: 1/3 - Notifications (Hidden for Admin) */}
                {user?.title !== 'Administrator' && (
                    <div className="lg:w-1/3">
                        <Card title="Notifications">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {notifications.map(notification => (
                                        <div key={notification.id} className="p-4 flex items-start gap-4">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {notification.relatedClientId ? (
                                                        <a href={`/clients/${notification.relatedClientId}`} className="hover:underline hover:text-[#404E3B]">
                                                            {notification.message}
                                                        </a>
                                                    ) : (
                                                        notification.message
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(notification.dateCreated).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteNotification(notification.id)}
                                                className="text-gray-400 hover:text-gray-500"
                                                aria-label="Close notification"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center min-h-[200px]">
                                    <Bell className="h-10 w-10 text-gray-300 mb-3" />
                                    <p>No new notifications.</p>
                                    <p className="text-xs text-gray-400 mt-1">Notifications will appear here later.</p>
                                </div>
                            )}
                        </Card>
                    </div >
                )}
            </div >

            {/* Edit Modal */}
            {
                taskToEdit && (
                    <AddEditTaskModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onSave={handleSaveTask}
                        taskToEdit={taskToEdit}
                        clientId={taskToEdit.clientId}
                        clientName={taskToEdit.clientName}
                        admins={staff.map(s => ({ id: s.uid, name: s.name }))}
                    />
                )
            }
        </div >
    );
};

export default ToDoPage;
