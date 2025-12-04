import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/firebase';
import { Client, ISP, AuditChecklist, AuditChecklistItem, User as AppUser, CaseNote, Workshop, ClientAttachment } from '../types';
import Card from '../components/Card';
import { User, Phone, Mail, Home, Edit, Link, Check, X, Save } from 'lucide-react';
import EditClientModal from '../components/EditClientModal';
import { useAuth } from '../context/AuthContext';
import CaseNotesSection from '../components/CaseNotes/CaseNotesSection';
import ContactNotesSection from '../components/ContactNotes/ContactNotesSection';
import ISPSection from '../components/ISP/ISPSection';
import AttachmentsSection from '../components/Attachments/AttachmentsSection';
import TasksSection from '../components/Tasks/TasksSection';
import EnrollmentIntakeSection from '../components/EnrollmentIntakeSection';
import WorkshopsSection from '../components/Workshops/WorkshopsSection';

// --- ADDED THIS HELPER TYPE ---
// This creates a type that only includes the keys from Client['training'] that are booleans
type TrainingBooleanKeys = {
  [K in keyof Client['training']]: Client['training'][K] extends boolean ? K : never
}[keyof Client['training']];
// ------------------------------

interface CheckboxInputProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({ label, name, checked, onChange }) => (
  <label className="flex items-center">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]"
    />
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

interface AuditChecklistRowProps {
  item: AuditChecklistItem;
  onChange: (id: string, field: keyof AuditChecklistItem, value: string | boolean) => void;
  isEditing: boolean;
}

const AuditChecklistRow: React.FC<AuditChecklistRowProps> = ({ item, onChange, isEditing }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onChange(item.id, name as keyof AuditChecklistItem, type === 'checkbox' ? checked : value);
  };

  return (
    <tr className={item.present ? 'bg-green-50' : ''}>
      <td className="py-2 pl-2 text-sm text-gray-900">{item.label}</td>
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

const ClientDashboardPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isp, setIsp] = useState<ISP | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('Case Notes');
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);

  // State for the Training Form
  const [isEditingTraining, setIsEditingTraining] = useState(false);
  const [trainingData, setTrainingData] = useState<Client['training'] | null>(null);
  const [isTrainingSaving, setIsTrainingSaving] = useState(false);
  const [auditChecklistData, setAuditChecklistData] = useState<AuditChecklist | null>(null);
  const [isEditingAuditChecklist, setIsEditingAuditChecklist] = useState(false);
  const [isAuditChecklistSaving, setIsAuditChecklistSaving] = useState(false);

  const tabs = ['Case Notes', 'Contact Notes', 'Intake', 'ISP', 'Audit Checklist', 'Certificates and CTE', 'Files'];

  const fetchClientData = async () => {
    if (!clientId) return;
    console.log("Starting data fetch for client:", clientId);
    try {
      console.log("Fetching client...");
      const clientData = await api.getClientById(clientId);
      console.log("Client fetched:", clientData);

      console.log("Fetching ISP...");
      const ispData = await api.getISPByClientId(clientId);
      console.log("ISP fetched");

      console.log("Fetching Staff...");
      const staffData = await api.getStaffUsers();
      console.log("Staff fetched");

      console.log("Fetching Attachments...");
      const attachmentsData = await api.getAttachmentsByClientId(clientId);
      console.log("Attachments fetched");

      console.log("Fetching Case Notes...");
      const caseNotesData = await api.getCaseNotesByClientId(clientId);
      console.log("Case Notes fetched");

      console.log("Fetching Workshops...");
      const workshopsData = await api.getWorkshopsByClientId(clientId);
      console.log("Workshops fetched");

      setClient(clientData);
      setIsp(ispData || null);
      setStaff(staffData || []);
      setAttachments(attachmentsData || []);
      setCaseNotes(caseNotesData || []);
      setWorkshops(workshopsData || []);

      // Initialize training form state
      if (clientData) {
        setTrainingData(clientData.training);
        // --- Initialize audit checklist state ---
        setAuditChecklistData(clientData.auditChecklist);
      }
    } catch (err: any) {
      console.error("Failed to fetch client data:", err);
      setError(err.message || "An error occurred while fetching client data.");
    } finally {
      console.log("Fetch complete, setting loading false");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  useEffect(() => {
    if (client) {
      setTrainingData(client.training);
      setAuditChecklistData(client.auditChecklist);
    }
  }, [client]);

  const handleSaveClient = async (updatedClient: Client) => {
    try {
      const savedClient = await api.updateClient(updatedClient);
      setClient(savedClient);
      setTrainingData(savedClient.training);
      setAuditChecklistData(savedClient.auditChecklist);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update client:", error);
      alert("Failed to update client. Please try again.");
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      try {
        await api.deleteClient(client.id);
        navigate('/');
      } catch (error) {
        console.error("Error deleting client:", error);
        alert("Failed to delete client.");
      }
    }
  };

  const handleIspUpdate = async (updatedIsp: ISP) => {
    try {
      const savedIsp = await api.upsertISP(updatedIsp);
      setIsp(savedIsp);
    } catch (error) {
      console.error("Failed to update ISP:", error);
      alert("Failed to update ISP.");
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
      console.error("Failed to save audit checklist:", error);
    } finally {
      setIsAuditChecklistSaving(false);
    }
  };

  const handleAuditChecklistCancel = () => {
    setAuditChecklistData(client?.auditChecklist || null);
    setIsEditingAuditChecklist(false);
  };

  // --- Audit Checklist Automation Logic ---
  useEffect(() => {
    if (!client || !auditChecklistData) return;

    let hasChanges = false;
    // Deep copy to avoid direct mutation if we were using a more complex state manager, 
    // but here we just need a new object reference for the state update.
    // We'll map over sections to create a new structure if needed.
    const newChecklist = { ...auditChecklistData };

    const checkItem = (section: keyof AuditChecklist, id: string, isPresent: boolean) => {
      const sectionItems = newChecklist[section];
      const itemIndex = sectionItems.findIndex(i => i.id === id);
      if (itemIndex !== -1) {
        if (sectionItems[itemIndex].present !== isPresent) {
          // Create a new array for the section to ensure immutability
          newChecklist[section] = [...sectionItems];
          newChecklist[section][itemIndex] = { ...sectionItems[itemIndex], present: isPresent };
          hasChanges = true;
        }
      }
    };

    // Helper to check for file existence by keyword
    const hasFile = (keywords: string[]) => attachments.some(a =>
      keywords.some(k => a.fileName.toLowerCase().includes(k.toLowerCase()))
    );

    // --- 1. Onboarding ---
    checkItem('onboarding', '1.1', hasFile(['Contact Form']));
    checkItem('onboarding', '1.2', hasFile(['Application']));
    checkItem('onboarding', '1.3', hasFile(['Identity', 'ID', 'Driver', 'License', 'Passport']));
    checkItem('onboarding', '1.4', hasFile(['Residency', 'Lease', 'Utility']));
    checkItem('onboarding', '1.5', hasFile(['Income', 'Pay Stub', 'Tax']));
    // For 1.6 Assessment, check file OR if demographics are filled (proxy for intake completion)
    checkItem('onboarding', '1.6', hasFile(['Assessment']) || (!!client.demographics));
    checkItem('onboarding', '1.9', hasFile(['Authorization', 'Release']));

    // --- 2. ISP ---
    if (isp) {
      checkItem('isp', '2.1', isp.acknowledgmentInitialed);
      // 2.2 Updated ISP - logic might be complex, skip for now or check if multiple ISPs exist (not supported yet)
      checkItem('isp', '2.3', !!(isp.shortTermGoals || isp.longTermGoals));
      checkItem('isp', '2.4', (isp.identifiedBarriers && isp.identifiedBarriers.length > 0));
      checkItem('isp', '2.5', (isp.planOfAction && isp.planOfAction.length > 0));
    }

    // --- 3. Case Notes ---
    checkItem('caseNotes', '3.1', caseNotes.length > 0);
    checkItem('caseNotes', '3.2', caseNotes.length > 1);
    checkItem('caseNotes', '3.3', caseNotes.some(n => n.serviceType === 'General Check-in'));
    checkItem('caseNotes', '3.4', (isp?.supportServices?.length || 0) > 0 || caseNotes.some(n => n.serviceType === 'Supportive Service'));

    // --- 4. Workshops ---
    checkItem('workshops', '4.1', workshops.length > 0);
    // 4.2 Job Readiness - maybe check for specific workshop name?
    // 4.3 Aptitude Test - maybe file?
    checkItem('workshops', '4.4', hasFile(['Certificate']));

    if (hasChanges) {
      setAuditChecklistData(newChecklist);
    }
  }, [client, isp, attachments, caseNotes, workshops, auditChecklistData]);
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
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!client) return <div className="p-4">Client not found (ID: {clientId})</div>;

  const profile = client.profile;
  const contactInfo = client.contactInfo;
  const metadata = client.metadata;

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

  const ChecklistItem: React.FC<{ label: string; checked: boolean }> = ({ label, checked }) => (
    <div className="flex items-center text-gray-700">
      {checked ? <Check className="h-5 w-5 mr-3 text-green-500" /> : <X className="h-5 w-5 mr-3 text-red-500" />}
      <span>{label}</span>
    </div>
  );

  const StatusBadge: React.FC<{ status: Client['metadata']['status'] }> = ({ status }) => {
    const styles = {
      'Prospect': 'bg-blue-100 text-blue-800',
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>
  };

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
          <div className="space-y-6">
            <Card
              title="Client Information"
              titleAction={
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-gray-500 hover:text-gray-700"
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
                    <span>{contactInfo.phone2} (Alt)</span>
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

            <WorkshopsSection
              clientId={client.id}
              clientName={`${profile.firstName} ${profile.lastName}`}
              admins={staff.map(s => ({ id: s.uid, name: s.name }))}
            />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`${activeTab === tab
                        ? 'border-[#404E3B] text-[#404E3B]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'Intake' && <EnrollmentIntakeSection client={client} onUpdate={handleSaveClient} />}

                {activeTab === 'Case Notes' && <CaseNotesSection clientId={client.id} clientName={`${profile.firstName} ${profile.lastName}`} />}

                {activeTab === 'Contact Notes' && <ContactNotesSection clientId={client.id} />}

                {activeTab === 'ISP' && <ISPSection client={client} isp={isp} onIspUpdate={handleIspUpdate} />}

                {activeTab === 'Audit Checklist' && auditChecklistData && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Audit Checklist</h3>
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
                              {sectionKey === 'isp' ? 'ISP' : sectionKey === 'caseNotes' ? 'Case Notes' : sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}
                            </legend>
                            <div className="p-4 overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                  <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Item</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Present</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Complete</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Uploaded</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
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
                              ) : <p className="text-sm text-gray-500">No CTE programs enrolled.</p>}

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
                                  checked={Boolean(trainingData && trainingData[cert.key])}
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
                                  checked={Boolean(trainingData && trainingData[cte.key])}
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
          onDelete={handleDeleteClient}
          staff={staff}
        />
      )}
    </>
  );
};

const ClientTypeBadge: React.FC<{ clientType: Client['metadata']['clientType'] }> = ({ clientType }) => {
  const styles = {
    'Adult': 'bg-purple-100 text-purple-800',
    'Youth': 'bg-indigo-100 text-indigo-800',
    'Dislocated Worker': 'bg-orange-100 text-orange-800',
  };
  return <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[clientType]}`}>{clientType}</span>
};

export default ClientDashboardPage;