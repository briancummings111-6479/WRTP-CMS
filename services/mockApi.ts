import { Client, Task, WRTPAssessment, CaseNote, ISP, ClientAttachment, Workshop, AuditChecklist } from '../types';

// --- NEW Initial data for Audit Checklist ---
const initialAuditChecklist: AuditChecklist = {
  onboarding: [
    { id: "1.1", label: "WRTP Contact Form", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.2", label: "Completed WRTP Application", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.3", label: "Proof of Identity (e.g., ID, DL)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.4", label: "Proof of Residency", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.5", label: "Income Verification", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.6", label: "WRTP Assessment", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.9", label: "Authorization of Release", present: false, complete: false, uploaded: false, notes: "" }
  ],
  isp: [
    { id: "2.1", label: "Initial ISP Completed & Signed", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.2", label: "Updated ISP (if applicable)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.3", label: "Goals Identified", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.4", label: "Barriers Identified", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.5", label: "Action Plan", present: false, complete: false, uploaded: false, notes: "" }
  ],
  caseNotes: [
    { id: "3.1", label: "Initial Case Notes", present: false, complete: false, uploaded: false, notes: "" },
    { id: "3.2", label: "Ongoing Case Notes", present: false, complete: false, uploaded: false, notes: "" },
    { id: "3.3", label: "Participant Check-Ins", present: false, complete: false, uploaded: false, notes: "" },
    { id: "3.4", label: "Referrals & Services Provided", present: false, complete: false, uploaded: false, notes: "" }
  ],
  workshops: [
    { id: "4.1", label: "Workshop Attendance Records/Notes", present: false, complete: false, uploaded: false, notes: "" },
    { id: "4.2", label: "Job Readiness Assessments (if applicable)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "4.3", label: "Aptitude Test(s)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "4.4", label: "Certificates of Completion", present: false, complete: false, uploaded: false, notes: "" }
  ],
  misc: [
    // Per the CSV, this section is empty
  ]
};

// --- NEW Default Training Object ---
const defaultTraining = {
    cpr: false,
    firstAid: false,
    foodHandlersCard: false,
    osha10: false,
    nccer: false,
    otherCertificates: '',
    constructionCTE: false,
    cosmetologyCTE: false,
    culinaryCTE: false,
    fireCTE: false,
    medicalCTE: false,
    earlyChildhoodEducationCTE: false,
    entrepreneurshipCTE: false,
    otherCteProgram: '',
};

// Mock Data
const mockClients: Client[] = [
  {
    id: 'client001',
    googleDriveLink: 'https://docs.google.com/document/d/1_sILh2L_C_3-wS90_8vf_2P6KM-pTj_w/edit?usp=sharing&ouid=113543884879208744318&rtpof=true&sd=true',
    profile: { firstName: 'John', lastName: 'Doe', age: 34, dob: '1990-05-15' },
    contactInfo: { phone: '555-123-4567', phone2: '555-321-7654', email: 'john.doe@example.com', street: '123 Main St', apt: 'Apt 4B', city: 'Redding', state: 'CA', zip: '96001' },
    referralSource: 'Self',
    
    // --- REPLACED caseManagement ---
    auditChecklist: {
      ...initialAuditChecklist,
      onboarding: initialAuditChecklist.onboarding.map((item, i) => i < 3 ? { ...item, present: true, complete: true, uploaded: true } : item),
      isp: initialAuditChecklist.isp.map(item => item.id === "2.1" ? { ...item, present: true, complete: true, uploaded: false, notes: "Needs signature" } : item)
    },
    
    // --- UPDATED training ---
    training: {
        ...defaultTraining,
        cpr: true,
        firstAid: true,
        constructionCTE: true,
        otherCertificates: "Forklift Certified"
    },
    
    metadata: {
      createdBy: 'admin001',
      lastModifiedBy: 'admin001',
      clientType: 'CHYBA',
      status: 'Active',
      initialAppointmentDate: new Date('2023-10-20T09:00:00').getTime(),
      assignedAdminId: 'admin001',
      assignedAdminName: 'Brian Cummings',
    },
  },
  {
    id: 'client002',
    googleDriveLink: '',
    profile: { firstName: 'Jane', lastName: 'Smith', age: 28, dob: '1995-02-20' },
    contactInfo: { phone: '555-987-6543', phone2: '', email: 'jane.smith@example.com', street: '456 Oak Ave', apt: '', city: 'Redding', state: 'CA', zip: '96002' },
    referralSource: 'Shasta County',
    
    // --- REPLACED caseManagement ---
    auditChecklist: {
      ...initialAuditChecklist,
      onboarding: initialAuditChecklist.onboarding.map((item, i) => i < 1 ? { ...item, present: true, complete: false, uploaded: false, notes: "Incomplete app" } : item),
    },
    
    // --- UPDATED training ---
    training: {
        ...defaultTraining,
        foodHandlersCard: true,
        culinaryCTE: true,
    },
    
    metadata: {
      createdBy: 'admin002',
      lastModifiedBy: 'admin002',
      clientType: 'General Population',
      status: 'Prospect',
      initialAppointmentDate: new Date('2023-11-05T14:30:00').getTime(),
      assignedAdminId: 'admin002',
      assignedAdminName: 'Test Admin',
    },
  },
];

const mockTasks: Task[] = [
    { id: 'task001', clientId: 'client001', clientName: 'John Doe', assignedToId: 'admin001', assignedToName: 'Brian Cummings', createdBy: 'Brian Cummings', dueDate: new Date('2023-12-15T00:00:00').getTime(), title: 'Follow up on resume submission to Express Employment', details: '', status: 'Open', linkTo: null, urgency: 'Yellow' },
    { id: 'task002', clientId: 'client001', clientName: 'John Doe', assignedToId: 'admin001', assignedToName: 'Brian Cummings', createdBy: 'Brian Cummings', dueDate: new Date('2023-12-10T00:00:00').getTime(), title: 'Complete OSHA-10 online module', details: '', status: 'In Progress', linkTo: "https://www.osha.gov/", urgency: 'Red' },
    { id: 'task003', clientId: 'client002', clientName: 'Jane Smith', assignedToId: 'admin002', assignedToName: 'Test Admin', createdBy: 'Test Admin', dueDate: new Date('2023-12-20T00:00:00').getTime(), title: 'Schedule initial intake meeting', details: '', status: 'Open', linkTo: null, urgency: 'Green' },
    { id: 'task004', clientId: 'client001', clientName: 'John Doe', assignedToId: 'admin001', assignedToName: 'Brian Cummings', createdBy: 'Brian Cummings', dueDate: new Date('2023-11-30T00:00:00').getTime(), title: 'Review ID and Social Security card', details: '', status: 'Completed', linkTo: null, urgency: 'Green' },
]

const mockISPs: ISP[] = [
    {
        id: 'isp001',
        clientId: 'client001',
        ispDate: new Date('2023-10-25T00:00:00').getTime(),
        jobDeveloper: 'Brian Cummings',
        acknowledgmentInitialed: true,
        shortTermGoals: 'Secure full-time employment in construction.',
        longTermGoals: 'Obtain NCCER certification and become a site foreman.',
        identifiedBarriers: ['Transportation', 'Childcare'],
        careerPlanning: {
            workshopsAssigned: 'Resume Building, Interview Skills',
            enrolledInCteOrCollege: true,
        },
        planOfAction: [
            { id: 'poa1', goal: 'Get Driver\'s License', action: 'Study for written test, schedule DMV appt', responsibleParty: 'Client', targetDate: '2023-12-31', reviewDate: '2023-12-01', completionDate: '' },
            { id: 'poa2', goal: 'Secure Childcare', action: 'Apply for RCOE childcare program', responsibleParty: 'Client/Case Manager', targetDate: '2023-11-30', reviewDate: '2023-11-15', completionDate: '2023-11-20' },
        ],
        supportServices: [
            { id: 'ss1', agency: 'Shasta County RCOE', referralDate: '2023-11-01', outcome: 'Enrolled' },
            { id: 'ss2', agency: 'DMV', referralDate: '2023-11-01', outcome: 'Pending' },
        ]
    }
]

const mockCaseNotes: CaseNote[] = [
    { id: 'note001', clientId: 'client001', staffId: 'admin001', staffName: 'Brian Cummings', noteDate: new Date('2023-11-10T10:00:00').getTime(), noteType: 'Case Note', urgency: 'Green', serviceType: 'General Check-in', contactMethod: 'Phone', durationMinutes: 15, noteBody: '<p>Called John to check on progress for DMV test studying. He reports he has completed 2 practice tests and feels confident. Set follow-up for next week.</p>', attachments: [] },
    { id: 'note002', clientId: 'client001', staffId: 'admin001', staffName: 'Brian Cummings', noteDate: new Date('2023-11-01T11:30:00').getTime(), noteType: 'Contact Note', urgency: 'Yellow', serviceType: 'Supportive Service', contactMethod: 'CHYBA Office', durationMinutes: 45, noteBody: '<p>Met with John to discuss childcare options. Provided RCOE program details and application. Client signed ROI for RCOE.</p>', attachments: [] },
    { id:ANd9GcQ, clientId: 'client002', staffId: 'admin002', staffName: 'Test Admin', noteDate: new Date('2023-11-05T14:30:00').getTime(), noteType: 'Case Note', urgency: 'Green', serviceType: 'Intake Meeting', contactMethod: 'Hartnell Office', durationMinutes: 60, noteBody: '<p>Initial intake for Jane Smith. Referred by Shasta County. Interested in Culinary CTE. Provided application packet and scheduled follow-up assessment.</p>', attachments: [] },
]

const mockAttachments: ClientAttachment[] = [
    { id: 'att001', clientId: 'client001', fileName: 'JohnDoe_Resume_v2.pdf', fileType: 'application/pdf', fileSize: 134288, storageUrl: '#', uploadedBy: 'Brian Cummings', uploadDate: new Date('2023-10-28T00:00:00').getTime() },
    { id: 'att002', clientId: 'client001', fileName: 'JohnDoe_ID.png', fileType: 'image/png', fileSize: 812090, storageUrl: '#', uploadedBy: 'Brian Cummings', uploadDate: new Date('2023-10-25T00:00:00').getTime() },
]

const mockWorkshops: Workshop[] = [
    { id: 'wshp001', clientId: 'client001', workshopDate: new Date('2023-11-20T00:00:00').getTime(), workshopName: 'Resume Building', workshopNameOther: '', status: 'Completed', assignedToId: 'admin001', assignedToName: 'Brian Cummings' },
    { id: 'wshp002', clientId: 'client001', workshopDate: new Date('2023-11-28T00:00:00').getTime(), workshopName: 'Interview Success', workshopNameOther: '', status: 'Scheduled', assignedToId: 'admin001', assignedToName: 'Brian Cummings' }
]

const mockAdmins = [
    { id: 'admin001', name: 'Brian Cummings' },
    { id: 'admin002', name: 'Test Admin' },
    { id: 'admin003', name: 'Jane Doe' },
]

// API Latency Simulation
const FAKE_LATENCY = 200;

// Helper to calculate age
const calculateAge = (dobString: string): number => {
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

// Mock API
const api = {
  // ... (getClients, getClientById, getAdmins) ...
  getClients: (): Promise<Client[]> => new Promise(resolve => setTimeout(() => resolve(mockClients), FAKE_LATENCY)),
  getClientById: (id: string): Promise<Client | undefined> => new Promise(resolve => setTimeout(() => resolve(mockClients.find(c => c.id === id)), FAKE_LATENCY)),
  getAdmins: (): Promise<{ id: string, name: string }[]> => new Promise(resolve => setTimeout(() => resolve(mockAdmins), FAKE_LATENCY)),

  updateClient: (updatedClient: Client): Promise<Client> => new Promise(resolve => {
    setTimeout(() => {
        const index = mockClients.findIndex(c => c.id === updatedClient.id);
        if (index > -1) {
            // Recalculate age if DOB changed
            const age = calculateAge(updatedClient.profile.dob || '');
            mockClients[index] = {
                ...updatedClient,
                profile: {
                    ...updatedClient.profile,
                    age: age
                }
            };
            resolve(mockClients[index]);
        } else {
            // In a real app, this would be an error
            resolve(updatedClient); 
        }
    }, FAKE_LATENCY);
  }),

  addClient: (clientData: any, creatorId: string): Promise<Client> => new Promise(resolve => {
    setTimeout(() => {
        const now = new Date();
        const age = calculateAge(clientData.profile.dob || '');

        const newClient: Client = {
            id: `client${Math.random().toString(36).substr(2, 9)}`,
            googleDriveLink: clientData.googleDriveLink || '',
            profile: {
                ...clientData.profile,
                age: age,
            },
            contactInfo: {
                ...clientData.contactInfo,
                // Ensure all fields are present even if empty
                phone2: clientData.contactInfo.phone2 || '',
                email: clientData.contactInfo.email || '',
                apt: clientData.contactInfo.apt || '',
            },
            referralSource: clientData.referralSource || 'Manual Entry',
            
            // --- REPLACED caseManagement ---
            auditChecklist: initialAuditChecklist,
            
            // --- UPDATED training ---
            training: defaultTraining,
            
            metadata: {
                ...clientData.metadata,
                createdBy: creatorId,
                lastModifiedBy: creatorId,
                initialAppointmentDate: now.getTime(),
            },
        };
        mockClients.unshift(newClient);
        resolve(newClient);
    }, FAKE_LATENCY);
  }),

  // ... (Task functions) ...
  getTasksByClientId: (clientId: string): Promise<Task[]> => new Promise(resolve => setTimeout(() => resolve(mockTasks.filter(t => t.clientId === clientId)), FAKE_LATENCY)),
  upsertTask: (taskData: Partial<Task>): Promise<Task> => new Promise(resolve => {
      setTimeout(() => {
          if (taskData.id) { // Update
              const index = mockTasks.findIndex(t => t.id === taskData.id);
              if (index > -1) {
                  mockTasks[index] = { ...mockTasks[index], ...taskData } as Task;
                  resolve(mockTasks[index]);
              }
          } else { // Create
              const newTask: Task = {
                  id: `task${Math.random().toString(36).substr(2, 9)}`,
                  ...taskData
              } as Task; // This is a mock, in real app we'd validate
              mockTasks.push(newTask);
              resolve(newTask);
          }
      }, FAKE_LATENCY);
  }),
  deleteTask: (taskId: string): Promise<void> => new Promise(resolve => {
      setTimeout(() => {
          const index = mockTasks.findIndex(t => t.id === taskId);
          if (index > -1) {
              mockTasks.splice(index, 1);
          }
          resolve();
      }, FAKE_LATENCY);
  }),

  // ... (ISP functions) ...
  getISPByClientId: (clientId: string): Promise<ISP | null> => new Promise(resolve => setTimeout(() => resolve(mockISPs.find(i => i.clientId === clientId) || null), FAKE_LATENCY)),
  upsertISP: (ispData: ISP): Promise<ISP> => new Promise(resolve => {
      setTimeout(() => {
          const index = mockISPs.findIndex(i => i.id === ispData.id);
          if (index > -1) {
              mockISPs[index] = ispData;
          } else {
              mockISPs.push(ispData);
          }
          resolve(ispData);
      }, FAKE_LATENCY);
  }),

  // ... (Case Note functions) ...
  getCaseNotesByClientId: (clientId: string): Promise<CaseNote[]> => new Promise(resolve => setTimeout(() => resolve(mockCaseNotes.filter(n => n.clientId === clientId).sort((a,b) => b.noteDate - a.noteDate)), FAKE_LATENCY)),
  addCaseNote: (noteData: Omit<CaseNote, 'id'>): Promise<CaseNote> => new Promise(resolve => {
      setTimeout(() => {
          const newNote: CaseNote = {
              id: `note${Math.random().toString(36).substr(2, 9)}`,
              ...noteData
          };
          mockCaseNotes.push(newNote);
          resolve(newNote);
      }, FAKE_LATENCY);
  }),

  // ... (Attachment functions) ...
  getAttachmentsByClientId: (clientId: string): Promise<ClientAttachment[]> => new Promise(resolve => setTimeout(() => resolve(mockAttachments.filter(a => a.clientId === clientId).sort((a,b) => b.uploadDate - a.uploadDate)), FAKE_LATENCY)),
  addAttachment: (attachmentData: Omit<ClientAttachment, 'id'>): Promise<ClientAttachment> => new Promise(resolve => {
      setTimeout(() => {
          const newAttachment: ClientAttachment = {
              id: `att${Math.random().toString(36).substr(2, 9)}`,
              ...attachmentData
          };
          mockAttachments.push(newAttachment);
          resolve(newAttachment);
      }, FAKE_LATENCY);
  }),
  deleteAttachment: (attachmentId: string): Promise<void> => new Promise(resolve => {
      setTimeout(() => {
          const index = mockAttachments.findIndex(a => a.id === attachmentId);
          if (index > -1) {
              mockAttachments.splice(index, 1);
          }
          resolve();
      }, FAKE_LATENCY);
  }),

  // ... (Workshop functions) ...
  getWorkshopsByClientId: (clientId: string): Promise<Workshop[]> => new Promise(resolve => setTimeout(() => resolve(mockWorkshops.filter(w => w.clientId === clientId).sort((a,b) => b.workshopDate - a.workshopDate)), FAKE_LATENCY)),
  addWorkshop: (workshopData: Omit<Workshop, 'id'>): Promise<Workshop> => new Promise(resolve => {
      setTimeout(() => {
          const newWorkshop: Workshop = {
              id: `wshp${Math.random().toString(36).substr(2, 9)}`,
              ...workshopData
          };
          mockWorkshops.push(newWorkshop);
          resolve(newWorkshop);
      }, FAKE_LATENCY);
  }),
  deleteWorkshop: (workshopId: string): Promise<void> => new Promise(resolve => {
      setTimeout(() => {
          const index = mockWorkshops.findIndex(w => w.id === workshopId);
          if (index > -1) {
              mockWorkshops.splice(index, 1);
          }
          resolve();
      }, FAKE_LATENCY);
  }),

  // ... (Assessment functions) ...
  getAssessmentByClientId: (clientId: string): Promise<WRTPAssessment | null> => new Promise(resolve => setTimeout(() => resolve(null), FAKE_LATENCY)), // Mock: No assessment found
};

export default api;