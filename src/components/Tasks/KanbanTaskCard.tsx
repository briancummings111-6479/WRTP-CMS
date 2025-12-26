
import React from 'react';
import { Task } from '../../types';
import { Calendar, User, Edit, Trash2, Flame, AlertTriangle, Circle, Link, Bell } from 'lucide-react';

interface KanbanTaskCardProps {
    task: Task;
    onStatusChange: (task: Task, newStatus: Task['status']) => void;
    onClick: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    hasNotification?: boolean;
}

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

const statusOptions: Task['status'][] = ['Open', 'In Progress', 'Waiting', 'Completed'];

const statusConfig: { [key in Task['status']]: { styles: string } } = {
    Open: { styles: 'bg-blue-100 text-blue-800' },
    'In Progress': { styles: 'bg-purple-100 text-purple-800' },
    Waiting: { styles: 'bg-yellow-100 text-yellow-800' },
    Completed: { styles: 'bg-green-100 text-green-800' },
};

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onStatusChange, onClick, onEdit, onDelete, hasNotification }) => {

    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onStatusChange(task, e.target.value as Task['status']);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(task);
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
            onDelete(task.id);
        }
    }

    const isGeneralTask = !task.clientId;
    const currentStatusConfig = statusConfig[task.status] || statusConfig['Open'];

    return (
        <div
            onClick={() => onClick(task)}
            className={`p-3 rounded-md border border-gray-200 hover:bg-opacity-80 transition-colors relative cursor-pointer ${isGeneralTask ? 'bg-[#FFF9C4]' : 'bg-white hover:bg-gray-50'}`}
        >
            {hasNotification && (
                <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm border border-gray-100 z-10">
                    <Bell className="h-5 w-5 text-red-500 fill-current" />
                </div>
            )}

            {/* Header: Title + Actions */}
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-800 flex-1 pr-2 truncate">{task.title}</p>

                <div className="flex-shrink-0 flex items-center space-x-2">
                    {task.linkTo && (
                        <a
                            href={task.linkTo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#404E3B]"
                            aria-label="Open task link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Link className="h-4 w-4" />
                        </a>
                    )}
                    <button onClick={handleEdit} className="text-gray-400 hover:text-[#404E3B]" aria-label="Edit task">
                        <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={handleDelete} className="text-gray-400 hover:text-red-600" aria-label="Delete task">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content Row */}
            <div className="flex justify-between items-end mt-2">
                {/* Information Column */}
                <div className="text-xs text-gray-500 space-y-1">
                    <p className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1.5" />
                        {task.dateCreated && (
                            <>
                                Created: {new Date(task.dateCreated).toLocaleDateString()}
                                <span className="mx-2 text-gray-300">|</span>
                            </>
                        )}
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                    {task.clientName && (
                        <p className="flex items-center">
                            <User className="h-3 w-3 mr-1.5" />
                            Client: {task.clientName}
                            {task.serviceType && (
                                <>
                                    <span className="mx-2 text-gray-300">|</span>
                                    {task.serviceType}
                                </>
                            )}
                        </p>
                    )}
                    <p className="flex items-center">
                        <User className="h-3 w-3 mr-1.5" />
                        For: {task.assignedToName}
                        <span className="mx-2 text-gray-300">|</span>
                        By: {task.createdBy}
                    </p>
                </div>

                {/* Status & Urgency Column */}
                <div className="flex flex-col items-end space-y-2">
                    {/* Status Dropdown disguised as Badge */}
                    <div onClick={handleStatusClick} className="relative">
                        <select
                            value={task.status}
                            onChange={handleSelectChange}
                            className={`appearance-none pl-2.5 pr-6 py-1 text-xs font-medium rounded-full border-none focus:ring-1 focus:ring-offset-1 focus:ring-[#404E3B] cursor-pointer ${currentStatusConfig.styles}`}
                        >
                            {statusOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        {/* Custom Arrow/Indicator if needed, but appearance-none removes default arrow. 
                            If we remove appearance-none, we get the default arrow which might be fine.
                            Let's keep default appearance or add a custom arrow.
                            TaskItem has no dropdown. 
                            Let's use default appearance but small text.
                        */}
                    </div>

                    <UrgencyBadge urgency={task.urgency} />
                </div>
            </div>
        </div>
    );
};

export default KanbanTaskCard;
