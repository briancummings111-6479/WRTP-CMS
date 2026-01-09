import React, { useState, useEffect } from 'react';
import { Workshop } from '../../types';
import Card from '../Card';
import { Plus } from 'lucide-react';
import WorkshopItem from './WorkshopItem';
import AddEditWorkshopModal from './AddEditWorkshopModal';
import api from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface WorkshopsSectionProps {
  clientId: string;
  clientName: string;
  admins: { id: string, name: string }[];
}

const WorkshopsSection: React.FC<WorkshopsSectionProps> = ({ clientId, clientName, admins }) => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workshopToEdit, setWorkshopToEdit] = useState<Workshop | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchWorkshops = async () => {
      if (clientId) {
        setLoading(true);
        try {
          const data = await api.getWorkshopsByClientId(clientId);
          setWorkshops(data);
        } catch (error) {
          console.error("Failed to fetch workshops", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchWorkshops();
  }, [clientId]);

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
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none"
            aria-label="Add new workshop"
          >
            <Plus className="h-4 w-4" />
          </button>
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
      </Card >
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
      )
      }
    </>
  );
};

export default WorkshopsSection;