import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/firebase';

interface AddEditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  taskToEdit?: Task | null;
  clientId: string;
  clientName: string;
  admins: { id: string, name: string }[];
}

const AddEditTaskModal: React.FC<AddEditTaskModalProps> = ({ isOpen, onClose, onSave, taskToEdit, clientId, clientName, admins }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [linkTo, setLinkTo] = useState(''); // Added state for link
  const [dueDate, setDueDate] = useState('');
  const [urgency, setUrgency] = useState<Task['urgency']>('Green');
  const [serviceType, setServiceType] = useState<Task['serviceType']>('General Check-in');
  const [status, setStatus] = useState<Task['status']>('Open');
  const [assignedToId, setAssignedToId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setLinkTo(taskToEdit.linkTo || ''); // Set link on edit
        setDueDate(new Date(taskToEdit.dueDate).toISOString().split('T')[0]);
        setUrgency(taskToEdit.urgency);
        setServiceType(taskToEdit.serviceType || 'General Check-in');
        setStatus(taskToEdit.status);
        setAssignedToId(taskToEdit.assignedToId);
      } else {
        // Reset form for new task
        setTitle('');
        setLinkTo(''); // Reset link
        setDueDate('');
        setUrgency('Green');
        setServiceType('General Check-in');
        setStatus('Open');
        setAssignedToId(user?.uid || (admins.length > 0 ? admins[0].id : ''));
      }
    }
  }, [taskToEdit, isOpen, user, admins]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dueDate) return;

    setIsSaving(true);
    const selectedAdmin = admins.find(a => a.id === assignedToId);

    const taskData = {
      id: taskToEdit?.id,
      clientId: clientId,
      clientName: clientName,
      title: title,
      dueDate: new Date(dueDate).getTime(),
      dateCreated: taskToEdit?.dateCreated || Date.now(),
      urgency: urgency,
      serviceType: serviceType,
      assignedToId: assignedToId,
      assignedToName: selectedAdmin?.name || 'Unknown',
      createdBy: user.name,
      status: status,
      details: taskToEdit?.details || '',
      linkTo: linkTo || null,
    };

    try {
      // The API function `upsertTask` handles both create and update
      const savedTask = await api.upsertTask(taskData);
      onSave(savedTask);
      onClose();
    } catch (error) {
      console.error("Failed to save task", error);
      // alert("Failed to save task. Please try again."); // Removed alert
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 pt-16" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">{taskToEdit ? 'Edit Task' : 'Add New Task'} for {clientName}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200" aria-label="Close modal">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea id="title" value={title} onChange={(e) => setTitle(e.target.value)} rows={3} className="form-input mt-1" required />
            </div>

            {/* --- Added Link Input --- */}
            <div>
              <label htmlFor="linkTo" className="block text-sm font-medium text-gray-700">Link URL (Optional)</label>
              <input type="url" id="linkTo" value={linkTo} onChange={(e) => setLinkTo(e.target.value)} className="form-input mt-1" placeholder="https://..." />
            </div>
            {/* ------------------------ */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="form-input mt-1" required />
              </div>
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">Urgency</label>
                <select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as Task['urgency'])} className="form-input mt-1">
                  <option value="Green">Green</option>
                  <option value="Yellow">Yellow</option>
                  <option value="Red">Red</option>
                </select>
              </div>
              <div>
                <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Type</label>
                <select id="serviceType" value={serviceType} onChange={(e) => setServiceType(e.target.value as Task['serviceType'])} className="form-input mt-1">
                  <option>Job Search</option>
                  <option>Supportive Service</option>
                  <option>Training</option>
                  <option>Intake Meeting</option>
                  <option>ISP Review</option>
                  <option>General Check-in</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])} className="form-input mt-1">
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label htmlFor="assignedToId" className="block text-sm font-medium text-gray-700">Assigned To</label>
                <select id="assignedToId" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="form-input mt-1" required>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center p-4 border-t bg-gray-50 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3">Cancel</button>
            <button type="submit" disabled={isSaving} className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89]">
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
        <style>{`.form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; } .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }`}</style>
      </div>
    </div>
  );
};

export default AddEditTaskModal;