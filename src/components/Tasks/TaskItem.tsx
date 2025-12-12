import React from 'react';
import { Task } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Calendar, User, Edit, Trash2, Flame, AlertTriangle, Circle, Link } from 'lucide-react';

interface TaskItemProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
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

const StatusBadge: React.FC<{ status: Task['status'] }> = ({ status }) => {
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


const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onDelete }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
            onDelete(task.id);
        }
    }

    return (
        <div className="p-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
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
                    {isAdmin && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="text-gray-400 hover:text-[#404E3B]" aria-label="Edit task"><Edit className="h-4 w-4" /></button>
                            <button onClick={handleDelete} className="text-gray-400 hover:text-red-600" aria-label="Delete task"><Trash2 className="h-4 w-4" /></button>
                        </>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-end mt-2">
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
                    <p className="flex items-center">
                        <User className="h-3 w-3 mr-1.5" />
                        For: {task.assignedToName}
                        <span className="mx-2 text-gray-300">|</span>
                        By: {task.createdBy}
                    </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                    <StatusBadge status={task.status} />
                    <UrgencyBadge urgency={task.urgency} />
                </div>
            </div>
        </div>
    );
};

export default TaskItem;