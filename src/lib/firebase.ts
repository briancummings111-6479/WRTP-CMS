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
  updateDoc,
  deleteDoc,
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
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFunctions, httpsCallable, connectFunctionsEmulator, Functions } from "firebase/functions";
import { getAnalytics, Analytics } from "firebase/analytics";

// Import our custom types
import {
  Client,
  Task,
  CaseNote,
  ClientAttachment,
  ISP,
  Demographics,
  User as AppUser,
  Workshop
} from "../types";

// --- Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log("Firebase Config Debug:", {
  apiKey: firebaseConfig.apiKey ? "Present" : "Missing",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  env: import.meta.env.MODE
});

// --- Initialization ---
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);
const functions: Functions = getFunctions(app);
const analytics: Analytics = getAnalytics(app);

// Connect to emulators if working locally
if (location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// --- Default Values ---
const defaultDemographics: Demographics = {
  residentOfShastaCounty: false,
  currentlyEmployed: false,
  publicAssistance: {
    housing: false,
    calFresh: false,
    calWorksSSI: false,
    unemployment: false,
    childcare: false,
    tribalFunding: false,
    other: ''
  },
  barriersToEmployment: {
    transportation: false,
    socialSecurityCard: false,
    criminalRecord: false,
    housingInstability: false,
    disability: false,
    mentalHealthChallenges: false,
    substanceUseRecovery: false,
    stateIdDriversLicense: false,
    other: ''
  },
  educationLevel: 'No High School Diploma',
  currentlyEnrolled: false,
  hasResume: false,
  interestedInTraining: false,
  jobInterests: '',
  supportServices: {
    resumeInterviewHelp: false,
    transportation: false,
    childcare: false,
    mentalHealthCounseling: false,
    legalServices: false,
    other: ''
  },
  householdComposition: {
    liveAlone: false,
    members: [],
    expectChange: false
  },
  conflictOfInterest: {
    hasConflict: false
  },
  incomeCertification: {
    applicantName: '',
    householdSize: 1,
    annualIncome: 0,
    femaleHeadOfHousehold: false,
    seniorHeadOfHousehold: false,
    singleParentFamily: false,
    disabledFamilyMember: false,
    elderlyCount: 0,
    studentCount: 0,
    under18Count: 0,
    gender: 'Choose not to disclose',
    race: {
      white: false,
      nativeHawaiianPI: false,
      asian: false,
      americanIndianAlaskanNative: false,
      twoOrMoreRaces: false,
      preferNotToAnswer: false,
      blackAfricanAmerican: false
    },
    hispanicLatino: 'Prefer Not To Answer'
  },
  disasterRecovery: {
    receivedAssistance: false,
    participatedSimilar: false
  }
};

// --- API Object ---
// --- Helper to sanitize data for Firestore (remove undefined) ---
const sanitizeData = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (typeof data === 'object' && !(data instanceof Date)) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = sanitizeData(value);
      }
      return acc;
    }, {} as any);
  }
  return data;
};

// --- Helper: Recalculate and Update Client's Last Case Note Date ---
const updateClientLastCaseNoteDate = async (clientId: string) => {
  try {
    // We can't easily rely on complex queries with composite indexes being present in all environments.
    // Safest approach: Fetch all notes for client (using existing index on clientId), filter & sort in memory.
    // This reuses the logic we already trust in getCaseNotesByClientId, but we replicate it here to avoid
    // circular dependency or issues if we haven't defined api yet.
    const q = query(collection(db, "caseNotes"), where("clientId", "==", clientId));
    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map(doc => doc.data() as CaseNote);

    // Sort descending by date
    notes.sort((a, b) => b.noteDate - a.noteDate);

    // Find first note that is of type 'Case Note' (ignoring Contact Notes etc if any)
    const latestNote = notes.find(n => n.noteType === 'Case Note');
    const latestDate = latestNote ? latestNote.noteDate : null;

    const clientRef = doc(db, "clients", clientId);
    await updateDoc(clientRef, {
      "metadata.lastCaseNoteDate": latestDate
    });
    console.log(`Updated client ${clientId} lastCaseNoteDate to ${latestDate ? new Date(latestDate).toISOString() : 'null'}`);
  } catch (err) {
    console.error(`Failed to update lastCaseNoteDate for client ${clientId}:`, err);
  }
};

const api = {
  // --- Client Functions ---
  getClients: async (): Promise<Client[]> => {
    const clientsCol = collection(db, "clients");
    const clientSnapshot = await getDocs(clientsCol);
    return clientSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];
  },

  getClientById: async (clientId: string): Promise<Client | undefined> => {
    const docRef = doc(db, "clients", clientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Client;
    } else {
      return undefined;
    }
  },

  getClientByParticipantId: async (participantId: string): Promise<Client | undefined> => {
    const q = query(collection(db, "clients"), where("participantId", "==", participantId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client;
  },

  getClientByName: async (firstName: string, lastName: string): Promise<Client | undefined> => {
    const q = query(
      collection(db, "clients"),
      where("profile.firstName", "==", firstName),
      where("profile.lastName", "==", lastName)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client;
  },

  addClient: async (clientData: Omit<Client, "id">, creatorId: string): Promise<Client> => {
    const clientsCol = collection(db, "clients");

    // Ensure demographics are initialized
    const newClientData = {
      ...clientData,
      demographics: clientData.demographics || defaultDemographics
    };

    const docRef = await addDoc(clientsCol, sanitizeData(newClientData));
    return {
      id: docRef.id,
      ...newClientData
    } as Client;
  },

  updateClient: async (client: Client): Promise<Client> => {
    const docRef = doc(db, "clients", client.id);
    // Destructure to separate id from data, though Firestore ignores id in data usually, it's cleaner
    const { id, ...data } = client;
    await updateDoc(docRef, sanitizeData(data));
    return client;
  },

  // --- ISP Functions ---
  getISPByClientId: async (clientId: string): Promise<ISP | null> => {
    const q = query(collection(db, "isps"), where("clientId", "==", clientId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    // Assuming one ISP per client for now
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ISP;
  },

  upsertISP: async (ispData: ISP): Promise<ISP> => {
    const docRef = doc(db, "isps", ispData.id);
    await setDoc(docRef, sanitizeData(ispData));
    return ispData;
  },

  // --- Task Functions ---
  getTasksByClientId: async (clientId: string): Promise<Task[]> => {
    let q;
    if (clientId === 'all') {
      q = query(collection(db, "tasks"));
    } else {
      q = query(collection(db, "tasks"), where("clientId", "==", clientId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  },

  getTasksByUserId: async (userId: string): Promise<Task[]> => {
    const q = query(collection(db, "tasks"), where("assignedToId", "==", userId));
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    return tasks;
  },

  upsertTask: async (task: Partial<Task> & { clientId: string; title: string }): Promise<Task> => {
    const data: any = { ...task };
    delete data.id;

    if (task.id) {
      const docRef = doc(db, "tasks", task.id);
      await setDoc(docRef, sanitizeData(data), { merge: true });
      return task as Task;
    } else {
      const docRef = await addDoc(collection(db, "tasks"), sanitizeData(data));
      return { id: docRef.id, ...task } as Task;
    }
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await deleteDoc(doc(db, "tasks", taskId));
  },

  // --- Case Note Functions ---
  getAllCaseNotes: async (): Promise<CaseNote[]> => {
    const caseNotesCol = collection(db, "caseNotes");
    const snapshot = await getDocs(caseNotesCol);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CaseNote[];
  },

  getCaseNotesByClientId: async (clientId: string): Promise<CaseNote[]> => {
    const q = query(collection(db, "caseNotes"), where("clientId", "==", clientId));
    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseNote));
    return notes.sort((a, b) => b.noteDate - a.noteDate);
  },

  addCaseNote: async (noteData: Omit<CaseNote, "id">): Promise<CaseNote> => {
    const docRef = await addDoc(collection(db, "caseNotes"), sanitizeData(noteData));

    // If it's a "Case Note" (not just a contact note, or if we want to track both), update the client
    // The requirement said "Only include Case Notes, not Contact Notes" for the filter.
    if (noteData.noteType === 'Case Note') {
      const clientRef = doc(db, "clients", noteData.clientId);
      // Optimistic update for immediate feedback, though the helper will also run
      await updateDoc(clientRef, {
        "metadata.lastCaseNoteDate": noteData.noteDate
      });
    }

    // Recalculate to be sure (handles backdating if the new note is NOT the latest, etc.)
    await updateClientLastCaseNoteDate(noteData.clientId);


    return { id: docRef.id, ...noteData } as CaseNote;
  },

  updateCaseNote: async (note: CaseNote): Promise<CaseNote> => {
    const docRef = doc(db, "caseNotes", note.id);
    const { id, ...data } = note;
    await updateDoc(docRef, sanitizeData(data));

    // Recalculate latest date
    await updateClientLastCaseNoteDate(note.clientId);

    return note;
  },

  deleteCaseNote: async (noteId: string): Promise<void> => {
    // We need the clientId to update the parent client. 
    // Since we only have noteId, we must fetch the note first to get the clientId.
    const noteRef = doc(db, "caseNotes", noteId);
    const noteSnap = await getDoc(noteRef);
    let clientId = "";
    if (noteSnap.exists()) {
      clientId = noteSnap.data().clientId;
    }

    await deleteDoc(noteRef);

    if (clientId) {
      await updateClientLastCaseNoteDate(clientId);
    }
  },

  // --- Attachment Functions ---
  getAttachmentsByClientId: async (clientId: string): Promise<ClientAttachment[]> => {
    const q = query(collection(db, "attachments"), where("clientId", "==", clientId));
    const snapshot = await getDocs(q);
    const attachments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientAttachment));
    return attachments.sort((a, b) => b.uploadDate - a.uploadDate);
  },

  addAttachment: async (attachment: ClientAttachment): Promise<ClientAttachment> => {
    const docRef = doc(db, "attachments", attachment.id);
    await setDoc(docRef, sanitizeData(attachment));
    return attachment;
  },

  uploadClientFile: async (file: File, clientId: string): Promise<string> => {
    const storageRef = ref(storage, `clientFiles/${clientId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  deleteClientFile: async (clientId: string, fileName: string): Promise<void> => {
    const storageRef = ref(storage, `clientFiles/${clientId}/${fileName}`);
    await deleteObject(storageRef);
  },

  deleteAttachment: async (attachmentId: string): Promise<void> => {
    await deleteDoc(doc(db, "attachments", attachmentId));
  },

  // --- Workshop Functions ---
  getWorkshopsByClientId: async (clientId: string): Promise<Workshop[]> => {
    const q = query(collection(db, "workshops"), where("clientId", "==", clientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop));
  },

  getAllWorkshops: async (): Promise<Workshop[]> => {
    const workshopsCol = collection(db, "workshops");
    const snapshot = await getDocs(workshopsCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop));
  },

  upsertWorkshop: async (workshop: Partial<Workshop> & { clientId: string; workshopName: string }): Promise<Workshop> => {
    const data: any = { ...workshop };
    delete data.id;

    if (workshop.id) {
      const docRef = doc(db, "workshops", workshop.id);
      await setDoc(docRef, sanitizeData(data), { merge: true });
      return workshop as Workshop;
    } else {
      const docRef = await addDoc(collection(db, "workshops"), sanitizeData(data));
      return { id: docRef.id, ...workshop } as Workshop;
    }
  },

  deleteWorkshop: async (workshopId: string): Promise<void> => {
    await deleteDoc(doc(db, "workshops", workshopId));
  },

  // --- User Functions ---
  getStaffUsers: async (): Promise<AppUser[]> => {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
  },

  deleteClient: async (clientId: string): Promise<void> => {
    await deleteDoc(doc(db, "clients", clientId));
  },

  // --- User Management Functions ---
  updateUser: async (user: AppUser): Promise<void> => {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      name: user.name,
      role: user.role,
      title: user.title
    });
  },

  // In a real app with Firebase Admin SDK, we would create the auth user here.
  // Client-side, we can only create a Firestore document to "whitelist" them.
  inviteUser: async (email: string, role: AppUser['role'], title: string, name: string): Promise<void> => {
    console.log("Invite user not implemented client-side", { email, role, title, name });
  },

  createUser: async (userData: { name: string; email: string; role: AppUser['role']; title: string }): Promise<void> => {
    // Check if email already exists to prevent duplicates
    const normalizedEmail = userData.email.toLowerCase();
    const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error("User with this email already exists.");
    }

    // Create a new document. AuthContext will migrate this to the correct UID upon first login.
    await addDoc(collection(db, "users"), {
      name: userData.name,
      email: normalizedEmail,
      role: userData.role,
      title: userData.title,
      createdAt: Date.now()
    });
  },

  deleteUser: async (uid: string): Promise<void> => {
    await deleteDoc(doc(db, "users", uid));
  },

  mergeUserData: async (sourceUid: string, targetUid: string): Promise<{ clients: number, tasks: number, notes: number, workshops: number }> => {
    console.log(`Merging data from ${sourceUid} to ${targetUid}`);
    let counts = { clients: 0, tasks: 0, notes: 0, workshops: 0 };

    // 1. Migrate Clients (assignedAdminId, createdBy, lastModifiedBy)
    const clientFields = ['metadata.assignedAdminId', 'metadata.createdBy', 'metadata.lastModifiedBy'];
    for (const field of clientFields) {
      const q = query(collection(db, "clients"), where(field, "==", sourceUid));
      const snapshot = await getDocs(q);
      counts.clients += snapshot.size;
      const updates = snapshot.docs.map(doc => updateDoc(doc.ref, { [field]: targetUid }));
      await Promise.all(updates);
    }

    // 2. Migrate Tasks
    const tasksQuery = query(collection(db, "tasks"), where("assignedToId", "==", sourceUid));
    const tasksSnapshot = await getDocs(tasksQuery);
    counts.tasks += tasksSnapshot.size;
    await Promise.all(tasksSnapshot.docs.map(doc => updateDoc(doc.ref, { assignedToId: targetUid })));

    // 3. Migrate Case Notes
    const notesQuery = query(collection(db, "caseNotes"), where("staffId", "==", sourceUid));
    const notesSnapshot = await getDocs(notesQuery);
    counts.notes += notesSnapshot.size;
    await Promise.all(notesSnapshot.docs.map(doc => updateDoc(doc.ref, { staffId: targetUid })));

    // 4. Migrate Workshops
    const workshopsQuery = query(collection(db, "workshops"), where("assignedToId", "==", sourceUid));
    const workshopsSnapshot = await getDocs(workshopsQuery);
    counts.workshops += workshopsSnapshot.size;
    await Promise.all(workshopsSnapshot.docs.map(doc => updateDoc(doc.ref, { assignedToId: targetUid })));

    console.log("Merge completed:", counts);
    return counts;
  },

  getTasks: async (): Promise<Task[]> => {
    const q = query(collection(db, "tasks"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  },

  getAdmins: async (): Promise<{ id: string, name: string }[]> => {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, name: data.name || data.email || 'Unknown' };
    });
  },

  submitIntakeForm: async (formData: any): Promise<void> => {
    await addDoc(collection(db, "intakeForms"), {
      ...formData,
      submittedAt: Date.now()
    });
  },

  // --- Migration / Admin Utils ---
  syncAllClientsLastCaseNoteDate: async (): Promise<number> => {
    try {
      const clientsCol = collection(db, "clients");
      const clientSnapshot = await getDocs(clientsCol);
      let updatedCount = 0;

      console.log(`Starting sync for ${clientSnapshot.size} clients...`);

      // Process in chunks to avoid overwhelming the browser/network if there are many
      const clients = clientSnapshot.docs.map(doc => doc.id);

      for (const clientId of clients) {
        await updateClientLastCaseNoteDate(clientId);
        updatedCount++;
      }

      console.log(`Sync completed. Updated ${updatedCount} clients.`);
      return updatedCount;
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  },

  createBackup: async (): Promise<any> => {
    const backup: any = {
      timestamp: new Date().toISOString(),
      details: "Full Firestore Backup",
      data: {}
    };

    const collectionsToBackup = [
      'clients',
      'tasks',
      'caseNotes',
      'workshops',
      'attachments',
      'users',
      'intakeForms',
      'isps'
    ];

    try {
      console.log("Starting Backup...");
      for (const colName of collectionsToBackup) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        backup.data[colName] = snapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data()
        }));
        console.log(`Backed up ${colName}: ${snapshot.size} docs`);
      }
      return backup;
    } catch (error) {
      console.error("Backup failed:", error);
      throw error;
    }
  },

  // --- OCR Functions ---
  extractFormData: async (file: File, formType: 'Intake' | 'ISP'): Promise<any> => {
    // Convert file to Base64
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const extractFn = httpsCallable(functions, 'extractFormDataFromPdf');
          const result = await extractFn({
            fileBase64: base64String,
            mimeType: file.type,
            formType
          });
          resolve(result.data);
        } catch (error) {
          console.error("OCR Error:", error);
          reject(error);
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  },
};

export { auth, db, storage, analytics, defaultDemographics };
export default api;