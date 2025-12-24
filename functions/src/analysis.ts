import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI
// Note: This requires the correct project location to be set, or it defaults to us-central1
// Using process.env.GCLOUD_PROJECT ensures we target the project the function is deployed to.
const project = process.env.GCLOUD_PROJECT || "wrtp-cms";
console.log(`Initializing Vertex AI with project: ${project}`);

const vertexAI = new VertexAI({ project: project, location: "us-central1" });

const model = vertexAI.getGenerativeModel({
    model: "gemini-2.5-flash",
});

interface AnalysisRequest {
    clientId: string;
}

export const analyzeClientProgress = onCall<AnalysisRequest>(async (request) => {
    console.log(`[analyzeClientProgress] Runtime Project ID: ${process.env.GCLOUD_PROJECT}`);

    if (!request.auth) {
        throw new Error("Unauthenticated");
    }

    const { clientId } = request.data;
    if (!clientId) {
        throw new Error("Missing clientId");
    }

    const db = admin.firestore();

    // 1. Fetch Client Data (ISP and Case Notes)
    const ispQuery = await db.collection("isps").where("clientId", "==", clientId).limit(1).get();
    const ispData = ispQuery.empty ? null : ispQuery.docs[0].data();

    const notesQuery = await db.collection("caseNotes").where("clientId", "==", clientId).get();
    const caseNotes = notesQuery.docs.map(doc => doc.data());

    // Sort notes by date (descending)
    caseNotes.sort((a, b) => b.noteDate - a.noteDate);

    if (!ispData && caseNotes.length === 0) {
        return {
            servicesProvided: ["No data available."],
            progressToGoals: "No ISP or Case Notes found for this client."
        };
    }

    // 2. Construct Prompt
    const prompt = `
    You are an AI assistant helping a case manager review a client's progress.
    
    Here is the client's Individual Service Plan (ISP):
    ${ispData ? JSON.stringify(ispData, null, 2) : "No ISP found."}

    Here are the client's Case Notes (most recent first):
    ${caseNotes.map(n => `Date: ${new Date(n.noteDate).toLocaleDateString()}\nType: ${n.noteType}\nNote: ${n.noteBody}`).join("\n---\n")}

    Please perform the following analysis:
    1. List all services provided based on the case notes. Be specific but concise. Format as a simple list.
    2. Compare the progress made in the case notes to their long and short-term goals as stated in the ISP.
       - Refer to specific notes if relevant.
       - If there is no ISP, summarize the progress based only on notes.
    
    Output Format (JSON):
    {
      "servicesProvided": ["service 1", "service 2", ...],
      "progressToGoals": "Markdown formatted text describing the progress..."
    }
  `;

    // 3. Call Gemini
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        if (!text) {
            throw new Error("No response from Gemini.");
        }

        // Clean up potential markdown formatting in JSON response (```json ... ```)
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const analysis = JSON.parse(jsonString);

        return analysis;

    } catch (error: any) {
        console.error("Gemini Analysis Failed:", error);
        if (error.response) {
            console.error("Error Response:", JSON.stringify(error.response));
        }
        // Return detailed error to client for easier debugging
        throw new Error(`Failed to analyze client progress: ${error.message}`);
    }
});
