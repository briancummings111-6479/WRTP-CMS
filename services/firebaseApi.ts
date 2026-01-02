import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  getDocs,
  Timestamp,
  Unsubscribe
} from "firebase/firestore";
import mockApi from "./mockApi"; 
import { Client, ISP, Task, CaseNote } from "../types"; 

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Signs the user in anonymously if not already signed in.
 */
export const ensureSignedIn = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
      console.log("Signed in anonymously");
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
    }
  }
};

// Ensure user is signed in on load
ensureSignedIn();

// --- Client API ---

export const getClients = (callback: (clients: Client[]) => void): Unsubscribe => {
  console.log("Setting up client list listener...");
  const clientsCollection = collection(db, "clients");
  const q = query(clientsCollection); 

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const fetchedClients: Client[] = [];
    querySnapshot.forEach((doc) => {
      fetchedClients.push({ id: doc.id, ...doc.data() } as Client);
    });
    console.log(`Fetched ${fetchedClients.length} clients.`);
    callback(fetchedClients);
  }, (error) => {
    console.error("Error fetching clients:", error);
    callback([]); 
  });
  return unsubscribe; 
};

export const addClient = async (clientData: Omit<Client, 'id'>): Promise<Client> => {
  console.log("Adding new client...");
  const clientsCollection = collection(db, "clients");
  const docRef = await addDoc(clientsCollection, {
    ...clientData,
    metadata: {
      ...clientData.metadata,
      createdAt: Timestamp.now(),
    }
  });
  console.log("Client added with ID: ", docRef.id);
  return { ...clientData, id: docRef.id };
};

export const updateClient = async (clientData: Client): Promise<Client> => {
  console.log("Updating client: ", clientData.id);
  const clientRef = doc(db, "clients", clientData.id);
  await setDoc(clientRef, clientData, { merge: true });
  console.log("Client updated successfully");
  return clientData;
};

export const getClientById = (clientId: string, callback: (client: Client | null) => void): Unsubscribe => {
  console.log(`Setting up listener for client: ${clientId}`);
  const clientRef = doc(db, "clients", clientId);
  
  const unsubscribe = onSnapshot(clientRef, (docSnap) => {
    if (docSnap.exists()) {
      const clientData = { id: docSnap.id, ...docSnap.data() } as Client;
      console.log("Client data fetched: ", clientData.profile.firstName);
      callback(clientData);
    } else {
      console.log("No such client document!");
      callback(null);
    }
  }, (error) => {
    console.error("Error fetching client document:", error);
    callback(null);
  });

  return unsubscribe; 
};

// --- Admin/User API ---

export const getAdmins = async (): Promise<{ id: string, name: string }[]> => {
  console.log("Fetching all admins...");
  const usersCollection = collection(db, "users");
  const q = query(usersCollection); 

  const querySnapshot = await getDocs(q);
  const admins: { id: string, name: string }[] = [];
  if (querySnapshot.empty) {
    console.log("No admins found at /users");
  } else {
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      admins.push({ id: doc.id, name: data.name || 'Unnamed' });
    });
    console.log(`Fetched ${admins.length} admins.`);
  }
  return admins;
};

// --- ISP API ---

export const getISPByClientId = (clientId: string, callback: (isp: ISP | null) => void): Unsubscribe => {
  console.log(`Setting up listener for ISP for client: ${clientId}`);
  const q = query(collection(db, "isps"), where("clientId", "==", clientId));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      console.log("No ISP found for client.");
      callback(null);
    } else {
      const ispDoc = querySnapshot.docs[0];
      const ispData = { id: ispDoc.id, ...ispDoc.data() } as ISP;
      console.log("ISP data fetched: ", ispData.id);
      callback(ispData);
    }
  }, (error) => {
    console.error("Error fetching ISP document:", error);
    callback(null);
  });

  return unsubscribe; 
};

export const upsertISP = async (ispData: ISP | Omit<ISP, 'id'>): Promise<ISP> => {
  if ('id' in ispData && ispData.id) {
    console.log(`Updating ISP: ${ispData.id}`);
    const ispRef = doc(db, "isps", ispData.id);
    await setDoc(ispRef, ispData, { merge: true });
    return ispData as ISP;
  } else {
    console.log("Creating new ISP for client: ", ispData.clientId);
    const ispCollection = collection(db, "isps");
    const dataToSave = { ...ispData };
    if ('id' in dataToSave) delete (dataToSave as any).id; 

    const docRef = await addDoc(ispCollection, dataToSave);
    return { ...dataToSave, id: docRef.id } as ISP;
  }
};

// --- MOCK APIS (Wrappers) ---

const getTasksByClientId = async (clientId: string): Promise<Task[]> => {
  console.warn("Using MOCK data for getTasksByClientId");
  return mockApi.getTasksByClientId(clientId);
};

// Explicitly define wrappers for all task functions
const addTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
  console.warn("Using MOCK data for addTask");
  // Use 'as any' if mockApi types are strictly incompatible, but prefer proper typing
  return (mockApi as any).addTask ? (mockApi as any).addTask(task) : Promise.reject("addTask not implemented in mockApi");
};

const updateTask = async (task: Task): Promise<Task> => {
  console.warn("Using MOCK data for updateTask");
  return (mockApi as any).updateTask ? (mockApi as any).updateTask(task) : Promise.reject("updateTask not implemented in mockApi");
};

const deleteTask = async (taskId: string): Promise<void> => {
  console.warn("Using MOCK data for deleteTask");
  return (mockApi as any).deleteTask ? (mockApi as any).deleteTask(taskId) : Promise.reject("deleteTask not implemented in mockApi");
};

const getCaseNotesByClientId = async (clientId: string): Promise<CaseNote[]> => {
  console.warn("Using MOCK data for getCaseNotesByClientId");
  return mockApi.getCaseNotesByClientId(clientId);
};

const addCaseNote = async (caseNote: Omit<CaseNote, 'id'>): Promise<CaseNote> => {
  console.warn("Using MOCK data for addCaseNote");
  return mockApi.addCaseNote(caseNote);
};

// --- Explicit Interface Definition ---
export interface FirebaseApi {
  getClients: (callback: (clients: Client[]) => void) => Unsubscribe;
  addClient: (clientData: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (clientData: Client) => Promise<Client>;
  getClientById: (clientId: string, callback: (client: Client | null) => void) => Unsubscribe;
  getAdmins: () => Promise<{ id: string; name: string }[]>;
  getISPByClientId: (clientId: string, callback: (isp: ISP | null) => void) => Unsubscribe;
  upsertISP: (ispData: ISP | Omit<ISP, 'id'>) => Promise<ISP>;
  
  // Task Methods
  getTasksByClientId: (clientId: string) => Promise<Task[]>;
  addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;

  // Case Note Methods
  getCaseNotesByClientId: (clientId: string) => Promise<CaseNote[]>;
  addCaseNote: (caseNote: Omit<CaseNote, 'id'>) => Promise<CaseNote>;

  // Attachment Methods - Using 'any' for maximum flexibility with mock data
  getAttachmentsByClientId: any;
  addAttachment: any;
  deleteAttachment: any;
}

// --- API Object Construction ---
// We construct the object and explicitly type it as FirebaseApi
const api: FirebaseApi = {
  getClients,
  addClient,
  updateClient,
  getClientById,
  getAdmins,
  getISPByClientId,
  upsertISP,
  getTasksByClientId,
  addTask,
  updateTask,
  deleteTask,
  getCaseNotesByClientId,
  addCaseNote,
  // Fallback to mockApi or empty functions if missing
  getAttachmentsByClientId: (mockApi as any).getAttachmentsByClientId || (() => Promise.resolve([])),
  addAttachment: (mockApi as any).addAttachment || (() => Promise.resolve({})),
  deleteAttachment: (mockApi as any).deleteAttachment || (() => Promise.resolve()),
};

export default api;