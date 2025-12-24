import React, { useState } from 'react';
import Card from '../Card'; // Assuming Card is in the parent directory based on typical structure
import api from '../../lib/firebase';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface CaseNotesAnalysisSectionProps {
    clientId: string;
}

interface AnalysisResult {
    servicesProvided: string[];
    progressToGoals: string;
}

const CaseNotesAnalysisSection: React.FC<CaseNotesAnalysisSectionProps> = ({ clientId }) => {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchSummary = async () => {
            try {
                const summary = await api.getClientSummary(clientId);
                if (summary) {
                    setAnalysis(summary);
                }
            } catch (err) {
                console.error("Failed to fetch existing summary", err);
            }
        };
        fetchSummary();
    }, [clientId]);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.analyzeClientProgress(clientId);
            setAnalysis(result);
        } catch (err: any) {
            console.error("Analysis failed", err);
            setError("Failed to analyze progress. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
            title="Services & Progress Analysis"
            titleAction={
                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            {analysis ? "Re-Analyze" : "Analyze Progress"}
                        </>
                    )}
                </button>
            }
        >
            <div className="space-y-4">
                {!analysis && !loading && !error && (
                    <p className="text-gray-500 text-sm text-center py-4">
                        Click "Analyze Progress" to generate a summary of services and progress based on Case Notes and ISP.
                    </p>
                )}

                {error && (
                    <div className="bg-red-50 p-4 rounded-md flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {analysis && (
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Services Provided</h4>
                            {analysis.servicesProvided.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {analysis.servicesProvided.map((service, index) => (
                                        <li key={index} className="text-gray-700 text-sm">{service}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No specific services identified in case notes.</p>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Progress to Goals</h4>
                            <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 whitespace-pre-wrap font-sans">
                                {analysis.progressToGoals}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default CaseNotesAnalysisSection;
