import React from 'react';
import { Workshop } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Calendar, User, Edit, Trash2 } from 'lucide-react';

interface WorkshopItemProps {
    workshop: Workshop;
    onEdit: (workshop: Workshop) => void;
    onDelete: (workshopId: string) => void;
}

const StatusBadge: React.FC<{ status: Workshop['status'] }> = ({ status }) => {
    const statusStyles = {
        Scheduled: 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-purple-100 text-purple-800',
        Completed: 'bg-green-100 text-green-800',
        Canceled: 'bg-gray-100 text-gray-800',
        Declined: 'bg-yellow-100 text-yellow-800',
        'No Show': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[status]}`}>
            {status}
        </span>
    );
};


const WorkshopItem: React.FC<WorkshopItemProps> = ({ workshop, onEdit, onDelete }) => {
    const { user } = useAuth();
    const isStaffOrAdmin = user?.role === 'admin' || user?.role === 'staff' || (user?.role === 'viewer' && user?.title !== 'Applicant');

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        const workshopTitle = workshop.workshopName === 'Other' ? workshop.workshopNameOther : workshop.workshopName;
        if (window.confirm(`Are you sure you want to delete this workshop: "${workshopTitle}"?`)) {
            onDelete(workshop.id);
        }
    }

    const workshopDisplayName = workshop.workshopName === 'Other' ? workshop.workshopNameOther : workshop.workshopName;

    return (
        <div className="p-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-800 flex-1 pr-2">{workshopDisplayName}</p>
                {isStaffOrAdmin && (
                    <div className="flex-shrink-0 flex items-center space-x-2">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(workshop); }} className="text-gray-400 hover:text-[#404E3B]" aria-label="Edit workshop"><Edit className="h-4 w-4" /></button>
                        <button onClick={handleDelete} className="text-gray-400 hover:text-red-600" aria-label="Delete workshop"><Trash2 className="h-4 w-4" /></button>
                    </div>
                )}
            </div>
            <div className="flex justify-between items-end mt-2">
                <div className="text-xs text-gray-500 space-y-1">
                    <p className="flex items-center"><Calendar className="h-3 w-3 mr-1.5" /> Date: {new Date(workshop.workshopDate).toLocaleDateString()}</p>
                    <p className="flex items-center"><User className="h-3 w-3 mr-1.5" /> Staff: {workshop.assignedToName}</p>
                </div>
                <StatusBadge status={workshop.status} />
            </div>
        </div>
    );
};

export default WorkshopItem;