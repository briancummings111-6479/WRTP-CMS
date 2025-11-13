import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/mockApi';
import { Client, ISP } from '../types';
import Card from '../components/Card';
import { User, Phone, Mail, Home, Edit, Link, Check, X } from 'lucide-react';
import EditClientModal from '../components/EditClientModal';
import { useAuth } from '../context/AuthContext';
import CaseNotesSection from '../components/CaseNotes/CaseNotesSection';
import ISPSection from '../components/ISP/ISPSection';
import AttachmentsSection from '../components/Attachments/AttachmentsSection';
import TasksSection from '../components/Tasks/TasksSection';
import WorkshopsSection from '../components/Workshops/WorkshopsSection';
import ActionStepsSection from '../components/ActionSteps/ActionStepsSection';

const ClientTypeBadge: React.FC<{ clientType: Client['metadata']['clientType'] }> = ({ clientType }) => {
    const styles = {
        'General Population': 'bg-purple-100 text-purple-800',
        'CHYBA': 'bg-teal-100 text-teal-800',
    };
    return <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[clientType]}`}>{clientType}</span>
};

const StatusBadge: React.FC<{ status: Client['metadata']['status'] }> = ({ status }) => {
    const styles = {
        'Prospect': 'bg-blue-100 text-blue-800',
        'Active': 'bg-green-100 text-green-800',
        'Inactive': 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>
};

const ChecklistItem: React.FC<{ label: string; checked: boolean }> = ({ label, checked }) => (
  <div className="flex items-center text-gray-700">
    {checked ? <Check className="h-5 w-5 mr-3 text-green-500" /> : <X className="h-5 w-5 mr-3 text-red-500" />}
    <span>{label}</span>
  </div>
);


const ClientDashboardPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [isp, setIsp] = useState<ISP | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Case Notes');

  // Updated tabs array with new name
  const tabs = ['Case Notes', 'ISP', 'Onboarding Documents', 'Training', 'Files'];

  useEffect(() => {
    const fetchClientData = async () => {
      if (clientId) {
        setLoading(true);
        try {
          const [clientData, ispData] = await Promise.all([
            api.getClientById(clientId),
            api.getISPByClientId(clientId)
          ]);
          setClient(clientData || null);
          setIsp(ispData || null);
        } catch (error) {
          console.error("Failed to fetch client data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchClientData();
  }, [clientId]);

  const handleSaveClient = async (updatedData: Client) => {
    if (!user) return;
    const clientWithMeta = {
      ...updatedData,
      metadata: {
        ...updatedData.metadata,
        lastModifiedBy: user.uid,
      }
    };
    const savedClient = await api.updateClient(clientWithMeta);
    setClient(savedClient);
    setIsEditModalOpen(false);
  };

  const handleIspUpdate = async (ispDataToSave: ISP): Promise<void> => {
    const originalIsp = isp;
    setIsp(ispDataToSave); // Optimistic update

    try {
        const savedIsp = await api.upsertISP(ispDataToSave);
        setIsp(savedIsp);
    } catch (error) {
        console.error("Failed to update ISP", error);
        setIsp(originalIsp); // Rollback on error
        throw error; // Re-throw to inform child component of failure
    }
  };


  if (loading) return <div>Loading client data...</div>;
  if (!client) return <div>Client not found.</div>;

  const { profile, contactInfo, metadata } = client;

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0; // Handle missing DOB
    // Split to avoid timezone issues with `new Date(string)`
    const [year, month, day] = dobString.split('-').map(Number);
    const dob = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
  };

  const clientAge = calculateAge(profile.dob);


  return (
    <>
      <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">{profile.firstName} {profile.lastName}</h1>
        </div>
         <div className="flex items-center gap-2">
            {client.metadata.status !== 'Prospect' && <ClientTypeBadge clientType={metadata.clientType} />}
            <StatusBadge status={metadata.status} />
         </div>
       </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card 
            title="Client Snapshot"
            titleAction={
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 rounded-full text-gray-500 hover:bg-[#f2f2f2] hover:text-[#404E3B]"
                    aria-label="Edit client details"
                >
                    <Edit className="h-5 w-5" />
                </button>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center text-gray-700">
                <User className="h-5 w-5 mr-3 text-gray-400" /> 
                <span>
                  {clientAge > 0 ? `Age ${clientAge} (DOB: ${profile.dob})` : (profile.dob ? `DOB: ${profile.dob}` : 'DOB not set')}
                </span>
              </div>
              <div className="flex items-center text-gray-700">
                <Phone className="h-5 w-5 mr-3 text-gray-400" /> 
                <span>{contactInfo.phone || 'No phone'}</span>
              </div>
              {contactInfo.phone2 && (
                <div className="flex items-center text-gray-700">
                    <Phone className="h-5 w-5 mr-3 text-gray-400" /> 
                    <span>{contactInfo.phone2} (secondary)</span>
                </div>
              )}
              <div className="flex items-center text-gray-700">
                <Mail className="h-5 w-5 mr-3 text-gray-400" /> 
                <span>{contactInfo.email || 'No email'}</span>
              </div>
               <div className="flex items-start text-gray-700">
                <Home className="h-5 w-5 mr-3 text-gray-400 flex-shrink-0 mt-1" /> 
                <span>{contactInfo.street ? `${contactInfo.street}${contactInfo.apt ? `, ${contactInfo.apt}` : ''}, ${contactInfo.city}, ${contactInfo.state} ${contactInfo.zip}` : 'No address'}</span>
              </div>
              {client.googleDriveLink && (
                  <div className="flex items-center text-gray-700">
                    <Link className="h-5 w-5 mr-3 text-gray-400" />
                    <a href={client.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-[#404E3B] hover:underline break-all">
                        Google Drive Folder
                    </a>
                  </div>
              )}
            </div>
          </Card>

          {/* ----- Cards Removed From Here ----- */}
          
           <TasksSection clientId={client.id} clientName={`${profile.firstName} ${profile.lastName}`} />
           <WorkshopsSection clientId={client.id} clientName={`${profile.firstName} ${profile.lastName}`} />
        </div>
        
        {/* Right Column (Tabs) */}
        <div className="lg:col-span-2">
            <div className="bg-[#E6E6E6] rounded-lg shadow-md border border-[#d1d1d1]">
                 <div className="border-b border-[#d1d1d1]">
                    <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab
                                ? 'border-[#404E3B] text-[#404E3B]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                        {tab}
                        </button>
                    ))}
                    </nav>
                </div>
                <div className="p-6">
                    {activeTab === 'Case Notes' && <CaseNotesSection clientId={client.id} clientName={`${profile.firstName} ${profile.lastName}`} />}
                    
                    {activeTab === 'ISP' && <ISPSection client={client} isp={isp} onIspUpdate={handleIspUpdate} />}
                    
                    {/* ----- Renamed tab logic ----- */}
                    {activeTab === 'Onboarding Documents' && (
                      <div className="space-y-3">
                        <ChecklistItem label="Application Packet" checked={client.caseManagement.applicationPacket} />
                        <ChecklistItem label="ID" checked={client.caseManagement.id} />
                        <ChecklistItem label="Proof of Income" checked={client.caseManagement.proofOfIncome} />
                        <ChecklistItem label="Initial Assessment" checked={client.caseManagement.initialAssessment} />
                        <ChecklistItem label="ROI" checked={client.caseManagement.roi} />
                        <ChecklistItem label="ISP Completed" checked={client.caseManagement.ispCompleted} />
                      </div>
                    )}
                    {activeTab === 'Training' && (
                      <div className="space-y-3">
                        <ChecklistItem label="CPR" checked={client.training.cpr} />
                        <ChecklistItem label="First Aid" checked={client.training.firstAid} />
                        <ChecklistItem label="Food Handlers Card" checked={client.training.foodHandlersCard} />
                        <hr className="my-2 border-gray-300"/>
                        <ChecklistItem label="Construction CTE" checked={client.training.constructionCTE} />
                        <ChecklistItem label="Cosmetology CTE" checked={client.training.cosmetologyCTE} />
                        <ChecklistItem label="Culinary CTE" checked={client.training.culinaryCTE} />
                        <ChecklistItem label="Fire CTE" checked={client.training.fireCTE} />
                        <ChecklistItem label="Medical CTE" checked={client.training.medicalCTE} />
                      </div>
                    )}
                    {/* ------------------------------------- */}

                    {activeTab === 'Files' && <AttachmentsSection clientId={client.id} />}
                </div>
            </div>
        </div>
      </div>
    </div>
    {client && (
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={client}
        onSave={handleSaveClient}
      />
    )}
    </>
  );
};

export default ClientDashboardPage;