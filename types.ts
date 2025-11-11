

// User and Auth
export type UserRole = 'admin' | 'viewer';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

// Main Client Data Model
export interface Client {
  id: string;
  googleDriveLink?: string;
  profile: {
    firstName: string;
    lastName: string;
    dob: string; // YYYY-MM-DD
    age: number;
  };
  contactInfo: {
    phone: string;
    phone2?: string;
    email: string;
    street: string;
    apt?: string;
    city: string;
    state: string;
    zip: string;
  };
  referralSource: string;

  caseManagement: {
    applicationPacket: boolean;
    id: boolean;
    proofOfIncome: boolean;
    initialAssessment: boolean;
    roi: boolean;
    ispCompleted: boolean;
  };

  training: {
      cpr: boolean;
      firstAid: boolean;
      foodHandlersCard: boolean;
      constructionCTE: boolean;
      cosmetologyCTE: boolean;
      culinaryCTE: boolean;
      fireCTE: boolean;
      medicalCTE: boolean;
  };

  metadata: {
    createdBy: string; // UID
    lastModifiedBy: string; // UID
    clientType: 'General Population' | 'CHYBA';
    status: 'Prospect' | 'Active' | 'Inactive';
    initialAppointmentDate: number; // Timestamp
    assignedAdminId: string; // UID
    assignedAdminName: string;
  };
}


// Task Data Model
export interface Task {
  id: string;
  clientId: string;
  clientName: string;
  assignedToId: string; // UID
  assignedToName: string;
  createdBy: string; // Name
  dueDate: number; // Timestamp
  title: string;
  details: string;
  status: 'Open' | 'In Progress' | 'Waiting' | 'Completed';
  linkTo: string | null;
  urgency: 'Green' | 'Yellow' | 'Red';
}

// Case Note Model
export interface CaseNote {
  id: string;
  clientId: string;
  staffId: string; // UID
  staffName: string;
  noteDate: number; // Timestamp
  noteType: 'Case Note' | 'Contact Note';
  urgency: 'Green' | 'Yellow' | 'Red';
  serviceType: 'Job Search' | 'Supportive Service' | 'Training' | 'Intake Meeting' | 'ISP Review' | 'General Check-in';
  contactMethod: 'Hartnell Office' | 'CHYBA Office' | 'Offsite' | 'Phone' | 'Text Message' | 'Email' | 'Other';
  durationMinutes: number;
  noteBody: string; // HTML
  attachments: { fileName: string; storageUrl: string }[];
}


// Assessment Model
export interface WRTPAssessment {
  id: string;
  clientId: string;
  assessmentName: 'WRTP Participant Assessment';
  dateTaken: number; // Timestamp
  motivationScale: number; // 0-5
  serviceNeeds: string;
  strengths: string;
  thingsGoingWell: string;
  supportSystem: string;
  selfCare: string;
  hobbies: string;
}

// New interface for Plan of Action items
export interface PlanOfActionItem {
  id: string; // for key prop
  goal: string;
  action: string;
  responsibleParty: string;
  targetDate: string; // YYYY-MM-DD
  reviewDate: string; // YYYY-MM-DD
  completionDate: string; // YYYY-MM-DD
}

// New interface for Support Service referrals
export interface SupportServiceReferral {
  id: string; // for key prop
  agency: string;
  referralDate: string; // YYYY-MM-DD
  outcome: string;
}

// Individual Service Plan (ISP) Model
export interface ISP {
  id: string;
  clientId: string;
  ispDate: number; // Timestamp
  jobDeveloper: string;
  acknowledgmentInitialed: boolean;
  shortTermGoals: string;
  longTermGoals: string;
  identifiedBarriers: string[];
  careerPlanning: {
    workshopsAssigned: string;
    enrolledInCteOrCollege: boolean;
  };
  planOfAction: PlanOfActionItem[];
  supportServices: SupportServiceReferral[];
}

// Client Attachment Model
export interface ClientAttachment {
  id: string;
  clientId: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  storageUrl: string;
  uploadedBy: string; // staffName
  uploadDate: number; // timestamp
}

// Workshop Model
export interface Workshop {
  id:string;
  clientId: string;
  workshopDate: number; // Timestamp
  workshopName: 'Career Explorations' | 'Job Preparedness' | 'Interview Success' | 'Financial Literacy' | 'Entrepreneurship' | 'Other';
  workshopNameOther?: string;
  status: 'Scheduled' | 'Declined' | 'Completed' | 'No Show';
  assignedToId: string; // UID of staff
  assignedToName: string;
  associatedTaskId?: string; // ID of the task created for this workshop
}
