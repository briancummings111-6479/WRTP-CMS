
import React from 'react';
import { Task } from '../../types';
import { User, Calendar, Edit2 } from 'lucide-react';

interface KanbanTaskCardProps {
    task: Task;
    onStatusChange: (task: Task, newStatus: Task['status']) => void;
    onClick: (task: Task) => void;
    onEdit: (task: Task) => void;
}

const urgencyConfig = {
    Green: {
        color: 'bg-green-500',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-800',
        label: 'NORMAL'
    },
    Yellow: {
        color: 'bg-yellow-500',
        badgeBg: 'bg-yellow-100',
        badgeText: 'text-yellow-800',
        label: 'YELLOW'
    },
    Red: {
        color: 'bg-red-500',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-800',
        label: 'RED'
    }
};

const statusOptions: Task['status'][] = ['Open', 'In Progress', 'Waiting', 'Completed'];

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onStatusChange, onClick, onEdit }) => {
    const config = urgencyConfig[task.urgency];

    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onStatusChange(task, e.target.value as Task['status']);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(task);
    }

    return (
        <div
            onClick={() => onClick(task)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative group"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.color}`} />

            <div className="p-4 pl-5"> {/* Extra padding-left for the border */}
                <div className="flex justify-between items-start mb-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${config.badgeBg} ${config.badgeText}`}>
                        {config.label}
                    </span>
                    <button
                        onClick={handleEditClick}
                        className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Edit task"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </div>

                <h3 className="text-gray-900 font-semibold mb-1 line-clamp-2 leading-tight">
                    {task.title}
                </h3>

                <div className="flex items-center text-gray-500 text-sm mb-4">
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    <span>{task.assignedToName}</span>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center text-gray-500 text-xs">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>

                    <div onClick={handleStatusClick}>
                        <select
                            value={task.status}
                            onChange={handleSelectChange}
                            className="text-xs border-none bg-transparent font-medium text-gray-700 hover:bg-gray-50 rounded focus:ring-0 cursor-pointer pr-6 py-0 disabled:opacity-50"
                        >
                            {statusOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KanbanTaskCard;
