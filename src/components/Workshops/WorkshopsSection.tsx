import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/mockApi';
import { Workshop } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Card from '../Card';
import WorkshopItem from './WorkshopItem';
import AddEditWorkshopModal from './AddEditWorkshopModal';
import { Plus } from 'lucide-react';

interface WorkshopsSectionProps {
  clientId: string;
  clientName: string;
}

const WorkshopsSection: React.FC<WorkshopsSectionProps> = ({ clientId, clientName }) => {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workshopToEdit, setWorkshopToEdit] = useState<Workshop | null>(null);

  const fetchWorkshopsAndAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const [workshopsData, adminsData] = await Promise.all([
        api.getWorkshopsByClientId(clientId),
        api.getAdmins()
      ]);
      setWorkshops(workshopsData);
      setAdmins(adminsData);
    } catch (error) {
      console.error("Failed to fetch workshops or admins:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchWorkshopsAndAdmins();
  }, [fetchWorkshopsAndAdmins]);

  const handleOpenModal = (workshop?: Workshop) => {
    setWorkshopToEdit(workshop || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setWorkshopToEdit(null);
  };

  const handleSaveWorkshop = (savedWorkshop: Workshop) => {
    setWorkshops(prev => {
        const existingIndex = prev.findIndex(w => w.id === savedWorkshop.id);
        if (existingIndex > -1) {
            const newWorkshops = [...prev];
            newWorkshops[existingIndex] = savedWorkshop;
            return newWorkshops;
        } else {
            return [savedWorkshop, ...prev];
        }
    });
    // For a real app, you would also need to refresh the main tasks list
    // if a task was auto-created/updated. For this demo, the mock API handles it.
  };

  const handleDeleteWorkshop = async (workshopId: string) => {
    try {
        await api.deleteWorkshop(workshopId);
        setWorkshops(prev => prev.filter(w => w.id !== workshopId));
    } catch (error) {
        console.error("Failed to delete workshop", error);
        alert("Failed to delete workshop. Please try again.");
    }
  };

  return (
    <>
      <Card
        title="Workshop Status"
        titleAction={
          user?.role === 'admin' && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none"
              aria-label="Add new workshop"
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        }
      >
        {loading ? (
          <div className="text-center text-gray-500">Loading workshops...</div>
        ) : (
          <div className="space-y-3">
            {workshops.length > 0 ? (
              workshops.map(workshop => (
                <WorkshopItem
                  key={workshop.id}
                  workshop={workshop}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteWorkshop}
                />
              ))
            ) : (
              <p className="text-center text-sm text-gray-500 py-4">No workshops scheduled for this client.</p>
            )}
          </div>
        )}
      </Card>
      {isModalOpen && (
        <AddEditWorkshopModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveWorkshop}
          workshopToEdit={workshopToEdit}
          clientId={clientId}
          clientName={clientName}
          admins={admins}
        />
      )}
    </>
  );
};

export default WorkshopsSection;