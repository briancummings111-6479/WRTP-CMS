import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    Timestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
    Organization,
    EngagementLog,
    GroupSession,
    ProfessionalContact
} from "../types";

const ORGANIZATIONS_COLLECTION = "organizations";
const ENGAGEMENTS_COLLECTION = "engagementLogs";
const SESSIONS_COLLECTION = "groupSessions";
const CONTACTS_COLLECTION = "professionalContacts";

export const communityService = {
    // --- Organization Methods ---

    async getOrganizations(): Promise<Organization[]> {
        const q = query(collection(db, ORGANIZATIONS_COLLECTION), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
    },

    async getOrganizationByName(name: string): Promise<Organization[]> {
        // Firestore prefix search
        const q = query(
            collection(db, ORGANIZATIONS_COLLECTION),
            where("name", ">=", name),
            where("name", "<=", name + '\uf8ff')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
    },

    async addOrganization(org: Omit<Organization, "id" | "createdAt" | "updatedAt">): Promise<Organization> {
        const timestamp = Date.now();
        const newOrg = {
            ...org,
            createdAt: timestamp,
            updatedAt: timestamp,
            jobOpeningsCount: org.jobOpeningsCount || 0
        };
        const docRef = await addDoc(collection(db, ORGANIZATIONS_COLLECTION), newOrg);
        return { id: docRef.id, ...newOrg };
    },

    async updateOrganization(id: string, data: Partial<Organization>): Promise<void> {
        const docRef = doc(db, ORGANIZATIONS_COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: Date.now()
        });
    },

    // --- Professional Contact Methods ---

    async getContactsByOrgId(orgId: string): Promise<ProfessionalContact[]> {
        const q = query(collection(db, CONTACTS_COLLECTION), where("organizationId", "==", orgId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProfessionalContact));
    },

    async addContact(contact: Omit<ProfessionalContact, "id">): Promise<ProfessionalContact> {
        const docRef = await addDoc(collection(db, CONTACTS_COLLECTION), contact);
        return { id: docRef.id, ...contact };
    },

    // --- Engagement Log Methods ---

    async addEngagement(log: Omit<EngagementLog, "id" | "createdAt">): Promise<EngagementLog> {
        const timestamp = Date.now();
        const newLog = {
            ...log,
            createdAt: timestamp
        };
        const docRef = await addDoc(collection(db, ENGAGEMENTS_COLLECTION), newLog);

        // Update lastContactDate for ALL associated organizations
        const orgIdsToUpdate = log.organizationIds || (log.organizationId ? [log.organizationId] : []);

        // Deduplicate just in case
        const uniqueOrgIds = [...new Set(orgIdsToUpdate)];

        if (uniqueOrgIds.length > 0) {
            await Promise.all(uniqueOrgIds.map(orgId =>
                updateDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId), {
                    lastContactDate: log.date,
                    updatedAt: timestamp
                })
            ));
        }

        return { id: docRef.id, ...newLog };
    },

    async updateEngagement(id: string, data: Partial<EngagementLog>): Promise<void> {
        const docRef = doc(db, ENGAGEMENTS_COLLECTION, id);
        await updateDoc(docRef, {
            ...data
            // Note: We are NOT updating the organization's lastContactDate automatically here
            // because it's complex to determine if this specific log was the most recent one.
            // If strictly needed, we'd have to re-query the org's logs.
            // For now, we assume this is just a content correction.
        });
    },

    async getAllEngagements(): Promise<EngagementLog[]> {
        const q = query(collection(db, ENGAGEMENTS_COLLECTION), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EngagementLog));
    },

    async getEngagementsByOrgId(orgId: string): Promise<EngagementLog[]> {
        // Try to fetch by array-contains (new standard)
        // Note: usage of 'organizationIds' implies new records.
        // Old records only have 'organizationId'. 
        // ideally we query for both.
        // For now, let's use a dual-query approach to be safe and merge, 
        // to ensure we see old records (organizationId) and new multi-records.

        const q1 = query(collection(db, ENGAGEMENTS_COLLECTION), where("organizationId", "==", orgId));
        const q2 = query(collection(db, ENGAGEMENTS_COLLECTION), where("organizationIds", "array-contains", orgId));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const results = new Map<string, EngagementLog>();

        snap1.docs.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() } as EngagementLog));
        snap2.docs.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() } as EngagementLog));

        // Sort explicitly since we merged manually
        return Array.from(results.values()).sort((a, b) => b.date - a.date);
    },

    async getEngagementsByClientId(clientId: string): Promise<EngagementLog[]> {
        const q = query(collection(db, ENGAGEMENTS_COLLECTION), where("clientIds", "array-contains", clientId), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EngagementLog));
    },

    // --- Group Session Methods ---

    async createGroupSession(session: Omit<GroupSession, "id">): Promise<GroupSession> {
        const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), session);

        // Also create an engagement log for this session to track it in the org history
        if (session.organizationId) {
            await this.addEngagement({
                date: session.date,
                interactionType: 'Joint Training', // or logic to determine type
                organizationId: session.organizationId,
                organizationName: session.organizationName,
                staffId: session.createdBy,
                staffName: 'System', // Should be passed in or fetched
                notes: `Hosted Group Session: ${session.topic}. ${session.totalExternalAttendees} external impact.`,
                outcome: `Served ${session.internalClientIds.length} internal clients.`,
                createdAt: Date.now()
            });
        }

        return { id: docRef.id, ...session };
    }
};
