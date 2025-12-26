import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

// Initialize Admin SDK if not already handled in index (but usually safe to init if check needed)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Initialize Vertex AI
const project = process.env.GCLOUD_PROJECT || "briancummings111-6479";
const location = 'us-central1';
const vertexAI = new VertexAI({ project, location });

export const generateClientProgressSummary = onCall({ timeoutSeconds: 60, memory: "1GiB" }, async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { clientId, timeRangeDays = 30, startDate, endDate } = request.data;

    if (!clientId) {
        throw new HttpsError('invalid-argument', 'Missing client ID.');
    }

    try {
        let startTimestamp: number;
        let endTimestamp: number;
        let dateRangeText: string;

        // Determine date range
        if (startDate && endDate) {
            startTimestamp = new Date(startDate).getTime();
            // meaningful end of day for inclusive range if needed, or just exact timestamp
            // Creating a date from string usually sets time to 00:00:00. 
            // If endDate is "2023-11-30", we probably want to include the whole day.
            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);
            endTimestamp = endD.getTime();
            dateRangeText = `from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
        } else {
            // Default to looking back X days from now
            const now = new Date();
            endTimestamp = now.getTime();
            const pastDate = new Date();
            pastDate.setDate(now.getDate() - timeRangeDays);
            startTimestamp = pastDate.getTime();
            dateRangeText = `for the last ${timeRangeDays} days`;
        }

        // 1. Fetch Client Profile (Name) and ISP Goals
        const clientDoc = await db.collection('clients').doc(clientId).get();
        if (!clientDoc.exists) {
            throw new HttpsError('not-found', 'Client not found.');
        }
        const clientData = clientDoc.data();
        const clientName = `${clientData?.profile?.firstName} ${clientData?.profile?.lastName}`;

        // Fetch ISP
        const ispSnapshot = await db.collection('isps').where('clientId', '==', clientId).limit(1).get();
        const ispData = ispSnapshot.empty ? null : ispSnapshot.docs[0].data();

        // 2. Fetch Recent Case Notes
        const caseNotesSnapshot = await db.collection('caseNotes')
            .where('clientId', '==', clientId)
            .where('noteDate', '>=', startTimestamp)
            .where('noteDate', '<=', endTimestamp)
            .orderBy('noteDate', 'desc')
            .get();

        const recentNotes = caseNotesSnapshot.docs.map(doc => {
            const data = doc.data();
            return `Date: ${new Date(data.noteDate).toLocaleDateString()}, Type: ${data.serviceType}, Note: ${data.noteBody.replace(/<[^>]*>?/gm, '')}`; // Strip HTML
        }).join('\n');

        const caseNoteCount = caseNotesSnapshot.size;

        // 3. Fetch Recent Workshops (Completed/Attended)
        // Note: 'workshops' query needs to be careful with composite indexes if we sort. 
        // We will likely filter in memory if the range is small, or use a simple query.
        // Assuming workshopDate is the field.
        const workshopsSnapshot = await db.collection('workshops')
            .where('clientId', '==', clientId)
            .where('workshopDate', '>=', startTimestamp)
            .where('workshopDate', '<=', endTimestamp)
            .get();

        const completedWorkshops = workshopsSnapshot.docs
            .map(doc => doc.data())
            .filter(w => w.status === 'Completed');

        const workshopCount = completedWorkshops.length;

        const recentWorkshops = completedWorkshops
            .map(w => `Date: ${new Date(w.workshopDate).toLocaleDateString()}, Workshop: ${w.workshopName}`)
            .join('\n');

        // 4. Construct Prompt
        const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are a social work assistant creating a monthly progress summary for a client named ${clientName}.
        
        Based on the following data ${dateRangeText}, write a professional 1-paragraph summary of the client's progress.
        Focus on services rendered, workshops attended, and progress towards goals. Mention any barriers if they appear in the notes.
        
        Context:
        - ISP Short Term Goals: ${ispData?.shortTermGoals || 'None listed'}
        - ISP Long Term Goals: ${ispData?.longTermGoals || 'None listed'}
        
        Activity Log (${dateRangeText}):
        ---
        Case Notes (${caseNoteCount}):
        ${recentNotes || 'No case notes in this period.'}
        
        Workshops Attended (${workshopCount}):
        ${recentWorkshops || 'No workshops attended in this period.'}
        --- 
        
        Output format: A single professional paragraph written in third person. Do not include markdown formatting or bullet points, just text.
        If there is absolutely no activity (no case notes and no workshops), state that "No services were rendered or progress recorded for this period."
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        return {
            summary: text,
            caseNoteCount,
            workshopCount
        };

    } catch (error: any) {
        console.error("Error generating summary:", error);
        throw new HttpsError('internal', error.message || 'Failed to generate summary.');
    }
});
