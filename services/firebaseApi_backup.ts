import { 
  Client, 
  Task, 
  CaseNote, 
  ISP, 
  ClientAttachment, 
  Workshop, 
  AuditChecklist, 
  AuditChecklistItem, 
  PlanOfActionItem 
} from '../types'; // <-- CORRECTED PATH
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  Auth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';

// --- Firebase Configuration ---
const firebaseConfigStr = typeof process.env.NEXT_PUBLIC_FIREBASE_CONFIG !== 'undefined' 
  ? process.env.NEXT_PUBLIC_FIREBASE_CONFIG 
  : "{}";
const firebaseConfig = JSON.parse(firebaseConfigStr);

// --- App ID (Global and Mandatory) ---
// This is provided by the environment and is crucial for our collection paths.
const appId = typeof process.env.NEXT_PUBLIC_APP_ID !== 'undefined' ? process.env.NEXT_PUBLIC_APP_ID : 'default-app-id';

// --- Initialize Firebase ---
export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// --- Database Path Helpers ---
// These functions build the correct paths based on our database plan.
const getPublicPath = (collName: string) => `artifacts/${appId}/public/${collName}`;
const getUserPath = (userId: string, collName: string) => `artifacts/${appId}/users/${userId}/${collName}`;

// --- Authentication ---
// We need to get the userId *after* auth is ready.
let currentUserId: string | null = null;

export const initializeAuth = (
  onAuthReady: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserId = user.uid;
    } else if (typeof process.env.NEXT_PUBLIC_INITIAL_AUTH_TOKEN !== 'undefined') {
      try {
        const userCredential = await signInWithCustomToken(auth, process.env.NEXT_PUBLIC_INITIAL_AUTH_TOKEN);
        currentUserId = userCredential.user.uid;
      } catch (error) {
        console.error("Failed to sign in with custom token, trying anonymous.", error);
        const userCredential = await signInAnonymously(auth);
        currentUserId = userCredential.user.uid;
      }
    } else {
      try {
        const userCredential = await signInAnonymously(auth);
        currentUserId = userCredential.user.uid;
      } catch (error) {
        console.error("Failed to sign in anonymously.", error);
      }
    }
    
    console.log(`Auth ready. UserID: ${currentUserId}`);
    onAuthReady(auth.currentUser);
  });
};

// --- Initial Data for New Clients ---
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
    // --- FIX 1: Corrected typo id:logo -> id: ---
    { id: "4.2", label: "Job Readiness Assessments (if applicable)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "4.3", label: "Aptitude Test(s)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "4.4", label: "Certificates of Completion", present: false, complete: false, uploaded: false, notes: "" }
  ],
  misc: []
};

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

// --- REAL API FUNCTIONS ---

const firebaseApi = {
  
  /**
   * Fetches all clients from the public clients collection.
   */
  getClients: (callback: (clients: Client[]) => void): (() => void) => {
    // --- FIX 2: Using correct public collection path ---
    const clientsCollectionPath = getPublicPath('clients');
    const clientsQuery = query(
      collection(db, clientsCollectionPath),
      orderBy('metadata.initialAppointmentDate', 'desc')
    );

    return onSnapshot(clientsQuery, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Client));
      callback(clients);
    }, (error) => {
      console.error(`Error fetching clients from ${clientsCollectionPath}: `, error);
      callback([]);
    });
  },

  /**
   * Fetches a single client document from the public collection.
   */
  getClientById: async (id: string): Promise<Client | undefined> => {
    // --- FIX 3: Using correct public doc path ---
    const clientDocPath = `${getPublicPath('clients')}/${id}`;
    const docRef = doc(db, clientDocPath);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Client;
    } else {
      console.error(`No such client at ${clientDocPath}!`);
      return undefined;
    }
  },

  /**
   * Updates an existing client document.
   */
  updateClient: async (updatedClient: Client): Promise<Client> => {
    const clientDocPath = `${getPublicPath('clients')}/${updatedClient.id}`;
    const docRef = doc(db, clientDocPath);
    
    const age = calculateAge(updatedClient.profile.dob || '');
    const clientToSave = {
      ...updatedClient,
      profile: {
        ...updatedClient.profile,
        age: age
      }
    };
    
    delete (clientToSave as any).id; 

    await setDoc(docRef, clientToSave);
    return updatedClient;
  },

  /**
   * Adds a new client to the public clients collection.
   */
  addClient: async (clientData: any, creatorId: string): Promise<Client> => {
    const now = new Date();
    const age = calculateAge(clientData.profile.dob || '');

    const newClientData = {
      googleDriveLink: clientData.googleDriveLink || '',
      profile: {
        ...clientData.profile,
        age: age,
      },
      contactInfo: {
        ...clientData.contactInfo,
        phone2: clientData.contactInfo.phone2 || '',
        email: clientData.contactInfo.email || '',
        apt: clientData.contactInfo.apt || '',
      },
      referralSource: clientData.referralSource || 'Manual Entry',
      auditChecklist: initialAuditChecklist,
      training: defaultTraining,
      metadata: {
        ...clientData.metadata,
        createdBy: creatorId,
        lastModifiedBy: creatorId,
        initialAppointmentDate: now.getTime(),
      },
    };

    const clientsCollectionPath = getPublicPath('clients');
    const docRef = await addDoc(collection(db, clientsCollectionPath), newClientData);
    
    return {
      id: docRef.id,
      ...newClientData
    } as Client;
  },

  /**
   * Fetches all case notes for a specific client from the sub-collection.
   */
  getCaseNotesByClientId: (
    clientId: string, 
    callback: (notes: CaseNote[]) => void
  ): (() => void) => {
    // This uses a sub-collection, so the path is built differently.
    const notesCollectionPath = `${getPublicPath('clients')}/${clientId}/caseNotes`;
    const notesQuery = query(
      collection(db, notesCollectionPath),
      orderBy('noteDate', 'desc')
    );

    return onSnapshot(notesQuery, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CaseNote));
      callback(notes);
    }, (error) => {
      console.error(`Error fetching case notes from ${notesCollectionPath}: `, error);
      callback([]);
    });
  },

  /**
   * This is the "To-Do List" query from your Point #4.
   * It finds all open Action Steps for a specific staff member.
   */
  getStaffTodoItems: (
    staffId: string, 
    callback: (tasks: PlanOfActionItem[]) => void
  ): (() => void) => {
    // --- FIX 4: Using correct public collection path ---
    const actionStepsCollectionPath = getPublicPath('actionSteps');
    const todoQuery = query(
      collection(db, actionStepsCollectionPath),
      where('assignedStaffId', '==', staffId),
      where('status', '!=', 'Completed'),
      orderBy('status', 'asc'), // This orderBy is needed for the inequality
      orderBy('targetDate', 'asc')
    );

    return onSnapshot(todoQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PlanOfActionItem));
      callback(tasks);
    }, (error) => {
      console.error(`Error fetching staff to-do items from ${actionStepsCollectionPath}: `, error);
      callback([]);
    });
  },
  
  // - getISPByClientId, upsertISP (using the /isps collection)
  // - getTasksByClientId, upsertTask (using the /tasks collection, or maybe /actionSteps)
  // - getWorkshops, getWorkshopAttendees (using those collections)
  // - etc.
};

export default firebaseApi;
