import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

const db = admin.firestore();

// Initialize Vertex AI
const project = process.env.GCLOUD_PROJECT || "briancummings111-6479";
const location = 'us-central1';
const vertexAI = new VertexAI({ project, location });
const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const queryKnowledgeBase = onCall({ timeoutSeconds: 60, memory: "1GiB" }, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Optional: Add Admin Role check here if strict backend enforcement is needed
    // const userDoc = await db.collection("users").doc(request.auth.uid).get();
    // if (userDoc.data()?.role !== 'admin') { ... }

    const { query, timeRangeMonths = 12 } = request.data;

    if (!query) {
        throw new HttpsError('invalid-argument', 'Missing query text.');
    }

    try {
        // 2. Determine Data Window
        // Use a fixed lookback window to keep context manageable. 
        // 12 months is a good default for "annual report" style queries.
        const now = new Date();
        const pastDate = new Date();
        pastDate.setMonth(now.getMonth() - timeRangeMonths);
        const startTimestamp = pastDate.getTime();

        // 3. Fetch Data
        // To answer "How many clients attended...", we need:
        // - Workshops (attendance)
        // - Case Notes (services rendered)
        // - Clients (names)

        const [workshopsSnap, caseNotesSnap, clientsSnap] = await Promise.all([
            db.collection('workshops')
                .where('workshopDate', '>=', startTimestamp)
                .get(),
            db.collection('caseNotes')
                .where('noteDate', '>=', startTimestamp)
                .get(),
            db.collection('clients').get() // Fetch all clients to map IDs to Names
        ]);

        // 4. Transform Data for Context
        const clientMap = new Map<string, string>();
        clientsSnap.forEach(doc => {
            const data = doc.data();
            const name = `${data.profile?.firstName} ${data.profile?.lastName}`;
            clientMap.set(doc.id, name);
        });

        // Format Workshops
        // CSV-like format is often token-efficient and understandable by Gemini
        const workshopContext = workshopsSnap.docs.map(doc => {
            const data = doc.data();
            const clientName = clientMap.get(data.clientId) || 'Unknown';
            const date = new Date(data.workshopDate).toLocaleDateString();
            const status = data.status;
            // Handle "Other" names
            const name = data.workshopName === 'Other' ? data.workshopNameOther : data.workshopName;
            return `Date: ${date}, Client: ${clientName}, Workshop: ${name}, Status: ${status}`;
        }).join('\n');

        // Format Case Notes
        const caseNoteContext = caseNotesSnap.docs.map(doc => {
            const data = doc.data();
            const clientName = clientMap.get(data.clientId) || 'Unknown';
            const date = new Date(data.noteDate).toLocaleDateString();
            const type = data.noteType; // Case Note vs Contact Note
            // Truncate body to save tokens if needed, but for now include full text (stripped of HTML)
            const body = (data.noteBody || '').replace(/<[^>]*>?/gm, ' ').substring(0, 300); // Limit each note length
            return `Date: ${date}, Client: ${clientName}, Type: ${type}, Note: ${body}`;
        }).join('\n');

        // 5. Construct Prompt
        const systemInstruction = `
        You are an intelligent assistant for the WRTP administrators. 
        You have access to the database of Workshops and Case Notes for the last ${timeRangeMonths} months.
        
        Your goal is to answer the user's question accurately based ONLY on the provided data.
        
        Rules:
        - If the user asks for a count (e.g. "How many..."), count the entries in the provided data manually and carefully.
        - If the user asks "Who...", list the names.
        - If the answer is not in the data, state that you don't have that information.
        - Be concise and professional.
        - The user is an admin, so you can share client names found in the data.
        
        Data Context:
        ---
        Workshops:
        ${workshopContext}
        ---
        Case Notes:
        ${caseNoteContext}
        ---
        `;

        const userPrompt = `Question: ${query}`;

        // 6. Call Gemini
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + userPrompt }] }]
        });

        const response = await result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        return {
            answer: text
        };

    } catch (error: any) {
        console.error("Error in queryKnowledgeBase:", error);
        throw new HttpsError('internal', error.message || 'Failed to process query.');
    }
});
