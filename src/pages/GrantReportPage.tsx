import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../lib/firebase';
import { Client } from '../types';
import { Loader, Printer, FileText, CheckCircle, AlertCircle, Play } from 'lucide-react';

const GrantReportPage: React.FC = () => {
    const { user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeClients, setActiveClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);

    // Reporting State
    type ReportItem = {
        client: Client;
        summary: string | null;
        caseNoteCount: number;
        workshopCount: number;
        status: 'pending' | 'generating' | 'completed' | 'error';
        error?: string;
    };

    const [reportItems, setReportItems] = useState<ReportItem[]>([]);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const handleFindClients = async () => {
        setLoadingClients(true);
        setReportItems([]);
        setActiveClients([]);

        try {
            // Construct start and end dates for the selected month (local time is fine for this reporting granularlity usually, 
            // but ensuring full day coverage)
            const startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
            // End date is the 0th day of the next month (last day of current month)
            const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

            const clients = await api.getActiveClientsForRange(startDate, endDate);
            setActiveClients(clients);

            // Initialize report items
            const initialItems: ReportItem[] = clients.map(client => ({
                client,
                summary: null,
                caseNoteCount: 0,
                workshopCount: 0,
                status: 'pending'
            }));
            setReportItems(initialItems);

        } catch (error) {
            console.error("Error finding clients:", error);
            alert("Failed to find active clients. Please try again.");
        } finally {
            setLoadingClients(false);
        }
    };

    const handleGenerateReports = async () => {
        setGenerating(true);
        setProgress(0);

        const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
        const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString(); // Last day of month

        // Process sequentially to avoid rate limits or overwhelming backend
        // We could do small batches, but sequential is safest for reliability and progress bar
        let completed = 0;
        const total = reportItems.length;

        const newItems = [...reportItems];

        for (let i = 0; i < total; i++) {
            const item = newItems[i];

            // Update status to generating
            item.status = 'generating';
            setReportItems([...newItems]); // Force re-render

            try {
                // Determine days range just for fallback, though we use dates now
                const result = await api.generateClientProgressSummary(
                    item.client.id,
                    30, // Unused fallback
                    startDate,
                    endDate
                );

                item.summary = result.summary;
                item.caseNoteCount = result.caseNoteCount || 0;
                item.workshopCount = result.workshopCount || 0;
                item.status = 'completed';
            } catch (err: any) {
                console.error(`Error generating request for ${item.client.profile.firstName}:`, err);
                item.status = 'error';
                item.error = err.message || "Generation failed";
            }

            completed++;
            setProgress(Math.round((completed / total) * 100));
            setReportItems([...newItems]);
        }

        setGenerating(false);
    };

    if (!user || user.role !== 'admin') {
        return (
            <Layout title="Access Denied">
                <div className="p-8 text-center text-red-600">
                    You do not have permission to view this page.
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Monthly Grant Report">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Control Panel - Hidden when printing */}
                <div className="bg-white shadow rounded-lg p-6 mb-8 print:hidden">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Report Configuration</h2>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleFindClients}
                            disabled={loadingClients || generating}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {loadingClients ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Find Active Clients
                        </button>
                    </div>

                    {activeClients.length > 0 && (
                        <div className="mt-6 border-t pt-6">
                            <div className="flex items-center justify-between">
                                <p className="text-gray-700">
                                    Found <span className="font-bold">{activeClients.length}</span> clients with activity in {months[selectedMonth]} {selectedYear}.
                                </p>
                                <div className="space-x-4">
                                    {!generating && progress !== 100 && (
                                        <button
                                            onClick={handleGenerateReports}
                                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center inline-flex"
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Generate Report
                                        </button>
                                    )}
                                    <button
                                        onClick={() => window.print()}
                                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center inline-flex"
                                    >
                                        <Printer className="h-4 w-4 mr-2" />
                                        Print Report
                                    </button>
                                </div>
                            </div>

                            {generating && (
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1 text-center">{progress}% Complete</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Report Display Area */}
                {reportItems.length > 0 ? (
                    <div className="bg-white shadow rounded-lg overflow-hidden print:shadow-none">
                        {/* Print Header */}
                        <div className="hidden print:block p-8 pb-0 text-center">
                            <h1 className="text-2xl font-bold text-gray-900">Monthly Grant Report</h1>
                            <p className="text-gray-600 mt-2">{months[selectedMonth]} {selectedYear}</p>
                            <p className="text-sm text-gray-500 mt-1">Generated on {new Date().toLocaleDateString()}</p>
                        </div>

                        <div className="divide-y divide-gray-200">
                            {reportItems.map((item) => (
                                <div key={item.client.id} className="p-6 break-inside-avoid">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {item.client.profile.firstName} {item.client.profile.lastName}
                                        </h3>
                                        <div className="text-sm text-gray-500 flex space-x-4">
                                            <span>Case Notes: {item.status === 'completed' ? item.caseNoteCount : '-'}</span>
                                            <span>Workshops: {item.status === 'completed' ? item.workshopCount : '-'}</span>
                                        </div>
                                    </div>

                                    {item.status === 'generating' && (
                                        <div className="flex items-center text-blue-600 text-sm italic">
                                            <Loader className="animate-spin h-3 w-3 mr-2" />
                                            Generating analysis...
                                        </div>
                                    )}

                                    {item.status === 'error' && (
                                        <div className="text-red-500 text-sm flex items-center">
                                            <AlertCircle className="h-4 w-4 mr-1" />
                                            Error: {item.error}
                                        </div>
                                    )}

                                    {item.status === 'completed' && item.summary && (
                                        <div className="prose prose-sm text-gray-800 max-w-none bg-gray-50 p-4 rounded-md print:bg-transparent print:p-0">
                                            {item.summary}
                                        </div>
                                    )}

                                    {item.status === 'pending' && !generating && (
                                        <div className="text-gray-400 text-sm italic">
                                            Pending generation...
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    !loadingClients && (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 print:hidden">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm font-medium text-gray-900">No report data</p>
                            <p className="mt-1 text-sm text-gray-500">Select a month and click "Find Active Clients" to begin.</p>
                        </div>
                    )
                )}
            </div>
        </Layout>
    );
};

export default GrantReportPage;
