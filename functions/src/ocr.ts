import { onCall, HttpsError } from "firebase-functions/v2/https";
import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI
const project = process.env.GCLOUD_PROJECT || "briancummings111-6479";
const location = 'us-central1';

const vertexAI = new VertexAI({ project, location });

export const extractFormDataFromPdf = onCall({ timeoutSeconds: 60, memory: "1GiB" }, async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { fileBase64, mimeType, formType } = request.data;

    if (!fileBase64 || !formType) {
        throw new HttpsError('invalid-argument', 'Missing file or form type.');
    }

    try {
        const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";

        if (formType === 'Intake') {
            prompt = `
            You are a data extraction assistant. Extract the following information from this intake form image/PDF and return it as a JSON object.
            
            Target JSON Structure:
            {
                residentOfShastaCounty: boolean,
                currentlyEmployed: boolean,
                publicAssistance: { 
                    housing: boolean, 
                    calFresh: boolean, 
                    calWorksSSI: boolean, 
                    unemployment: boolean, 
                    childcare: boolean, 
                    tribalFunding: boolean, 
                    other: string 
                },
                barriersToEmployment: { 
                    transportation: boolean, 
                    socialSecurityCard: boolean, 
                    criminalRecord: boolean, 
                    housingInstability: boolean, 
                    disability: boolean, 
                    mentalHealthChallenges: boolean, 
                    substanceUseRecovery: boolean, 
                    stateIdDriversLicense: boolean, 
                    other: string 
                },
                educationLevel: string, 
                currentlyEnrolled: boolean,
                hasResume: boolean,
                interestedInTraining: boolean,
                jobInterests: string,
                supportServices: { 
                    resumeInterviewHelp: boolean, 
                    transportation: boolean, 
                    childcare: boolean, 
                    mentalHealthCounseling: boolean, 
                    legalServices: boolean, 
                    other: string 
                },
                incomeCertification: { 
                    applicantName: string, 
                    householdSize: number, 
                    annualIncome: number, 
                    femaleHeadOfHousehold: boolean, 
                    seniorHeadOfHousehold: boolean, 
                    singleParentFamily: boolean, 
                    disabledFamilyMember: boolean,
                    race: {
                         white: boolean,
                         nativeHawaiianPI: boolean,
                         asian: boolean,
                         americanIndianAlaskanNative: boolean,
                         twoOrMoreRaces: boolean,
                         preferNotToAnswer: boolean,
                         blackAfricanAmerican: boolean
                    },
                    hispanicLatino: string 
                }
            }
            return ONLY the JSON.
            `;
        } else if (formType === 'ISP') {
            prompt = `
            You are a data extraction assistant. Extract the following information from this Individual Service Plan (ISP) form image/PDF and return it as a JSON object.
            
            Target JSON Structure:
            {
                ispDate: number, 
                jobDeveloper: string,
                shortTermGoals: string, 
                longTermGoals: string,
                identifiedBarriers: string[], 
                careerPlanning: { 
                    workshopsAssigned: string, 
                    enrolledInCteOrCollege: boolean 
                },
                planOfAction: [
                    { 
                        goal: string, 
                        action: string, 
                        responsibleParty: string, 
                        targetDate: string, 
                        reviewDate: string, 
                        completionDate: string 
                    }
                ],
                supportServices: [
                    { 
                        agency: string, 
                        referralDate: string, 
                        outcome: string 
                    }
                ]
            }
            return ONLY the JSON.
            `;
        }

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType || 'application/pdf', data: fileBase64 } }
                ]
            }]
        });

        const response = result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        if (!text) {
            throw new Error("No extracted text returned.");
        }

        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);

    } catch (error: any) {
        console.error("Vertex AI Error:", error);
        throw new HttpsError('internal', error.message || 'Failed to process document.');
    }
});
