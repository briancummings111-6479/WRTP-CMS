import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';
import api from '../lib/firebase';

interface ProgressSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName: string;
}

const ProgressSummaryModal: React.FC<ProgressSummaryModalProps> = ({ isOpen, onClose, clientId, clientName }) => {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            generateSummary();
        } else {
            // Reset state when closed
            setSummary(null);
            setError(null);
            setCopied(false);
        }
    }, [isOpen, clientId]);

    const generateSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.generateClientProgressSummary(clientId);
            setSummary(result.summary);
        } catch (err: any) {
            console.error("Failed to generate summary:", err);
            setError(err.message || "Failed to generate summary. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (summary) {
            navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Client Progress Summary
                                </h3>
                                <div className="mt-2 text-sm text-gray-500">
                                    <p>Generating summary for <span className="font-semibold">{clientName}</span> based on the last 30 days of activity.</p>
                                </div>

                                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200 min-h-[150px] max-h-[400px] overflow-y-auto">
                                    {loading ? (
                                        <div className="space-y-3 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded"></div>
                                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                            <p className="text-xs text-gray-400 mt-4 text-center">Analyzing Case Notes, Workshops, and ISP...</p>
                                        </div>
                                    ) : error ? (
                                        <div className="text-red-600 text-sm">
                                            <p>{error}</p>
                                            <button onClick={generateSummary} className="mt-2 text-blue-600 hover:underline">Try Again</button>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
                                            {summary}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        {summary && !loading && (
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#404E3B] text-base font-medium text-white hover:bg-[#2F3A2B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B] sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={handleCopy}
                            >
                                {copied ? <><Check className="h-4 w-4 mr-2" /> Copied</> : <><Copy className="h-4 w-4 mr-2" /> Copy to Clipboard</>}
                            </button>
                        )}
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressSummaryModal;
