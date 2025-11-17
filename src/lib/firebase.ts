// Import Firebase SDK functions
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Firestore
} from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  Auth,
  User
} from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";

// Import our custom types
import { 
  Client, 
  Task, 
  CaseNote, 
  ISP, 
  AuditChecklist, 
  PlanOfActionItem
} from '../../types'; // Path from lib/ -> src/ -> root/types.ts

// --- ENV VARIABLES (Vite-style) ---
// We can remove the "as string" casts now, thanks to vite-env.d.ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// We can also remove the "as string | undefined" cast here
const INITIAL_AUTH_TOKEN = import.meta.env.VITE_INITIAL_AUTH_TOKEN;

// --- DEBUGGING LINES (keep for now; remove in production) ---
console.log("Available env keys:", Object.keys(import.meta.env));
console.log("VITE_FIREBASE_API_KEY is:", import.meta.env.VITE_FIREBASE_API_KEY);
// ------------------------------------------------------------

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Firebase services
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

let analytics: Analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// --- Authentication ---
let currentUserId: string | null = null;

export const initializeAuth = (onAuthReady: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserId = user.uid;
    } else if (INITIAL_AUTH_TOKEN) {
      try {
        const userCredential = await signInWithCustomToken(auth, INITIAL_AUTH_TOKEN);
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

// --- Initial Data for New Clients (from mockApi.ts) ---
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
  misc: []
};

const defaultTraining: Client["training"] = {
  cpr: false,
  firstAid: false,
  foodHandlersCard: false,
  osha10: false,
  nccer: false,
  otherCertificates: "",
  constructionCTE: false,
  cosmetologyCTE: false,
  culinaryCTE: false,
  fireCTE: false,
  medicalCTE: false,
  earlyChildhoodEducationCTE: false,
  entrepreneurshipCTE: false,
  otherCteProgram: ""
};

const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const [year, month, day] = dobString.split("-").map(Number);
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
const api = {
  /**
   * Fetches all admins/staff from the public /users collection.
   */
  getAdmins: async (): Promise<{ id: string; name: string }[]> => {
    const usersCollectionPath = "users";
    const q = query(collection(db, usersCollectionPath), where("role", "==", "admin"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn(`No admins found at ${usersCollectionPath}`);
      return [];
    }
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name // Only return id and name
    }));
  },

  /**
   * Fetches all clients from the public /clients collection in real-time.
   */
  getClients: (callback: (clients: Client[]) => void): (() => void) => {
    const clientsCollectionPath = "clients";
    const clientsQuery = query(
      collection(db, clientsCollectionPath),
      orderBy("metadata.initialAppointmentDate", "desc")
    );

    return onSnapshot(
      clientsQuery,
      (snapshot) => {
        const clients = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data()
            } as Client)
        );
        callback(clients);
      },
      (error) => {
        console.error(`Error fetching clients from ${clientsCollectionPath}: `, error);
        callback([]);
      }
    );
  },

  /**
   * Fetches a single client document from the public collection.
   */
  getClientById: async (id: string): Promise<Client | undefined> => {
    const clientDocPath = `clients/${id}`;
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
    const clientDocPath = `clients/${updatedClient.id}`;
    const docRef = doc(db, clientDocPath);

    const age = calculateAge(updatedClient.profile.dob || "");
    const clientToSave = {
      ...updatedClient,
      profile: {
        ...updatedClient.profile,
        age: age
      }
    };

    const { id, ...saveData } = clientToSave;

    await setDoc(docRef, saveData);
    return updatedClient;
  },

  /**
   * Adds a new client to the public /clients collection.
   */
  // --- SYNTAX FIX: Added the '=>' before the opening '{' ---
  addClient: async (clientData: any, creatorId: string): Promise<Client> => {
    const now = new Date();
    const age = calculateAge(clientData.profile.dob || "");

    const newClientData = {
      googleDriveLink: clientData.googleDriveLink || "",
      profile: {
        ...clientData.profile,
        age: age
      },
      contactInfo: {
        ...clientData.contactInfo,
        phone2: clientData.contactInfo.phone2 || "",
        email: clientData.contactInfo.email || "",
        apt: clientData.contactInfo.apt || ""
      },
      referralSource: clientData.referralSource || "Manual Entry",
      auditChecklist: initialAuditChecklist,
      training: defaultTraining,
      metadata: {
        ...clientData.metadata,
        createdBy: creatorId,
        lastModifiedBy: creatorId,
        initialAppointmentDate: now.getTime()
      }
    };

    const clientsCollectionPath = "clients";
    const docRef = await addDoc(collection(db, clientsCollectionPath), newClientData);

    return {
      id: docRef.id,
      ...newClientData
    } as Client;
  },

  // --- PLACEHOLDER FUNCTIONS (Typed) ---
  getISPByClientId: async (clientId: string): Promise<ISP | null> => {
    console.log("Mock getISPByClientId called. Need to implement in firebase.ts");
    return null;
  },
  upsertISP: async (ispData: ISP): Promise<ISP> => {
    console.log("Mock upsertISP called. Need to implement in firebase.ts");
    return ispData;
  },
  getTasksByClientId: async (clientId: string): Promise<Task[]> => {
    console.log("Mock getTasksByClientId called. Need to implement in firebase.ts");
    return [];
  }
};

export default api;