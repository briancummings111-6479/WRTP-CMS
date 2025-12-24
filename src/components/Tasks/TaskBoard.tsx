
import React from 'react';
import { Task } from '../../types';
import KanbanTaskCard from './KanbanTaskCard';

interface TaskBoardProps {
    tasks: Task[];
    onStatusChange: (task: Task, newStatus: Task['status']) => void;
    onTaskClick: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
}

const COLUMNS: { id: Task['status']; label: string }[] = [
    { id: 'Open', label: 'OPEN' },
    { id: 'In Progress', label: 'IN PROGRESS' },
    { id: 'Waiting', label: 'WAITING' }
];

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onStatusChange, onTaskClick, onEdit, onDelete }) => {

    const getTasksByStatus = (status: Task['status']) => {
        return tasks.filter(task => task.status === status);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
            {COLUMNS.map(column => {
                const columnTasks = getTasksByStatus(column.id);
                return (
                    <div key={column.id} className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{column.label}</h2>
                            <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                {columnTasks.length}
                            </span>
                        </div>

                        <div className="bg-[#BCC6BC] bg-opacity-40 rounded-lg p-4 flex-1 space-y-3 min-h-[200px]">
                            {columnTasks.map(task => (
                                <KanbanTaskCard
                                    key={task.id}
                                    task={task}
                                    onStatusChange={onStatusChange}
                                    onClick={onTaskClick}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    hasNotification={false}
                                />
                            ))}
                            {columnTasks.length === 0 && (
                                <div className="h-20 flex items-center justify-center text-gray-500 text-sm italic">
                                    No tasks
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TaskBoard;
