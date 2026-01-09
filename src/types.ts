// User and Auth
export type UserRole = 'admin' | 'staff' | 'viewer' | 'pending';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
}

// --- NEW Audit Checklist Types ---
export interface AuditChecklistItem {
  id: string; // e.g., "1.1"
  label: string;
  present: boolean;
  complete: boolean;
  uploaded: boolean;
  notes: string;
}

export type AuditChecklist = AuditChecklistItem[];
// ---------------------------------

// Demographics Interface
export interface Demographics {
  // Section 2
  residentOfShastaCounty: boolean;
  currentlyEmployed: boolean;
  publicAssistance: {
    housing: boolean;
    calFresh: boolean;
    calWorksSSI: boolean;
    unemployment: boolean;
    childcare: boolean;
    tribalFunding: boolean;
    other: string;
  };
  barriersToEmployment: {
    transportation: boolean;
    socialSecurityCard: boolean;
    criminalRecord: boolean;
    housingInstability: boolean;
    disability: boolean;
    mentalHealthChallenges: boolean;
    substanceUseRecovery: boolean;
    stateIdDriversLicense: boolean;
    other: string;
  };
  // Section 3
  educationLevel: 'No High School Diploma' | 'GED' | 'High School Diploma' | 'Some College' | 'Associate Degree' | 'Bachelor\'s Degree' | 'Other';
  educationOther?: string;
  currentlyEnrolled: boolean;
  hasResume: boolean;
  jobInterests: string;
  interestedInTraining: boolean;
  // Section 4
  supportServices: {
    resumeInterviewHelp: boolean;
    transportation: boolean;
    childcare: boolean;
    mentalHealthCounseling: boolean;
    legalServices: boolean;
    other: string;
  };
  // Household Composition
  householdComposition: {
    liveAlone: boolean;
    members: Array<{
      name: string;
      dob: string;
      enrolledInSchool: boolean;
    }>;
    expectChange: boolean;
    changeExplanation?: string;
  };
  // Conflict of Interest
  conflictOfInterest: {
    hasConflict: boolean;
    relationship?: string;
  };
  // Self-Certification of Annual Income
  incomeCertification: {
    applicantName: string;
    householdSize: number;
    femaleHeadOfHousehold: boolean;
    seniorHeadOfHousehold: boolean;
    singleParentFamily: boolean;
    disabledFamilyMember: boolean;
    elderlyCount: number;
    studentCount: number;
    under18Count: number;
    gender: 'Male' | 'Female' | 'Non-Binary' | 'Choose not to disclose';
    race: {
      white: boolean;
      nativeHawaiianPI: boolean;
      asian: boolean;
      americanIndianAlaskanNative: boolean;
      twoOrMoreRaces: boolean;
      preferNotToAnswer: boolean;
      blackAfricanAmerican: boolean;
    };
    hispanicLatino: 'Yes' | 'No' | 'Prefer Not To Answer';
    annualIncome: number;
  };
  // Disaster Recovery Benefits
  disasterRecovery: {
    receivedAssistance: boolean;
    assistanceDetails?: string;
    participatedSimilar: boolean;
    similarDetails?: string;
  };
  // New Demographics Fields
  femaleTrainee?: boolean;
  fosterYouth?: boolean;
  agingOutFosterCare?: boolean;
  homeless?: boolean;
  limitedSpeakingEnglish?: boolean;
  veteran?: boolean;
  releasedCorrectionalFacility?: boolean;
  selfCertificationAnnualIncome?: number;
}

// Main Client Data Model
export interface Client {
  id: string;
  participantId?: string;
  googleDriveLink?: string;
  profile: {
    firstName: string;
    lastName: string;
    middleInitial?: string; // Added
    dob?: string; // YYYY-MM-DD
    age: number;
    gender?: string; // Added
  };
  contactInfo: {
    phone: string;
    phone2?: string;
    email?: string;
    street: string;
    apt?: string;
    city: string;
    state: string;
    zip: string;
  };
  referralSource: string;

  auditChecklist: AuditChecklist;

  training: {
    cpr: boolean;
    firstAid: boolean;
    foodHandlersCard: boolean;
    osha10: boolean; // Added
    nccer: boolean; // Added
    otherCertificates?: string;
    constructionCTE: boolean;
    cosmetologyCTE: boolean;
    culinaryCTE: boolean;
    fireCTE: boolean;
    medicalCTE: boolean;
    earlyChildhoodEducationCTE: boolean; // Added
    entrepreneurshipCTE: boolean; // Added
    otherCteProgram?: string;
    // Work Documents
    cteStudentContract?: boolean;
    workPermit?: boolean;
    resume?: boolean;
    coverLetter?: boolean;
    // Subscriptions
    currentJobListingsEmail?: boolean;
  };

  demographics?: Demographics;

  metadata: {
    dateCreated: number; // Timestamp
    createdBy: string; // UID
    lastModified: number; // Timestamp
    lastModifiedBy: string; // UID
    status: 'Prospect' | 'Applicant' | 'Active' | 'Inactive';
    clientType: 'General Population' | 'CHYBA';
    assignedAdminId?: string; // UID
    assignedAdminName?: string;
    lastCaseNoteDate?: number; // Timestamp
    dateApplication?: number; // Timestamp - Added
    dateWithdrew?: number; // Timestamp - Added
    initialAppointmentDate?: number; // Timestamp - Added
  };
}

// Task Data Model
export interface Task {
  id: string;
  clientId?: string;
  clientName?: string;
  assignedToId: string; // UID
  assignedToName: string;
  createdBy: string; // Name
  dueDate: number; // Timestamp
  title: string;
  details: string;
  status: 'Open' | 'In Progress' | 'Waiting' | 'Completed';
  linkTo: string | null;
  urgency: 'Green' | 'Yellow' | 'Red';
  serviceType?: 'Job Search' | 'Supportive Service' | 'Training' | 'Intake Meeting' | 'ISP Review' | 'General Check-in';
  dateCreated?: number; // Timestamp
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
  category?: string;
}

// Workshop Model
export interface Workshop {
  id: string;
  clientId: string;
  workshopDate: number; // Timestamp
  // --- FIX: Added 'Resume Building' to the type ---
  workshopName: 'Career Explorations' | 'Job Preparedness' | 'Interview Success' | 'Financial Literacy' | 'Entrepreneurship' | 'Resume Building' | 'Other';
  workshopNameOther?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Canceled' | 'Declined' | 'No Show' | 'On Hold';
  assignedToId: string; // UID of staff
  assignedToName: string;
  associatedTaskId?: string; // ID of the task created for this workshop
}

// Notification Model
export interface Notification {
  id: string;
  userId: string; // The user receiving the notification
  type: 'assignment' | 'mention';
  message: string;
  relatedItemId?: string; // ID of the Task, Workshop, or Client (for case notes)
  relatedItemType: 'task' | 'workshop' | 'case_note';
  relatedClientId?: string;
  dateCreated: number;
  read: boolean;
}