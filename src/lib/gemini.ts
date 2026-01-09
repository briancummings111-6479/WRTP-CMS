
interface GeminiResponse {
    candidates: {
        content: {
            parts: {
                text: string;
            }[];
        };
    }[];
}

export const generateMonthlyReport = async (
    apiKey: string,
    month: string,
    year: string,
    reportContext: string
): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
    You are an expert grant writer and program administrator for the Workforce Recovery Training Program (WRTP).
    Your task is to write a monthly narrative report for the City of Redding based on the data provided below.

    **Report Context:**
    - **Month/Year:** ${month} ${year}
    - **Audience:** City of Redding (Grant Partner) and California Department of Housing and Community Development (Oversight Authority).
    - **Goal:** Summarize activities, services provided, and progress made on behalf of clients. Ideally, tell a story of progress rather than just listing numbers.
    - **Tone:** Professional, objective, yet highlighting success and human impact.

    **Data provided:**
    ${reportContext}

    **Specific Instructions:**
    1.  **Summarize Activities:** Describe the workshops held, intake meetings, and general services provided.
    2.  **Highlight Progress:** specific examples of client progress (e.g., "Client A completed their resume...", "Client B attended the financial literacy workshop..."). Use full names if provided in the context.
    3.  **Address Challenges (if any):** If the data suggests barriers (e.g., transportation issues mentioned in notes), mention them constructively.
    4.  **Formatting:** Use a clear narrative format with paragraphs. You can use bullet points for lists of specific items if needed, but the main text should be narrative.
    5.  **Structure:**
        - **Executive Summary:** Brief overview of the month.
        - **Client Services & Activities:** Details on specific clients and workshops.
        - **Outcomes & Achievements:** Notable successes.
        - **Challenges & Solutions:** (Optional, only if data supports it).

    **Important:** Do NOT invent data. Only use the information provided in the "Data provided" section. If information is missing, focus on what IS available.
  `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data: GeminiResponse = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || 'No response generated.';
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
};
