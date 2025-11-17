// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
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
  onSnapshot 
} from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// This data is SECURELY pulled from Vercel's Environment Variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// --- App ID (Global and Mandatory) ---
const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';

// --- Database Path Helpers ---
const getPublicPath = (collName) => `artifacts/${appId}/public/${collName}`;
const getUserPath = (userId, collName) => `artifacts/${appId}/users/${userId}/${collName}`;

// --- Authentication (NEW) ---
let currentUserId = null;
export const initializeAuth = (onAuthReady) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserId = user.uid;
    } else if (process.env.NEXT_PUBLIC_INITIAL_AUTH_TOKEN) {
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

// --- Initial Data for New Clients (from mockApi.ts) ---
const initialAuditChecklist = {
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

const calculateAge = (dobString) => {
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

// --- REAL API FUNCTIONS (NEW) ---
// We export a single 'api' object to match the structure of mockApi.ts
const api = {

  /**
   * Fetches all admins/staff from the public /users collection.
   */
  getAdmins: async () => {
    const usersCollectionPath = getPublicPath('users');
    const q = query(collection(db, usersCollectionPath), where("role", "==", "admin"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn(`No admins found at ${usersCollectionPath}`);
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  /**
   * Fetches all clients from the public /clients collection in real-time.
   */
  getClients: (callback) => {
    const clientsCollectionPath = getPublicPath('clients');
    const clientsQuery = query(
      collection(db, clientsCollectionPath),
      orderBy('metadata.initialAppointmentDate', 'desc')
    );

    return onSnapshot(clientsQuery, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(clients);
    }, (error) => {
      console.error(`Error fetching clients from ${clientsCollectionPath}: `, error);
      callback([]);
    });
  },

  /**
   * Fetches a single client document from the public collection.
   */
  getClientById: async (id) => {
    const clientDocPath = `${getPublicPath('clients')}/${id}`;
    const docRef = doc(db, clientDocPath);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.error(`No such client at ${clientDocPath}!`);
      return undefined;
    }
  },

  /**
   * Updates an existing client document.
   */
  updateClient: async (updatedClient) => {
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
    
    // Do not save the 'id' field inside the document
    const { id, ...saveData } = clientToSave;

    await setDoc(docRef, saveData);
    return updatedClient;
  },

  /**
   * Adds a new client to the public /clients collection.
   */
  addClient: async (clientData, creatorId) => {
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
    };
  },

  // ... We will add other functions here as we migrate them ...
  // (e.g., getCaseNotesByClientId, getISPByClientId, etc.)
  
  // Adding placeholder functions for items imported by other pages
  // to prevent the app from crashing.
  getISPByClientId: async (clientId) => { 
    console.log("Mock getISPByClientId called. Need to implement in firebase.js");
    return null; 
  },
  upsertISP: async (ispData) => { 
    console.log("Mock upsertISP called. Need to implement in firebase.js");
    return ispData; 
  },
  getTasksByClientId: async (clientId) => {
    console.log("Mock getTasksByClientId called. Need to implement in firebase.js");
    return [];
  },
  
};

export default api;