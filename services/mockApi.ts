import { Client, Task, WRTPAssessment, CaseNote, ISP, ClientAttachment, Workshop } from '../types';

// Mock Data
const mockClients: Client[] = [
  {
    id: 'client001',
    googleDriveLink: 'https://docs.google.com/document/d/1_sILh2L_C_3-wS90_8vf_2P6KM-pTj_w/edit?usp=sharing&ouid=113543884879208744318&rtpof=true&sd=true',
    profile: { firstName: 'John', lastName: 'Doe', age: 34, dob: '1990-05-15' },
    contactInfo: { phone: '555-123-4567', phone2: '555-321-7654', email: 'john.doe@example.com', street: '123 Main St', apt: 'Apt 4B', city: 'Redding', state: 'CA', zip: '96001' },
    referralSource: 'Self',
    caseManagement: {
        applicationPacket: true,
        id: true,
        proofOfIncome: true,
        initialAssessment: false,
        roi: true,
        ispCompleted: false,
    },
    training: {
        cpr: true,
        firstAid: true,
        foodHandlersCard: false,
        constructionCTE: true,
        cosmetologyCTE: false,
        culinaryCTE: false,
        fireCTE: false,
        medicalCTE: false,
    },
    metadata: { createdBy: 'admin001', lastModifiedBy: 'admin001', clientType: 'General Population', status: 'Active', initialAppointmentDate: new Date('2023-09-25').getTime(), assignedAdminId: 'admin001', assignedAdminName: 'Crystal Rhoderick' },
  },
  {
    id: 'client002',
    googleDriveLink: '',
    profile: { firstName: 'Jane', lastName: 'Smith', age: 28, dob: '1996-08-20' },
    contactInfo: { phone: '555-987-6543', email: 'jane.smith@example.com', street: '456 Oak Ave', city: 'Anderson', state: 'CA', zip: '96007' },
    referralSource: 'Job Center',
    caseManagement: {
        applicationPacket: false,
        id: false,
        proofOfIncome: false,
        initialAssessment: false,
        roi: false,
        ispCompleted: false,
    },
    training: {
        cpr: false,
        firstAid: false,
        foodHandlersCard: false,
        constructionCTE: false,
        cosmetologyCTE: false,
        culinaryCTE: false,
        fireCTE: false,
        medicalCTE: true,
    },
    metadata: { createdBy: 'admin002', lastModifiedBy: 'admin002', clientType: 'CHYBA', status: 'Prospect', initialAppointmentDate: new Date('2024-01-15').getTime(), assignedAdminId: 'admin002', assignedAdminName: 'Robin Ivins' },
  }
];

const mockWorkshops: Workshop[] = [
    { id: 'ws001', clientId: 'client001', workshopDate: new Date('2024-08-10T09:00:00').getTime(), workshopName: 'Financial Literacy', status: 'Scheduled', assignedToId: 'admin001', assignedToName: 'Crystal Rhoderick', associatedTaskId: 'taskWS001' },
    { id: 'ws002', clientId: 'client001', workshopDate: new Date('2024-05-20T13:00:00').getTime(), workshopName: 'Interview Success', status: 'Completed', assignedToId: 'admin001', assignedToName: 'Crystal Rhoderick' },
    { id: 'ws003', clientId: 'client002', workshopDate: new Date('2024-08-15T10:00:00').getTime(), workshopName: 'Career Explorations', status: 'Scheduled', assignedToId: 'admin002', assignedToName: 'Robin Ivins', associatedTaskId: 'taskWS003' },
    { id: 'ws004', clientId: 'client001', workshopDate: new Date('2024-04-15T10:00:00').getTime(), workshopName: 'Other', workshopNameOther: 'Welding Safety Seminar', status: 'Completed', assignedToId: 'admin001', assignedToName: 'Crystal Rhoderick' },
];

const mockTasks: Task[] = [
    { id: 'task001', clientId: 'client001', clientName: 'John Doe', assignedToId: 'admin001', assignedToName: 'Crystal Rhoderick', createdBy: 'Crystal Rhoderick', dueDate: new Date().setDate(new Date().getDate() + 7), title: '90-day retention follow-up', details: 'Call John to check on employment status for 90-day retention.', status: 'In Progress', linkTo: '/clients/client001/isp', urgency: 'Yellow' },
    { id: 'task002', clientId: 'client002', clientName: 'Jane Smith', assignedToId: 'admin001', assignedToName: 'Crystal Rhoderick', createdBy: 'System', dueDate: new Date().setDate(new Date().getDate() + 2), title: 'Client is Job Ready - Begin placement', details: 'Status changed to Job Ready. Start placement activities.', status: 'Open', linkTo: '/clients/client002', urgency: 'Red' },
    { id: 'task003', clientId: 'client002', clientName: 'Jane Smith', assignedToId: 'admin002', assignedToName: 'Robin Ivins', createdBy: 'Crystal Rhoderick', dueDate: new Date().setDate(new Date().getDate() + 14), title: 'Follow up on resume draft', details: 'Check in with Jane about her resume progress.', status: 'Waiting', linkTo: '/clients/client002', urgency: 'Green' },
    { id: 'task004', clientId: 'client001', clientName: 'John Doe', assignedToId: 'admin001', assignedToName: 'Crystal Rhoderick', createdBy: 'Crystal Rhoderick', dueDate: new Date().setDate(new Date().getDate() - 30), title: 'Complete ISP', details: 'Finalize initial Individual Service Plan.', status: 'Completed', linkTo: '/clients/client001/isp', urgency: 'Green' },
    { id: 'taskWS001', clientId: 'client001', clientName: 'John Doe', assignedToId: 'admin001', assignedToName: 'Crystal Rhoderick', createdBy: 'System', dueDate: new Date('2024-08-10T09:00:00').getTime(), title: 'Workshop: Financial Literacy', details: 'Client is scheduled for the Financial Literacy workshop.', status: 'Open', linkTo: '/clients/client001', urgency: 'Green' },
    { id: 'taskWS003', clientId: 'client002', clientName: 'Jane Smith', assignedToId: 'admin002', assignedToName: 'Robin Ivins', createdBy: 'System', dueDate: new Date('2024-08-15T10:00:00').getTime(), title: 'Workshop: Career Explorations', details: 'Client is scheduled for the Career Explorations workshop.', status: 'Open', linkTo: '/clients/client002', urgency: 'Green' },
];

const mockAssessments: WRTPAssessment[] = [
    { id: 'assess001', clientId: 'client001', assessmentName: 'WRTP Participant Assessment', dateTaken: new Date('2023-10-05').getTime(), motivationScale: 3, serviceNeeds: 'Needs help with resume building.', strengths: 'Hard worker, eager to learn.', thingsGoingWell: 'Family is supportive.', supportSystem: 'Spouse.', selfCare: 'Goes fishing on weekends.', hobbies: 'Fishing, woodwork.' },
    { id: 'assess002', clientId: 'client001', assessmentName: 'WRTP Participant Assessment', dateTaken: new Date('2024-01-15').getTime(), motivationScale: 4, serviceNeeds: 'Interview practice.', strengths: 'More confident in skills.', thingsGoingWell: 'Completed training.', supportSystem: 'Spouse and instructors.', selfCare: 'Goes fishing on weekends.', hobbies: 'Fishing, woodwork.' },
    { id: 'assess003', clientId: 'client001', assessmentName: 'WRTP Participant Assessment', dateTaken: new Date('2024-04-20').getTime(), motivationScale: 5, serviceNeeds: 'None at this time.', strengths: 'Confident and employed.', thingsGoingWell: 'New job is going great.', supportSystem: 'Family and new coworkers.', selfCare: 'Goes fishing on weekends.', hobbies: 'Fishing, woodwork.' }
];

const mockCaseNotes: CaseNote[] = [
    { id: 'note001', clientId: 'client001', staffId: 'admin001', staffName: 'Crystal Rhoderick', noteDate: new Date('2024-04-15').getTime(), noteType: 'Contact Note', urgency: 'Green', serviceType: 'General Check-in', contactMethod: 'Phone', durationMinutes: 15, noteBody: '<p>Checked in with John regarding his 30-day progress at new job. Reports everything is going well. No issues to report.</p>', attachments: [] },
    { id: 'note002', clientId: 'client001', staffId: 'admin001', staffName: 'Crystal Rhoderick', noteDate: new Date('2024-03-10').getTime(), noteType: 'Case Note', urgency: 'Yellow', serviceType: 'Job Search', contactMethod: 'Hartnell Office', durationMinutes: 60, noteBody: '<p><b>Final interview prep session.</b></p><ul><li>Reviewed common questions.</li><li>Practiced STAR method.</li><li>Confirmed interview time and location.</li></ul><p>Client feels confident.</p>', attachments: [{ fileName: 'interview_prep.pdf', storageUrl: 'gs://chwrtp-files/...' }] },
    { id: 'note003', clientId: 'client001', staffId: 'admin002', staffName: 'Robin Ivins', noteDate: new Date('2024-02-20').getTime(), noteType: 'Case Note', urgency: 'Red', serviceType: 'Intake Meeting', contactMethod: 'Hartnell Office', durationMinutes: 90, noteBody: '<p>Initial intake meeting with Jane. She is highly motivated but facing significant barriers with childcare. Referred to supportive services. Created initial ISP.</p>', attachments: [] },
    { id: 'note004', clientId: 'client002', staffId: 'admin002', staffName: 'Robin Ivins', noteDate: new Date('2024-01-15').getTime(), noteType: 'Case Note', urgency: 'Green', serviceType: 'Intake Meeting', contactMethod: 'Hartnell Office', durationMinutes: 120, noteBody: '<p>Conducted intake meeting with Jane Smith. Discussed program requirements and completed initial paperwork. Client is enthusiastic and ready to start.</p>', attachments: [] },
];

const mockISPs: ISP[] = [
    { 
      id: 'isp001', 
      clientId: 'client001', 
      ispDate: new Date('2023-10-10').getTime(), 
      jobDeveloper: 'Robin Ivins',
      acknowledgmentInitialed: true, 
      shortTermGoals: '1. Complete welding training program.\n2. Create a professional resume.\n3. Attend a job fair.', 
      longTermGoals: '1. Secure a full-time welding position with benefits.\n2. Obtain an advanced welding certification.', 
      identifiedBarriers: ['Transportation', 'Limited work experience'], 
      careerPlanning: { workshopsAssigned: 'Job Preparedness, Interview Success', enrolledInCteOrCollege: true },
      planOfAction: [
        { id: 'poa1', goal: 'Training Completion', action: 'Attend all welding classes and labs.', responsibleParty: 'John Doe', targetDate: '2023-12-10', reviewDate: '2023-12-15', completionDate: '2024-02-28' },
        { id: 'poa2', goal: 'Job Readiness', action: 'Meet with Job Developer to finalize resume.', responsibleParty: 'John Doe & Robin Ivins', targetDate: '2024-03-01', reviewDate: '2024-03-05', completionDate: '2024-03-10' },
      ],
      supportServices: [
        { id: 'ss1', agency: 'Shasta County HHSA', referralDate: '2023-10-12', outcome: 'Received bus passes for transportation.' },
      ]
    },
];

const mockClientAttachments: ClientAttachment[] = [
    { id: 'attach001', clientId: 'client001', fileName: 'John Doe - Resume.pdf', fileType: 'application/pdf', fileSize: 123456, storageUrl: '#', uploadedBy: 'Crystal Rhoderick', uploadDate: new Date('2023-10-02').getTime() },
    { id: 'attach002', clientId: 'client001', fileName: 'State ID Scan.jpeg', fileType: 'image/jpeg', fileSize: 876543, storageUrl: '#', uploadedBy: 'Crystal Rhoderick', uploadDate: new Date('2023-09-28').getTime() },
    { id: 'attach003', clientId: 'client002', fileName: 'Intake Form Signed.pdf', fileType: 'application/pdf', fileSize: 234567, storageUrl: '#', uploadedBy: 'Robin Ivins', uploadDate: new Date('2024-01-15').getTime() },
];

const mockAdmins = [
    { id: 'unassigned', name: 'Unassigned' },
    { id: 'admin001', name: 'Crystal Rhoderick' },
    { id: 'admin002', name: 'Robin Ivins' }
];

// API Functions
const FAKE_LATENCY = 500;

type CaseNoteData = Omit<CaseNote, 'id'>;
type NewClientData = Omit<Client, 'id' | 'metadata' | 'profile' | 'caseManagement' | 'training'> & {
    profile: {
        firstName: string;
        lastName: string;
        dob: string;
    };
    contactInfo: {
        phone: string;
        email: string;
    };
    referralSource: string;
    googleDriveLink?: string;
    metadata: {
        assignedAdminId: string;
        assignedAdminName: string;
        clientType: Client['metadata']['clientType'];
        status: Client['metadata']['status'];
    };
};
type NewAttachmentData = Omit<ClientAttachment, 'id'>;


const api = {
  getClients: (): Promise<Client[]> => new Promise(resolve => setTimeout(() => resolve([...mockClients].sort((a,b) => a.profile.lastName.localeCompare(b.profile.lastName))), FAKE_LATENCY)),
  getClientById: (id: string): Promise<Client | undefined> => new Promise(resolve => setTimeout(() => resolve(mockClients.find(c => c.id === id)), FAKE_LATENCY)),
  getTasks: (): Promise<Task[]> => new Promise(resolve => setTimeout(() => resolve(mockTasks), FAKE_LATENCY)),
  getTasksByClientId: (clientId: string): Promise<Task[]> => new Promise(resolve => setTimeout(() => resolve(mockTasks.filter(t => t.clientId === clientId)), FAKE_LATENCY)),
  getTasksByAssigneeId: (assigneeId: string): Promise<Task[]> => new Promise(resolve => setTimeout(() => resolve(mockTasks.filter(t => t.assignedToId === assigneeId)), FAKE_LATENCY)),
  getAssessmentsByClientId: (clientId: string): Promise<WRTPAssessment[]> => new Promise(resolve => setTimeout(() => resolve(mockAssessments.filter(a => a.clientId === clientId)), FAKE_LATENCY)),
  getCaseNotesByClientId: (clientId: string): Promise<CaseNote[]> => new Promise(resolve => setTimeout(() => resolve(mockCaseNotes.filter(n => n.clientId === clientId).sort((a,b) => b.noteDate - a.noteDate)), FAKE_LATENCY)),
  getAllCaseNotes: (): Promise<CaseNote[]> => new Promise(resolve => setTimeout(() => resolve([...mockCaseNotes]), FAKE_LATENCY)),
  getISPByClientId: (clientId: string): Promise<ISP | undefined> => new Promise(resolve => setTimeout(() => resolve(mockISPs.find(i => i.clientId === clientId)), FAKE_LATENCY)),
  getAllISPs: (): Promise<ISP[]> => new Promise(resolve => setTimeout(() => resolve([...mockISPs]), FAKE_LATENCY)),
  getAdmins: (): Promise<{id: string, name: string}[]> => new Promise(resolve => setTimeout(() => resolve(mockAdmins), FAKE_LATENCY)),
  getAttachmentsByClientId: (clientId: string): Promise<ClientAttachment[]> => new Promise(resolve => setTimeout(() => resolve(mockClientAttachments.filter(a => a.clientId === clientId).sort((a,b) => b.uploadDate - a.uploadDate)), FAKE_LATENCY)),
  getWorkshopsByClientId: (clientId: string): Promise<Workshop[]> => new Promise(resolve => {
    setTimeout(() => {
        const workshops = mockWorkshops.filter(w => w.clientId === clientId).sort((a,b) => b.workshopDate - a.workshopDate);
        resolve(workshops);
    }, FAKE_LATENCY);
  }),
  getAllWorkshops: (): Promise<Workshop[]> => new Promise(resolve => {
    setTimeout(() => {
        resolve([...mockWorkshops]);
    }, FAKE_LATENCY);
  }),
  upsertWorkshop: (workshopData: Omit<Workshop, 'id'> & { id?: string }): Promise<Workshop> => new Promise(resolve => {
    setTimeout(() => {
        let savedWorkshop: Workshop;
        const oldWorkshop = workshopData.id ? mockWorkshops.find(w => w.id === workshopData.id) : undefined;
        
        // Upsert workshop
        if (workshopData.id && oldWorkshop) {
            const index = mockWorkshops.findIndex(w => w.id === workshopData.id);
            savedWorkshop = { ...oldWorkshop, ...workshopData };
            mockWorkshops[index] = savedWorkshop;
        } else {
            savedWorkshop = {
                ...workshopData,
                id: `ws${Math.random().toString(36).substr(2, 9)}`,
            } as Workshop;
            mockWorkshops.push(savedWorkshop);
        }

        const associatedTask = savedWorkshop.associatedTaskId ? mockTasks.find(t => t.id === savedWorkshop.associatedTaskId) : undefined;
        const workshopTitle = `Workshop: ${savedWorkshop.workshopName === 'Other' ? savedWorkshop.workshopNameOther : savedWorkshop.workshopName}`;

        if (savedWorkshop.status === 'Scheduled') {
            if (associatedTask) {
                // Update existing task
                associatedTask.dueDate = savedWorkshop.workshopDate;
                associatedTask.title = workshopTitle;
                associatedTask.assignedToId = savedWorkshop.assignedToId;
                associatedTask.assignedToName = savedWorkshop.assignedToName;
                associatedTask.status = 'Open';
            } else {
                // Create new task
                const client = mockClients.find(c => c.id === savedWorkshop.clientId);
                const newTask: Task = {
                    id: `task${Math.random().toString(36).substr(2, 9)}`,
                    clientId: savedWorkshop.clientId,
                    clientName: client ? `${client.profile.firstName} ${client.profile.lastName}` : 'Unknown Client',
                    assignedToId: savedWorkshop.assignedToId,
                    assignedToName: savedWorkshop.assignedToName,
                    createdBy: 'System',
                    dueDate: savedWorkshop.workshopDate,
                    title: workshopTitle,
                    details: `Client is scheduled for the ${workshopTitle} workshop.`,
                    status: 'Open',
                    linkTo: `/clients/${savedWorkshop.clientId}`,
                    urgency: 'Green',
                };
                mockTasks.push(newTask);
                // Link task to workshop
                savedWorkshop.associatedTaskId = newTask.id;
            }
        } else { // Status is Completed, Declined, No Show
            if (associatedTask) {
                // Complete the task
                associatedTask.status = 'Completed';
            }
        }
        
        resolve(savedWorkshop);
    }, FAKE_LATENCY);
  }),
  deleteWorkshop: (workshopId: string): Promise<{ success: boolean }> => new Promise(resolve => {
      setTimeout(() => {
          const index = mockWorkshops.findIndex(w => w.id === workshopId);
          if (index !== -1) {
              const workshopToDelete = mockWorkshops[index];
              // Delete associated task
              if (workshopToDelete.associatedTaskId) {
                  const taskIndex = mockTasks.findIndex(t => t.id === workshopToDelete.associatedTaskId);
                  if (taskIndex !== -1) {
                      mockTasks.splice(taskIndex, 1);
                  }
              }
              mockWorkshops.splice(index, 1);
              resolve({ success: true });
          } else {
              resolve({ success: false });
          }
      }, FAKE_LATENCY);
  }),
  upsertTask: (taskData: Omit<Task, 'id'> & { id?: string }): Promise<Task> => new Promise(resolve => {
    setTimeout(() => {
        if (taskData.id) {
            const index = mockTasks.findIndex(t => t.id === taskData.id);
            if (index !== -1) {
                const updatedTask = { ...mockTasks[index], ...taskData } as Task;
                mockTasks[index] = updatedTask;
                resolve(updatedTask);
            }
        } else {
            const newTask: Task = {
                details: '',
                linkTo: null,
                status: 'Open',
                ...taskData,
                id: `task${Math.random().toString(36).substr(2, 9)}`,
            } as Task;
            mockTasks.push(newTask);
            resolve(newTask);
        }
    }, FAKE_LATENCY);
  }),
  deleteTask: (taskId: string): Promise<{ success: boolean }> => new Promise(resolve => {
      setTimeout(() => {
          const index = mockTasks.findIndex(t => t.id === taskId);
          if (index !== -1) {
              mockTasks.splice(index, 1);
              resolve({ success: true });
          } else {
              resolve({ success: false });
          }
      }, FAKE_LATENCY);
  }),
  addClientAttachment: (attachmentData: NewAttachmentData): Promise<ClientAttachment> => new Promise(resolve => {
    setTimeout(() => {
        const newAttachment: ClientAttachment = {
            ...attachmentData,
            id: `attach${Math.random().toString(36).substr(2, 9)}`,
        };
        mockClientAttachments.push(newAttachment);
        resolve(newAttachment);
    }, FAKE_LATENCY);
  }),
  addCaseNote: (noteData: CaseNoteData): Promise<CaseNote> => new Promise(resolve => {
    setTimeout(() => {
        const newNote: CaseNote = {
            ...noteData,
            id: `note${Math.random().toString(36).substr(2, 9)}`,
        };
        mockCaseNotes.push(newNote);
        resolve(newNote);
    }, FAKE_LATENCY);
  }),
  updateCaseNote: (noteData: CaseNote): Promise<CaseNote> => new Promise((resolve, reject) => {
    setTimeout(() => {
        const index = mockCaseNotes.findIndex(n => n.id === noteData.id);
        if (index !== -1) {
            mockCaseNotes[index] = noteData;
            resolve(noteData);
        } else {
            reject(new Error("Case note not found"));
        }
    }, FAKE_LATENCY);
  }),
  upsertISP: (ispData: Omit<ISP, 'id'> & { id?: string }): Promise<ISP> => new Promise(resolve => {
    setTimeout(() => {
        const existingIspIndex = mockISPs.findIndex(i => i.clientId === ispData.clientId);
        if (existingIspIndex !== -1) {
            const updatedIsp = { ...mockISPs[existingIspIndex], ...ispData };
            mockISPs[existingIspIndex] = updatedIsp;
            resolve(updatedIsp);
        } else {
            const newIsp: ISP = {
                ...ispData,
                id: `isp${Math.random().toString(36).substr(2, 9)}`,
            };
            mockISPs.push(newIsp);
            resolve(newIsp);
        }
    }, FAKE_LATENCY);
  }),
  submitIntakeForm: (data: any): Promise<{success: boolean}> => new Promise(resolve => {
    console.log("Submitting intake data to Cloud Function:", data);
    setTimeout(() => resolve({ success: true }), 1000)
  }),
  updateClient: (updatedClient: Client): Promise<Client> => new Promise((resolve, reject) => {
    setTimeout(() => {
      const clientIndex = mockClients.findIndex(c => c.id === updatedClient.id);
      if (clientIndex !== -1) {
        mockClients[clientIndex] = updatedClient;
        resolve(updatedClient);
      } else {
        reject(new Error("Client not found"));
      }
    }, FAKE_LATENCY);
  }),
  addClient: (clientData: NewClientData, creatorId: string): Promise<Client> => new Promise(resolve => {
    setTimeout(() => {
        const now = new Date();
        const dob = new Date(clientData.profile.dob);
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
            age--;
        }

        const newClient: Client = {
            id: `client${Math.random().toString(36).substr(2, 9)}`,
            googleDriveLink: clientData.googleDriveLink || '',
            profile: {
                ...clientData.profile,
                age: age,
            },
            contactInfo: {
                ...clientData.contactInfo,
                street: '',
                city: '',
                state: '',
                zip: '',
            },
            referralSource: clientData.referralSource || 'Manual Entry',
            caseManagement: {
                applicationPacket: false,
                id: false,
                proofOfIncome: false,
                initialAssessment: false,
                roi: false,
                ispCompleted: false,
            },
            training: {
                cpr: false,
                firstAid: false,
                foodHandlersCard: false,
                constructionCTE: false,
                cosmetologyCTE: false,
                culinaryCTE: false,
                fireCTE: false,
                medicalCTE: false,
            },
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
};

export default api;
