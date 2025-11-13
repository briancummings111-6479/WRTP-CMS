import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/mockApi';
import { Client, ISP, AuditChecklist, AuditChecklistItem } from '../types'; // Import new types
import Card from '../components/Card';
import { User, Phone, Mail, Home, Edit, Link, Check, X, Save } from 'lucide-react';
import EditClientModal from '../components/EditClientModal';
import { useAuth } from '../context/AuthContext';
import CaseNotesSection from '../components/CaseNotes/CaseNotesSection';
import ISPSection from '../components/ISP/ISPSection';
import AttachmentsSection from '../components/Attachments/AttachmentsSection';
import TasksSection from '../components/Tasks/TasksSection';
// --- Removed unused Workshop and ActionStep imports ---

// --- ADDED THIS HELPER TYPE ---
// This creates a type that only includes the keys from Client['training'] that are booleans
type TrainingBooleanKeys = {
  [K in keyof Client['training']]: Client['training'][K] extends boolean ? K : never
}[keyof Client['training']];
// ------------------------------

// Helper component for form checkboxes
const CheckboxInput = ({ label, name, checked, onChange }: { 
  label: string, 
  name: string, 
  checked: boolean, 
  // --- FIX: Broadened this type to match the handler it receives ---
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) => (
    <label className="flex items-center">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
        <span className="ml-2 text-gray-700">{label}</span>
    </label>
);

// Helper component for display list items
const DisplayListItem: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center text-gray-700">
    <Check className="h-5 w-5 mr-3 text-green-500" />
    <span>{label}</span>
  </div>
);

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

// --- NEW HELPER COMPONENT for Audit Checklist ---
interface AuditChecklistRowProps {
  item: AuditChecklistItem;
  onChange: (id: string, field: keyof AuditChecklistItem, value: string | boolean) => void;
  isEditing: boolean;
}

const AuditChecklistRow: React.FC<AuditChecklistRowProps> = ({ item, onChange, isEditing }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    onChange(item.id, name as keyof AuditChecklistItem, type === 'checkbox' ? checked : value);
  };

  return (
    <tr className="border-b border-gray-200" key={item.id}>
      <td className="py-2 pr-2 text-sm text-gray-700">
        <span className="font-medium text-gray-500 mr-2">{item.id}</span>
        {item.label}
      </td>
      <td className="py-2 px-2 text-center">
        {isEditing ? (
          <input type="checkbox" name="present" checked={item.present} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
        ) : (
          item.present ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />
        )}
      </td>
      <td className="py-2 px-2 text-center">
        {isEditing ? (
          <input type="checkbox" name="complete" checked={item.complete} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
        ) : (
          item.complete ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />
        )}
      </td>
      <td className="py-2 px-2 text-center">
        {isEditing ? (
          <input type="checkbox" name="uploaded" checked={item.uploaded} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
        ) : (
          item.uploaded ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />
        )}
      </td>
      <td className="py-2 pl-2">
        {isEditing ? (
          <input
            type="text"
            name="notes"
            value={item.notes}
            onChange={handleChange}
            className="form-input text-sm w-full"
            placeholder="Notes..."
          />
        ) : (
          <span className="text-sm text-gray-600">{item.notes || (isEditing ? '' : 'N/A')}</span>
        )}
      </td>
    </tr>
  );
};
// ------------------------------------------------

const ClientDashboardPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [isp, setIsp] = useState<ISP | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Case Notes');
  
  // State for the Training Form
  const [isEditingTraining, setIsEditingTraining] = useState(false);
  const [trainingData, setTrainingData] = useState<Client['training'] | null>(null);
  const [isTrainingSaving, setIsTrainingSaving] = useState(false);
  
  // --- NEW State for the Audit Checklist Form ---
  const [isEditingAuditChecklist, setIsEditingAuditChecklist] = useState(false);
  const [auditChecklistData, setAuditChecklistData] = useState<AuditChecklist | null>(null);
  const [isAuditChecklistSaving, setIsAuditChecklistSaving] = useState(false);
  // ----------------------------------------------

  // --- Renamed tab ---
  const tabs = ['Case Notes', 'ISP', 'Audit Checklist', 'Certificates and CTE', 'Files'];

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
          // Initialize training form state
          if (clientData) {
            setTrainingData(clientData.training);
            // --- Initialize audit checklist state ---
            setAuditChecklistData(clientData.auditChecklist);
          }
        } catch (error) {
          console.error("Failed to fetch client data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchClientData();
  }, [clientId]);

  // Sync training form state if client data changes (e.g., after modal edit)
  useEffect(() => {
    if (client) {
      setTrainingData(client.training);
      // --- Sync audit checklist state ---
      setAuditChecklistData(client.auditChecklist);
    }
  }, [client]);

  const handleSaveClient = async (updatedData: Client) => {
    if (!user) return;
    const clientWithMeta = {
      ...updatedData,
      metadata: {
        ...updatedData.metadata,
        lastModifiedBy: user?.uid || 'unknown',
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

  // Handlers for the Training Form
  const handleTrainingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setTrainingData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
    });
  };

  const handleTrainingSave = async () => {
    if (!client || !trainingData) return;
    
    setIsTrainingSaving(true);
    try {
      await handleSaveClient({ 
        ...client, 
        training: trainingData 
      });
      setIsEditingTraining(false); // Close edit mode on save
    } catch (error) {
      console.error("Failed to save training data:", error);
    } finally {
      setIsTrainingSaving(false);
    }
  };

  const handleTrainingCancel = () => {
    // Reset form data to the client's current state and exit edit mode
    setTrainingData(client?.training || null);
    setIsEditingTraining(false);
  };
  
  // --- NEW Handlers for Audit Checklist Form ---
  const handleAuditChecklistChange = (
    section: keyof AuditChecklist,
    itemId: string,
    field: keyof AuditChecklistItem,
    value: string | boolean
  ) => {
    setAuditChecklistData(prev => {
      if (!prev) return null;
      
      const newSectionData = prev[section].map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      );

      return {
        ...prev,
        [section]: newSectionData
      };
    });
  };

  const handleAuditChecklistSave = async () => {
    if (!client || !auditChecklistData) return;
    
    setIsAuditChecklistSaving(true);
    try {
      await handleSaveClient({ 
        ...client, 
        auditChecklist: auditChecklistData 
      });
      setIsEditingAuditChecklist(false); // Close edit mode on save
    } catch (error) {
      console.error("Failed to save audit checklist", error);
    } finally {
      setIsAuditChecklistSaving(false);
    }
  };

  const handleAuditChecklistCancel = () => {
    setAuditChecklistData(client?.auditChecklist || null);
    setIsEditingAuditChecklist(false);
  };
  // ---------------------------------------------
  
  // Helper arrays for rendering the training display list
  const certificationMap: { key: TrainingBooleanKeys, label: string }[] = [
    { key: 'cpr', label: 'CPR' },
    { key: 'firstAid', label: 'First Aid' },
    { key: 'foodHandlersCard', label: 'Food Handlers Card' },
    { key: 'osha10', label: 'OSHA-10' },
    { key: 'nccer', label: 'NCCER' },
  ];
  
  const cteProgramMap: { key: TrainingBooleanKeys, label: string }[] = [
    { key: 'constructionCTE', label: 'Construction CTE' },
    { key: 'cosmetologyCTE', label: 'Cosmetology CTE' },
    { key: 'culinaryCTE', label: 'Culinary CTE' },
    { key: 'fireCTE', label: 'Fire CTE' },
    { key: 'medicalCTE', label: 'Medical CTE' },
    { key: 'earlyChildhoodEducationCTE', label: 'Early Childhood Education CTE' },
    { key: 'entrepreneurshipCTE', label: 'Entrepreneurship CTE' },
  ];

  if (loading) return <div>Loading client data...</div>;
  if (!client) return <div>Client not found.</div>;

  const { profile, contactInfo, metadata } = client;

  const calculateAge = (dobString?: string): number => {
    if (!dobString) return 0;
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
        {/* --- FIX 1: Corrected className syntax --- */}
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
          
           <TasksSection clientId={client.id} clientName={`${profile.firstName} ${profile.lastName}`} />
           {/* --- Removed WorkshopsSection --- */}
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
                    
                    {/* ----- NEW 'Audit Checklist' Tab Logic ----- */}
                    {activeTab === 'Audit Checklist' && auditChecklistData && (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-gray-900">Participant File Audit Checklist</h3>
                          {!isEditingAuditChecklist ? (
                            <button
                              onClick={() => setIsEditingAuditChecklist(true)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4 mr-2 text-gray-500" />
                              Edit
                            </button>
                          ) : (
                            <div className="flex justify-end space-x-3">
                              <button 
                                type="button" 
                                onClick={handleAuditChecklistCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit" 
                                onClick={handleAuditChecklistSave}
                                disabled={isAuditChecklistSaving}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89] disabled:cursor-not-allowed"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {isAuditChecklistSaving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          {/* Render each section */}
                          {(Object.keys(auditChecklistData) as Array<keyof AuditChecklist>).map(sectionKey => {
                            const items = auditChecklistData[sectionKey];
                            if (items.length === 0) return null;
                            
                            return (
                              <fieldset key={sectionKey} className="border rounded-md">
                                <legend className="text-md font-medium text-gray-700 px-2 py-1 bg-[#E6E6E6] ml-4 -mt-3 w-auto">
                                  {/* Capitalize section name */}
                                  {sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace('caseNotes', 'Case Notes')}
                                </legend>
                                <div className="p-4 overflow-x-auto">
                                  <table className="min-w-full">
                                    <thead>
                                      <tr className="border-b border-gray-300">
                                        <th className="py-2 pr-2 text-left text-xs font-semibold text-gray-500 uppercase w-2/5">Item</th>
                                        <th className="py-2 px-2 text-center text-xs font-semibold text-gray-500 uppercase w-1/12">Present</th>
                                        <th className="py-2 px-2 text-center text-xs font-semibold text-gray-500 uppercase w-1/12">Complete</th>
                                        <th className="py-2 px-2 text-center text-xs font-semibold text-gray-500 uppercase w-1/12">Uploaded</th>
                                        <th className="py-2 pl-2 text-left text-xs font-semibold text-gray-500 uppercase w-2/5">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map(item => (
                                        <AuditChecklistRow
                                          key={item.id}
                                          item={item}
                                          isEditing={isEditingAuditChecklist}
                                          onChange={(itemId, field, value) => handleAuditChecklistChange(sectionKey, itemId, field, value)}
                                        />
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </fieldset>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* ------------------------------------------- */}

                    {/* ----- 'Certificates and CTE' Tab Logic ----- */}
                    {activeTab === 'Certificates and CTE' && trainingData && (
                      <div>
                        {!isEditingTraining ? (
                          // --- DISPLAY MODE ---
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-medium text-gray-900">Training Status</h3>
                              <button
                                onClick={() => setIsEditingTraining(true)}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Edit className="h-4 w-4 mr-2 text-gray-500" />
                                Edit
                              </button>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-md font-medium text-gray-800 mb-2">Certifications</h4>
                                <div className="space-y-2">
                                  {certificationMap.filter(cert => trainingData[cert.key]).length > 0 ? (
                                    certificationMap.map(cert => 
                                      trainingData[cert.key] && <DisplayListItem key={cert.key} label={cert.label} />
                                    )
                                  ) : <p className="text-sm text-gray-500">No certifications on file.</p>}
                                  
                                  {trainingData.otherCertificates && (
                                    <div className="pl-8 pt-1">
                                      <p className="text-sm text-gray-800 font-medium">Other: <span className="font-normal">{trainingData.otherCertificates}</span></p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <hr className="border-gray-200" />

                              <div>
                                <h4 className="text-md font-medium text-gray-800 mb-2">Enrolled CTE Programs</h4>
                                <div className="space-y-2">
                                  {cteProgramMap.filter(cte => trainingData[cte.key]).length > 0 ? (
                                    cteProgramMap.map(cte => 
                                      trainingData[cte.key] && <DisplayListItem key={cte.key} label={cte.label} />
                                    )
                                  ) : <p className="text-sm text-gray-500">No CTE programs on file.</p>}

                                  {trainingData.otherCteProgram && (
                                    <div className="pl-8 pt-1">
                                      <p className="text-sm text-gray-800 font-medium">Other: <span className="font-normal">{trainingData.otherCteProgram}</span></p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // --- EDIT MODE ---
                          <form onSubmit={(e) => { e.preventDefault(); handleTrainingSave(); }}>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Training Status</h3>
                            <div className="space-y-6">
                              {/* Certifications Section */}
                              <fieldset className="space-y-4 p-4 border rounded-md">
                                <legend className="text-md font-medium text-gray-700 px-1">Certifications</legend>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  {certificationMap.map(cert => (
                                    <CheckboxInput 
                                      key={cert.key} 
                                      label={cert.label} 
                                      name={cert.key}
                                      checked={trainingData[cert.key]} 
                                      onChange={handleTrainingChange} 
                                    />
                                  ))}
                                </div>
                                <div className="pt-2">
                                  <label htmlFor="otherCertificates" className="block text-sm font-medium text-gray-700">Other Certificates</label>
                                  <input
                                    type="text"
                                    id="otherCertificates"
                                    name="otherCertificates"
                                    value={trainingData.otherCertificates || ''}
                                    onChange={handleTrainingChange}
                                    className="form-input mt-1"
                                    placeholder="e.g., Forklift"
                                  />
                                </div>
                              </fieldset>

                              {/* CTE Programs Section */}
                              <fieldset className="space-y-4 p-4 border rounded-md">
                                <legend className="text-md font-medium text-gray-700 px-1">Enrolled CTE Programs</legend>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                                  {cteProgramMap.map(cte => (
                                    <CheckboxInput 
                                      key={cte.key} 
                                      label={cte.label} 
                                      name={cte.key} 
                                      checked={trainingData[cte.key]} 
                                      onChange={handleTrainingChange} 
                                    />
                                  ))}
                                </div>
                                <div className="pt-2">
                                  <label htmlFor="otherCteProgram" className="block text-sm font-medium text-gray-700">Other CTE Program</label>
                                  <input
                                    type="text"
                                    id="otherCteProgram"
                                    name="otherCteProgram"
                                    value={trainingData.otherCteProgram || ''}
                                    onChange={handleTrainingChange}
                                    className="form-input mt-1"
                                    placeholder="e.g., IT, Media"
                                  />
                                </div>
                              </fieldset>

                              {/* Save/Cancel Buttons */}
                              <div className="flex justify-end space-x-3">
                                <button 
                                  type="button" 
                                  onClick={handleTrainingCancel}
                                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={isTrainingSaving}
                                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89] disabled:cursor-not-allowed"
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  {isTrainingSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          </form>
                        )}
                        {/* Shared style for form inputs */}
                        <style>{`
                            .form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; }
                            .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }
                        `}</style>
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