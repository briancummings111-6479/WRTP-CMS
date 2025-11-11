import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/mockApi';
import { Task } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Card from '../Card';
import TaskItem from './TaskItem';
import AddEditTaskModal from './AddEditTaskModal';
import { Plus } from 'lucide-react';

interface TasksSectionProps {
  clientId: string;
  clientName: string;
}

const TasksSection: React.FC<TasksSectionProps> = ({ clientId, clientName }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const fetchTasksAndAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, adminsData] = await Promise.all([
        api.getTasksByClientId(clientId),
        api.getAdmins()
      ]);
      setTasks(tasksData.filter(t => t.status !== 'Completed').sort((a,b) => a.dueDate - b.dueDate));
      setAdmins(adminsData);
    } catch (error) {
      console.error("Failed to fetch tasks or admins:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchTasksAndAdmins();
  }, [fetchTasksAndAdmins]);

  const handleOpenModal = (task?: Task) => {
    setTaskToEdit(task || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
  };

  const handleSaveTask = (savedTask: Task) => {
    // Optimistically update UI
    setTasks(prevTasks => {
        const existingIndex = prevTasks.findIndex(t => t.id === savedTask.id);
        if (existingIndex > -1) {
            const newTasks = [...prevTasks];
            newTasks[existingIndex] = savedTask;
            return newTasks;
        } else {
            return [...prevTasks, savedTask];
        }
    });
    // For a real app, you might re-fetch here instead:
    // fetchTasksAndAdmins();
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
        await api.deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
        console.error("Failed to delete task", error);
        alert("Failed to delete task. Please try again.");
    }
  };

  return (
    <>
      <Card
        title="Client's To-Do Tasks"
        titleAction={
          user?.role === 'admin' && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none"
              aria-label="Add new task"
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        }
      >
        {loading ? (
          <div className="text-center text-gray-500">Loading tasks...</div>
        ) : (
          <div className="space-y-3">
            {tasks.length > 0 ? (
              tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteTask}
                />
              ))
            ) : (
              <p className="text-center text-sm text-gray-500 py-4">No open tasks for this client.</p>
            )}
          </div>
        )}
      </Card>
      {isModalOpen && (
        <AddEditTaskModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          taskToEdit={taskToEdit}
          clientId={clientId}
          clientName={clientName}
          admins={admins}
        />
      )}
    </>
  );
};

export default TasksSection;