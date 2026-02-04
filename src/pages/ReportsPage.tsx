import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/firebase';
import { Client, Workshop, CaseNote } from '../types';
import Card from '../components/Card';
import { Printer, Sparkles, Send, Bot, XCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';

const WorkshopStatusBadge: React.FC<{ status: Workshop['status'] }> = ({ status }) => {
    const statusStyles: { [key in Workshop['status']]: string } = {
        Scheduled: 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-purple-100 text-purple-800',
        Completed: 'bg-green-100 text-green-800',
        Declined: 'bg-yellow-100 text-yellow-800',
        'No Show': 'bg-red-100 text-red-800',
        'On Hold': 'bg-gray-100 text-gray-800',
        Canceled: 'bg-gray-100 text-gray-800',
    };
    return (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
            {status}
        </span>
    );
};

const ReportsPage: React.FC = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
    const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'population' | 'encounters' | 'barriers' | 'workshopMatrix' | 'workshopAttendance' | 'timeTracking' | 'narrative' | 'aiInsights'>('population');
    const [workshopFilter, setWorkshopFilter] = useState('All');
    const [selectedCaseManager, setSelectedCaseManager] = useState('All');
    const [matrixStatusFilter, setMatrixStatusFilter] = useState<string>('All');
    const [encountersMonthFilter, setEncountersMonthFilter] = useState<string>('All');
    const [timeTrackingMonthFilter, setTimeTrackingMonthFilter] = useState<string>('All');
    const [clientTypeFilter, setClientTypeFilter] = useState<string>('All');

    // AI Insights State
    const [aiQuery, setAiQuery] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    // Narrative Report State - Restored
    const [reportMonth, setReportMonth] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const apiKey = 'AIzaSyA5aDdvOSqE7B7G2gq5rL3vBLAPx9lDZQg';
    // Removed isGenerating, generatedReport, reportError from state here? 
    // Wait, I need them! They were lines 52-54 in original.
    // I should keep them.
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<string>('');
    const [reportError, setReportError] = useState<string>('');

    // Removed useEffects for apiKey

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [clientsData, workshopsData, usersData, caseNotesData] = await Promise.all([
                    api.getClients(),
                    api.getAllWorkshops(),
                    api.getStaffUsers(),
                    api.getAllCaseNotes()
                ]);
                setClients(clientsData);
                setWorkshops(workshopsData);
                setCaseNotes(caseNotesData);

                // Filter users to only those with "Case Manager" in their title - REMOVED per user request
                const staffUsers = usersData
                    //.filter(u => u.title?.toLowerCase().includes('case manager'))
                    .map(u => ({ id: u.uid, name: u.name }));

                setAdmins(staffUsers);

            } catch (error) {
                console.error("Failed to fetch report data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredClients = useMemo(() => {
        if (selectedCaseManager === 'All') return clients;
        return clients.filter(c => c.metadata.assignedAdminId === selectedCaseManager);
    }, [clients, selectedCaseManager]);

    const encountersReportData = useMemo(() => {
        const filterByStaff = (id: string) => {
            if (selectedCaseManager === 'All') return true;
            return id === selectedCaseManager;
        }

        const filteredCaseNotes = caseNotes.filter(n => filterByStaff(n.staffId));
        const filteredWorkshops = workshops.filter(w => filterByStaff(w.assignedToId));

        // 1. Generate Graph Data (Month to Month)
        const monthlyStats = new Map<string, { month: string, caseNotes: number, contactNotes: number, workshops: number }>();

        const processDate = (timestamp: number, type: 'Case Note' | 'Contact Note' | 'Workshop') => {
            const date = new Date(timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

            if (!monthlyStats.has(monthKey)) {
                monthlyStats.set(monthKey, { month: monthKey, caseNotes: 0, contactNotes: 0, workshops: 0 });
            }
            const stats = monthlyStats.get(monthKey)!;
            if (type === 'Case Note') stats.caseNotes++;
            else if (type === 'Contact Note') stats.contactNotes++;
            else if (type === 'Workshop') stats.workshops++;
        };

        filteredCaseNotes.forEach(n => {
            if (n.noteType === 'Case Note') processDate(n.noteDate, 'Case Note');
            else if (n.noteType === 'Contact Note') processDate(n.noteDate, 'Contact Note');
        });

        filteredWorkshops.forEach(w => {
            if (w.status === 'Completed' || w.status === 'In Progress') {
                processDate(w.workshopDate, 'Workshop');
            }
        });

        // Convert to array and sort chronological
        const graphData = Array.from(monthlyStats.values()).sort((a, b) => a.month.localeCompare(b.month));

        // Format for display
        const formattedGraphData = graphData.map(d => {
            const [y, m] = d.month.split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1);
            return {
                ...d,
                name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                fullMonthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            };
        });

        // 2. Calculate Totals based on Filter
        let totalStats = {
            totalEncounters: 0,
            caseNotesCount: 0,
            contactNotesCount: 0,
            workshopsCount: 0
        };

        if (encountersMonthFilter === 'All') {
            formattedGraphData.forEach(d => {
                totalStats.caseNotesCount += d.caseNotes;
                totalStats.contactNotesCount += d.contactNotes;
                totalStats.workshopsCount += d.workshops;
            });
        } else {
            const monthData = formattedGraphData.find(d => d.month === encountersMonthFilter);
            if (monthData) {
                totalStats.caseNotesCount = monthData.caseNotes;
                totalStats.contactNotesCount = monthData.contactNotes;
                totalStats.workshopsCount = monthData.workshops;
            }
        }
        totalStats.totalEncounters = totalStats.caseNotesCount + totalStats.contactNotesCount + totalStats.workshopsCount;

        // Available Months for Dropdown (descending)
        const availableMonths = formattedGraphData.map(d => ({ value: d.month, label: d.fullMonthName })).sort((a, b) => b.value.localeCompare(a.value));

        return {
            stats: totalStats,
            graphData: formattedGraphData,
            availableMonths
        };
    }, [caseNotes, workshops, encountersMonthFilter, selectedCaseManager]);

    const reportData = useMemo(() => {
        const totalIndividuals = filteredClients.length;
        if (totalIndividuals === 0) {
            return {
                totalIndividuals: 0,
                prospectsCount: 0,
                prospectsPercentage: 0,
                enrolledClientsCount: 0,
                enrolledClientsPercentage: 0,
                generalPopulationCount: 0,
                generalPopulationPercentage: 0,
                chybaCount: 0,
                chybaPercentage: 0,
                activeCount: 0,
                activePercentage: 0,
                inactiveCount: 0,
                inactivePercentage: 0,
            };
        }

        const prospects = filteredClients.filter(c => c.metadata.status === 'Prospect');
        const enrolledClients = filteredClients.filter(c => c.metadata.status !== 'Prospect');

        const prospectsCount = prospects.length;
        const enrolledClientsCount = enrolledClients.length;

        const generalPopulationCount = enrolledClients.filter(c => c.metadata.clientType === 'General Population').length;
        const chybaCount = enrolledClients.filter(c => c.metadata.clientType === 'CHYBA').length;

        const activeCount = enrolledClients.filter(c => c.metadata.status === 'Active').length;
        const inactiveCount = enrolledClients.filter(c => c.metadata.status === 'Inactive').length;

        return {
            totalIndividuals,
            prospectsCount,
            prospectsPercentage: (prospectsCount / totalIndividuals) * 100,
            enrolledClientsCount,
            enrolledClientsPercentage: (enrolledClientsCount / totalIndividuals) * 100,
            generalPopulationCount,
            generalPopulationPercentage: enrolledClientsCount > 0 ? (generalPopulationCount / enrolledClientsCount) * 100 : 0,
            chybaCount,
            chybaPercentage: enrolledClientsCount > 0 ? (chybaCount / enrolledClientsCount) * 100 : 0,
            activeCount,
            activePercentage: enrolledClientsCount > 0 ? (activeCount / enrolledClientsCount) * 100 : 0,
            inactiveCount,
            inactivePercentage: enrolledClientsCount > 0 ? (inactiveCount / enrolledClientsCount) * 100 : 0,
        };

    }, [filteredClients]);

    const workshopMatrixData = useMemo(() => {
        const allWorkshopNames = Array.from<string>(new Set(workshops.map(w =>
            (w.workshopName === 'Other' && w.workshopNameOther ? w.workshopNameOther : w.workshopName) as string
        ))).sort((a, b) => {
            const predefinedOrder = [
                'Career Explorations',
                'Job Preparedness',
                'Interview Success',
                'Financial Literacy',
                'Entrepreneurship'
            ];

            const indexA = predefinedOrder.indexOf(a as string);
            const indexB = predefinedOrder.indexOf(b as string);

            // Both are predefined -> sort by order
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;

            // Only A is predefined -> A comes first
            if (indexA !== -1) return -1;
            // Only B is predefined -> B comes first
            if (indexB !== -1) return 1;

            // Special case: 'Other' always comes last
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;

            // Both are non-predefined (custom) -> sort alphabetical
            return (a as string).localeCompare(b as string);
        });

        const matrix = filteredClients
            .map(client => {
                const clientWorkshops = workshops.filter(w => w.clientId === client.id);
                const workshopStatusMap: { [key: string]: Workshop['status'] } = {};

                clientWorkshops.forEach(w => {
                    const name = w.workshopName === 'Other' && w.workshopNameOther ? w.workshopNameOther : w.workshopName;
                    if (!workshopStatusMap[name] || w.status === 'Completed') {
                        workshopStatusMap[name] = w.status;
                    }
                });

                return {
                    client,
                    workshopStatusMap
                };
            })
            // Sort by Client Name Alphabetically
            .sort((a, b) => {
                const nameA = `${a.client.profile.firstName} ${a.client.profile.lastName}`.toLowerCase();
                const nameB = `${b.client.profile.firstName} ${b.client.profile.lastName}`.toLowerCase();
                return nameA.localeCompare(nameB);
            })
            // Filter based on matrixStatusFilter
            .filter(row => {
                if (matrixStatusFilter === 'All') return true;

                const statuses = Object.values(row.workshopStatusMap);

                if (matrixStatusFilter === 'Blank') {
                    // Show if ANY workshop is missing (blank)
                    // A client has a "blank" for a workshop if that workshop name is NOT in their status map
                    return Object.keys(row.workshopStatusMap).length < allWorkshopNames.length;
                }

                // Otherwise check if ANY of their workshops match the selected status
                return statuses.includes(matrixStatusFilter as Workshop['status']);
            });

        return { allWorkshopNames, matrix };
    }, [filteredClients, workshops, matrixStatusFilter]);


    const workshopReportData = useMemo(() => {
        const filteredClientIds = new Set(filteredClients.map(c => c.id));
        const relevantWorkshops = workshops.filter(w => filteredClientIds.has(w.clientId));

        if (filteredClients.length === 0 || relevantWorkshops.length === 0) return { groupedWorkshops: {}, workshopNames: [] };

        const clientMap = new Map(filteredClients.map(c => [c.id, `${c.profile.firstName} ${c.profile.lastName}`]));

        const grouped = relevantWorkshops.reduce((acc, workshop) => {
            const workshopDisplayName = workshop.workshopName === 'Other' && workshop.workshopNameOther
                ? workshop.workshopNameOther
                : workshop.workshopName;

            if (!acc[workshopDisplayName]) {
                acc[workshopDisplayName] = [];
            }

            acc[workshopDisplayName].push({
                ...workshop,
                clientName: clientMap.get(workshop.clientId) || 'Unknown Client',
            });
            return acc;
        }, {} as { [key: string]: (Workshop & { clientName: string })[] });

        for (const key in grouped) {
            grouped[key].sort((a, b) => a.clientName.localeCompare(b.clientName));
        }


        const workshopNames = Object.keys(grouped).sort();

        return { groupedWorkshops: grouped, workshopNames };
    }, [filteredClients, workshops]);


    const barriersReportData = useMemo(() => {
        // Filter for ACTIVE clients only
        const activeClients = filteredClients.filter(c => c.metadata.status === 'Active');

        const barriersList = [
            { key: 'transportation', label: 'Transportation' },
            { key: 'substanceUseRecovery', label: 'Substance Use Recovery' },
            { key: 'stateIdDriversLicense', label: 'State Id Drivers License' },
            { key: 'mentalHealthChallenges', label: 'Mental Health Challenges' },
            { key: 'housingInstability', label: 'Housing Instability' },
            { key: 'disability', label: 'Disability' },
            { key: 'criminalRecord', label: 'Criminal Record' },
            { key: 'socialSecurityCard', label: 'Social Security Card' },
            { key: 'other', label: 'Other' },
        ];

        const data = barriersList.map(barrier => {
            let genPopCount = 0;
            let chybaCount = 0;

            activeClients.forEach(client => {
                const barriers = client.demographics?.barriersToEmployment;
                if (barriers) {
                    // check if the barrier is present (true for boolean, non-empty for string 'other')
                    const isPresent = barrier.key === 'other'
                        ? !!barriers.other
                        : (barriers as any)[barrier.key] === true;

                    if (isPresent) {
                        if (client.metadata.clientType === 'General Population') {
                            genPopCount++;
                        } else if (client.metadata.clientType === 'CHYBA') {
                            chybaCount++;
                        }
                    }
                }
            });

            const totalGenPop = activeClients.filter(c => c.metadata.clientType === 'General Population').length;
            const totalChyba = activeClients.filter(c => c.metadata.clientType === 'CHYBA').length;

            return {
                name: barrier.label,
                genPopCount,
                chybaCount,
                genPopPercentage: totalGenPop > 0 ? (genPopCount / totalGenPop) * 100 : 0,
                chybaPercentage: totalChyba > 0 ? (chybaCount / totalChyba) * 100 : 0
            };
        });

        return { data, totalActive: activeClients.length };
    }, [filteredClients]);

    const timeTrackingData = useMemo(() => {
        // 1. Prepare Filters
        const filterByStaff = (id: string) => {
            if (selectedCaseManager === 'All') return true;
            return id === selectedCaseManager;
        }

        const filterByClientType = (client: Client | undefined) => {
            if (clientTypeFilter === 'All') return true;
            return client?.metadata?.clientType === clientTypeFilter;
        }

        const filterByMonth = (timestamp: number) => {
            if (timeTrackingMonthFilter === 'All') return true;
            const date = new Date(timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === timeTrackingMonthFilter;
        };

        // 2. Filter Notes
        const filteredNotes = caseNotes.filter(n => {
            const client = clients.find(c => c.id === n.clientId);
            // Handle case where client might be missing (though unlikely in valid DB)
            return filterByStaff(n.staffId) && (client ? filterByClientType(client) : clientTypeFilter === 'All') && filterByMonth(n.noteDate);
        });

        // 3. Aggregate Data
        let totalMinutes = 0;
        const staffStats: { [key: string]: { name: string, minutes: number, noteCount: number } } = {};

        filteredNotes.forEach(note => {
            const minutes = note.durationMinutes || 0;
            totalMinutes += minutes;

            if (!staffStats[note.staffId]) {
                staffStats[note.staffId] = {
                    name: note.staffName || 'Unknown Staff',
                    minutes: 0,
                    noteCount: 0
                };
            }
            staffStats[note.staffId].minutes += minutes;
            staffStats[note.staffId].noteCount += 1;
        });

        // 4. Calculate Available Months (for dropdown)
        // We scan ALL case notes for this
        const monthsSet = new Set<string>();
        caseNotes.forEach(n => {
            const date = new Date(n.noteDate);
            monthsSet.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        });
        const availableMonths = Array.from(monthsSet)
            .sort((a, b) => b.localeCompare(a)) // Descending
            .map(m => {
                const [y, month] = m.split('-');
                const date = new Date(parseInt(y), parseInt(month) - 1);
                return {
                    value: m,
                    label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                };
            });

        // 5. Convert Staff Stats to Array
        const staffBreakdown = Object.values(staffStats).sort((a, b) => b.minutes - a.minutes);

        return {
            totalMinutes,
            totalHours: (totalMinutes / 60).toFixed(2),
            staffBreakdown,
            availableMonths,
            noteCount: filteredNotes.length
        };
    }, [caseNotes, clients, selectedCaseManager, clientTypeFilter, timeTrackingMonthFilter]);




    const generateClientReportHTML = () => {
        const caseManagerName = selectedCaseManager === 'All'
            ? 'All Staff'
            : admins.find(a => a.id === selectedCaseManager)?.name || 'Unknown';

        return `
            <html>
            <head>
                <title>Client Population Report</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: sans-serif; }
                    .break-inside-avoid { page-break-inside: avoid; }
                </style>
            </head>
            <body class="p-8 bg-white">
                <header class="mb-8 border-b pb-4">
                    <h1 class="text-3xl font-bold text-gray-900">Client Population Report</h1>
                    <div class="mt-2 flex justify-between text-gray-600">
                        <p>Generated on: ${new Date().toLocaleDateString()}</p>
                        <p>WRTP Staff: <span class="font-semibold text-gray-800">${caseManagerName}</span></p>
                    </div>
                </header>
                
                <main class="space-y-8">
                    <section class="break-inside-avoid">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Overall Breakdown</h2>
                        <div class="grid grid-cols-3 gap-6">
                            <div class="bg-gray-50 p-4 rounded-lg border">
                                <p class="text-sm text-gray-500 uppercase tracking-wide">Prospects</p>
                                <p class="text-3xl font-bold text-gray-800">${reportData.prospectsCount} <span class="text-lg font-normal text-gray-600">(${reportData.prospectsPercentage.toFixed(1)}%)</span></p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg border">
                                <p class="text-sm text-gray-500 uppercase tracking-wide">Enrolled Clients</p>
                                <p class="text-3xl font-bold text-gray-800">${reportData.enrolledClientsCount} <span class="text-lg font-normal text-gray-600">(${reportData.enrolledClientsPercentage.toFixed(1)}%)</span></p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg border">
                                <p class="text-sm text-gray-500 uppercase tracking-wide">Total Individuals</p>
                                <p class="text-3xl font-bold text-gray-800">${reportData.totalIndividuals}</p>
                            </div>
                        </div>
                    </section>

                    <section class="break-inside-avoid">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Enrolled Client Details</h2>
                        <div class="grid grid-cols-2 gap-8">
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-3 text-lg">By Type</h3>
                                <table class="w-full text-sm text-left text-gray-500">
                                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" class="px-4 py-2">Type</th>
                                            <th scope="col" class="px-4 py-2 text-right">Count</th>
                                            <th scope="col" class="px-4 py-2 text-right">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr class="bg-white border-b">
                                            <td class="px-4 py-2 font-medium text-gray-900">General Population</td>
                                            <td class="px-4 py-2 text-right">${reportData.generalPopulationCount}</td>
                                            <td class="px-4 py-2 text-right">${reportData.generalPopulationPercentage.toFixed(1)}%</td>
                                        </tr>
                                        <tr class="bg-white border-b">
                                            <td class="px-4 py-2 font-medium text-gray-900">CHYBA</td>
                                            <td class="px-4 py-2 text-right">${reportData.chybaCount}</td>
                                            <td class="px-4 py-2 text-right">${reportData.chybaPercentage.toFixed(1)}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-3 text-lg">By Status</h3>
                                <table class="w-full text-sm text-left text-gray-500">
                                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" class="px-4 py-2">Status</th>
                                            <th scope="col" class="px-4 py-2 text-right">Count</th>
                                            <th scope="col" class="px-4 py-2 text-right">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr class="bg-white border-b">
                                            <td class="px-4 py-2 font-medium text-gray-900">Active</td>
                                            <td class="px-4 py-2 text-right">${reportData.activeCount}</td>
                                            <td class="px-4 py-2 text-right">${reportData.activePercentage.toFixed(1)}%</td>
                                        </tr>
                                        <tr class="bg-white border-b">
                                            <td class="px-4 py-2 font-medium text-gray-900">Inactive</td>
                                            <td class="px-4 py-2 text-right">${reportData.inactiveCount}</td>
                                            <td class="px-4 py-2 text-right">${reportData.inactivePercentage.toFixed(1)}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </main>
            </body>
            </html>
        `;
    };

    const generateBarriersReportHTML = () => {
        const caseManagerName = selectedCaseManager === 'All'
            ? 'All Staff'
            : admins.find(a => a.id === selectedCaseManager)?.name || 'Unknown';

        const rows = barriersReportData.data.map(d => `
            <tr class="bg-white border-b">
                <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${d.name}</td>
                <td class="px-6 py-4 text-center">
                    <span class="font-semibold text-gray-900">${d.genPopCount}</span>
                    <span class="text-sm text-gray-500 ml-1">(${d.genPopPercentage.toFixed(1)}%)</span>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="font-semibold text-gray-900">${d.chybaCount}</span>
                    <span class="text-sm text-gray-500 ml-1">(${d.chybaPercentage.toFixed(1)}%)</span>
                </td>
            </tr>
        `).join('');

        return `
            <html>
            <head>
                <title>Barriers to Employment Report</title>
                <script src="https://cdn.tailwindcss.com"></script>
                 <style>
                    body { font-family: sans-serif; }
                    .break-inside-avoid { page-break-inside: avoid; }
                </style>
            </head>
             <body class="p-8 bg-white">
                <header class="mb-8 border-b pb-4">
                    <h1 class="text-3xl font-bold text-gray-900">Barriers to Employment Report</h1>
                    <div class="mt-2 flex justify-between text-gray-600">
                        <p>Generated on: ${new Date().toLocaleDateString()}</p>
                        <p>WRTP Staff: <span class="font-semibold text-gray-800">${caseManagerName}</span></p>
                    </div>
                     <p className="mt-1 text-sm text-gray-500">Based on ${barriersReportData.totalActive} Active Clients</p>
                </header>
                <main>
                    <table class="w-full text-sm text-left text-gray-500">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-3">Barrier</th>
                                <th scope="col" class="px-6 py-3 text-center">General Population</th>
                                <th scope="col" class="px-6 py-3 text-center">CHYBA Students</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </main>
            </body>
            </html>
        `;
    };

    const handlePrintClientReport = () => {
        const printContent = generateClientReportHTML();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const handlePrintBarriersReport = () => {
        const printContent = generateBarriersReportHTML();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const generateWorkshopReportHTML = () => {
        const getStatusBadgeHTML = (status: Workshop['status']) => {
            const statusStyles: { [key in Workshop['status']]: string } = {
                Scheduled: 'bg-blue-100 text-blue-800',
                'In Progress': 'bg-purple-100 text-purple-800',
                Completed: 'bg-green-100 text-green-800',
                Declined: 'bg-yellow-100 text-yellow-800',
                'No Show': 'bg-red-100 text-red-800',
                'On Hold': 'bg-gray-100 text-gray-800',
                Canceled: 'bg-gray-100 text-gray-800',
            };
            const classes = `px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`;
            return `<span class="${classes}">${status}</span>`;
        };

        const workshopsToPrint = workshopReportData.workshopNames
            .filter(name => workshopFilter === 'All' || name === workshopFilter)
            .map(workshopName => {
                const tableRows = workshopReportData.groupedWorkshops[workshopName].map(entry => `
                    <tr key="${entry.id}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${entry.clientName}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${getStatusBadgeHTML(entry.status)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(entry.workshopDate).toLocaleDateString()}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.assignedToName}</td>
                    </tr>
                `).join('');

                return `
                    <div class="break-inside-avoid">
                        <h3 class="text-lg font-semibold text-gray-800 mb-3">${workshopName}</h3>
                        <div class="border rounded-lg">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workshop Date</th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Staff</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">${tableRows}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            }).join('<div class="h-8"></div>');

        const noDataMessage = workshopReportData.workshopNames.length === 0
            ? '<p class="text-center text-gray-500 py-10">No workshop data available to generate a report.</p>'
            : '';

        const caseManagerName = selectedCaseManager === 'All'
            ? 'All Staff'
            : admins.find(a => a.id === selectedCaseManager)?.name || 'Unknown';

        return `
            <html>
            <head>
                <title>Workshop Attendance Report</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: sans-serif; }
                    .break-inside-avoid { page-break-inside: avoid; }
                </style>
            </head>
            <body class="p-8 bg-white">
                <header class="mb-6">
                    <h1 class="text-2xl font-bold">Workshop Attendance Report</h1>
                    <p class="text-gray-600">Generated on: ${new Date().toLocaleDateString()}</p>
                    <p class="text-gray-600">WRTP Staff: ${caseManagerName}</p>
                    ${workshopFilter !== 'All' ? `<p class="text-gray-600">Filter: ${workshopFilter}</p>` : ''}
                </header>
                <main class="space-y-8">
                    ${workshopsToPrint || noDataMessage}
                </main>
            </body>
            </html>
        `;
    };

    const handlePrintWorkshopReport = () => {
        const printContent = generateWorkshopReportHTML();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const generateTimeTrackingReportHTML = () => {
        const caseManagerName = selectedCaseManager === 'All'
            ? 'All Staff'
            : admins.find(a => a.id === selectedCaseManager)?.name || 'Unknown';

        const monthName = timeTrackingMonthFilter === 'All'
            ? 'All Time'
            : timeTrackingData.availableMonths.find(m => m.value === timeTrackingMonthFilter)?.label || timeTrackingMonthFilter;

        const rows = timeTrackingData.staffBreakdown.map(s => `
            <tr class="bg-white border-b">
                <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${s.name}</td>
                <td class="px-6 py-4 text-center text-gray-700">${s.minutes}</td>
                <td class="px-6 py-4 text-center text-gray-700">${(s.minutes / 60).toFixed(2)}</td>
                <td class="px-6 py-4 text-center text-gray-700">${s.noteCount}</td>
            </tr>
        `).join('');

        return `
            <html>
            <head>
                <title>Case Management Time Report</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: sans-serif; }
                    .break-inside-avoid { page-break-inside: avoid; }
                </style>
            </head>
            <body class="p-8 bg-white">
                <header class="mb-8 border-b pb-4">
                    <h1 class="text-3xl font-bold text-gray-900">Case Management Time Report</h1>
                    <div class="mt-2 text-gray-600 space-y-1">
                        <p>Generated on: ${new Date().toLocaleDateString()}</p>
                        <p>Staff Filter: <span class="font-semibold text-gray-800">${caseManagerName}</span></p>
                        <p>Time Period: <span class="font-semibold text-gray-800">${monthName}</span></p>
                        <p>Client Type: <span class="font-semibold text-gray-800">${clientTypeFilter}</span></p>
                    </div>
                </header>
                
                <main class="space-y-8">
                    <section class="break-inside-avoid">
                        <div class="grid grid-cols-2 gap-6 mb-8">
                            <div class="bg-gray-50 p-6 rounded-lg border">
                                <p class="text-sm text-gray-500 uppercase tracking-wide">Total Time Spent</p>
                                <p class="text-4xl font-bold text-[#404E3B] mt-2">${timeTrackingData.totalHours} <span class="text-xl font-normal text-gray-600">Hours</span></p>
                                <p class="text-sm text-gray-500 mt-1">(${timeTrackingData.totalMinutes} Minutes)</p>
                            </div>
                            <div class="bg-gray-50 p-6 rounded-lg border">
                                <p class="text-sm text-gray-500 uppercase tracking-wide">Total Case Notes</p>
                                <p class="text-4xl font-bold text-gray-800 mt-2">${timeTrackingData.noteCount}</p>
                            </div>
                        </div>

                        <h3 className="font-semibold text-gray-800 mb-3 text-lg">Staff Breakdown</h3>
                        <table class="w-full text-sm text-left text-gray-500 border rounded-lg overflow-hidden">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-6 py-3">Staff Member</th>
                                    <th scope="col" class="px-6 py-3 text-center">Minutes</th>
                                    <th scope="col" class="px-6 py-3 text-center">Hours</th>
                                    <th scope="col" class="px-6 py-3 text-center">Note Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </section>
                </main>
            </body>
            </html>
        `;
    };

    const handlePrintTimeTrackingReport = () => {
        const printContent = generateTimeTrackingReportHTML();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const generateNarrativeReport = async () => {
        setReportError('');
        setIsGenerating(true);
        setGeneratedReport('');

        try {
            const [yearStr, monthStr] = reportMonth.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr) - 1;

            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            const startTimestamp = startDate.getTime();
            const endTimestamp = endDate.getTime();

            const narrativeContext = {
                month: startDate.toLocaleString('default', { month: 'long' }),
                year: year,
                overview: {
                    activeClients: reportData.activeCount,
                    totalEncounters: 0, // Calculated below based on date range
                    newIntakesCount: 0,
                },
                newIntakes: [] as string[],
                workshops: [] as any[],
                clientProgress: [] as string[]
            };

            // Filter New Intakes
            clients.forEach(client => {
                if (client.metadata.dateCreated >= startTimestamp && client.metadata.dateCreated <= endTimestamp) {
                    narrativeContext.newIntakes.push(`${client.profile.firstName} ${client.profile.lastName}`);
                }
            });
            narrativeContext.overview.newIntakesCount = narrativeContext.newIntakes.length;

            // Filter Workshops
            const filteredWorkshops = workshops.filter(ws =>
                ws.workshopDate >= startTimestamp &&
                ws.workshopDate <= endTimestamp &&
                ws.status === 'Completed'
            );

            narrativeContext.workshops = filteredWorkshops.map(ws => {
                const client = clients.find(c => c.id === ws.clientId);
                return {
                    date: new Date(ws.workshopDate).toLocaleDateString(),
                    topic: ws.workshopName === 'Other' ? ws.workshopNameOther : ws.workshopName,
                    attendee: client ? `${client.profile.firstName} ${client.profile.lastName}` : 'Unknown Client'
                };
            });

            // Filter Case Notes
            const filteredNotes = caseNotes.filter(note =>
                note.noteDate >= startTimestamp &&
                note.noteDate <= endTimestamp
            );
            narrativeContext.overview.totalEncounters = filteredNotes.length + filteredWorkshops.length;

            filteredNotes.forEach(note => {
                const client = clients.find(c => c.id === note.clientId);
                if (client) {
                    const cleanBody = note.noteBody.replace(/<[^>]*>?/gm, '');
                    narrativeContext.clientProgress.push(`Client: ${client.profile.firstName} ${client.profile.lastName} - Note Type: ${note.noteType} - Note: ${cleanBody}`);
                }
            });

            const contextString = JSON.stringify(narrativeContext, null, 2);

            const { generateMonthlyReport } = await import('../lib/gemini');

            const report = await generateMonthlyReport(apiKey, startDate.toLocaleString('default', { month: 'long' }), year.toString(), contextString);
            setGeneratedReport(report);

        } catch (err: any) {
            console.error(err);
            setReportError('Failed to generate report: ' + (err.message || 'Unknown error'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAIQuerySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiQuery.trim()) return;

        setAiLoading(true);
        setAiError('');
        setAiAnswer('');

        try {
            const result = await api.queryKnowledgeBase(aiQuery);
            setAiAnswer(result.answer);
        } catch (err: any) {
            console.error("AI Query Error:", err);
            setAiError(err.message || 'Failed to analyze query.');
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading report data...</div>;
    }

    const StatListItem: React.FC<{ label: string, value: number, percentage: number }> = ({ label, value, percentage }) => (
        <li className="flex justify-between items-baseline py-1 border-b border-gray-50 last:border-0">
            <span className="text-gray-600 text-sm">{label}</span>
            <span className="font-medium text-gray-900 text-sm">
                {value} <span className="text-xs font-normal text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
            </span>
        </li>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports Dashboard</h1>
                    <p className="text-gray-500 mt-1">Analytics and performance metrics</p>
                </div>

                <div className="flex items-center space-x-3 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
                    <label htmlFor="caseManagerFilter" className="text-sm font-medium text-gray-700 pl-2">Filter Staff:</label>
                    <select
                        id="caseManagerFilter"
                        value={selectedCaseManager}
                        onChange={(e) => setSelectedCaseManager(e.target.value)}
                        className="block w-48 pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] rounded-md"
                    >
                        <option value="All">All Staff</option>
                        {admins.map(admin => (
                            <option key={admin.id} value={admin.id}>{admin.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto space-x-1 mb-6 no-print bg-gray-100/50 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('population')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'population'
                        ? 'bg-white text-[#404E3B] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    Population
                </button>
                <button
                    onClick={() => setActiveTab('encounters')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'encounters'
                        ? 'bg-white text-[#404E3B] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    Encounters
                </button>
                <button
                    onClick={() => setActiveTab('barriers')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'barriers'
                        ? 'bg-white text-[#404E3B] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    Barriers
                </button>
                <button
                    onClick={() => setActiveTab('workshopMatrix')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'workshopMatrix'
                        ? 'bg-white text-[#404E3B] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    Workshop Matrix
                </button>
                <button
                    onClick={() => setActiveTab('workshopAttendance')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'workshopAttendance'
                        ? 'bg-white text-[#404E3B] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    Attendance
                </button>
                <button
                    onClick={() => setActiveTab('timeTracking')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'timeTracking'
                        ? 'bg-white text-[#404E3B] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                >
                    Time Tracking
                </button>

                {/* Admin Only Tabs */}
                {user?.role === 'admin' && (
                    <>
                        <button
                            onClick={() => setActiveTab('narrative')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-1 ${activeTab === 'narrative'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                                }`}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Narrative</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('aiInsights')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-1 ${activeTab === 'aiInsights'
                                ? 'bg-white text-purple-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-600 hover:text-purple-600 hover:bg-white/50'
                                }`}
                        >
                            <Bot className="h-3.5 w-3.5" />
                            <span>AI Insights</span>
                        </button>
                    </>
                )}
            </div>

            {/* Client Population Report */}
            {activeTab === 'population' && (
                <Card
                    title="Client Population Report"
                    className="no-print"
                    titleAction={
                        <button
                            onClick={handlePrintClientReport}
                            className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Report
                        </button>
                    }
                >
                    {/* Section 1: Overview Cards */}
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Overall Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Prospects</p>
                                <p className="text-3xl font-bold text-gray-800">{reportData.prospectsCount} <span className="text-lg font-normal text-gray-600">({reportData.prospectsPercentage.toFixed(1)}%)</span></p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Enrolled Clients</p>
                                <p className="text-3xl font-bold text-gray-800">{reportData.enrolledClientsCount} <span className="text-lg font-normal text-gray-600">({reportData.enrolledClientsPercentage.toFixed(1)}%)</span></p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Total Individuals</p>
                                <p className="text-3xl font-bold text-gray-800">{reportData.totalIndividuals}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Enrolled Client Details */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Enrolled Client Details <span className="font-normal text-gray-500">({reportData.enrolledClientsCount} total)</span></h3>
                        {reportData.enrolledClientsCount > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sub-section: By Type */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h4 className="font-semibold text-gray-800 mb-2">By Type</h4>
                                    <ul className="space-y-2 text-sm">
                                        <StatListItem label="General Population" value={reportData.generalPopulationCount} percentage={reportData.generalPopulationPercentage} />
                                        <StatListItem label="CHYBA" value={reportData.chybaCount} percentage={reportData.chybaPercentage} />
                                    </ul>
                                </div>
                                {/* Sub-section: By Status */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h4 className="font-semibold text-gray-800 mb-2">By Status</h4>
                                    <ul className="space-y-2 text-sm">
                                        <StatListItem label="Active" value={reportData.activeCount} percentage={reportData.activePercentage} />
                                        <StatListItem label="Inactive" value={reportData.inactiveCount} percentage={reportData.inactivePercentage} />
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-6">No enrolled clients to analyze.</p>
                        )}
                    </div>
                </Card>
            )}

            {/* Encounters Report */}
            {activeTab === 'encounters' && (
                <Card
                    title="Encounters Report"
                    className="no-print"
                    titleAction={
                        <div className="flex items-center space-x-2">
                            <label htmlFor="encountersMonthFilter" className="text-sm font-medium text-gray-700">Month:</label>
                            <select
                                id="encountersMonthFilter"
                                value={encountersMonthFilter}
                                onChange={(e) => setEncountersMonthFilter(e.target.value)}
                                className="p-1 border border-gray-300 rounded-md text-sm bg-white focus:ring-[#404E3B] focus:border-[#404E3B]"
                            >
                                <option value="All">All Months</option>
                                {encountersReportData.availableMonths.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    }
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Encounters</p>
                            <p className="text-3xl font-bold text-gray-800">{encountersReportData.stats.totalEncounters}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Case Notes</p>
                            <p className="text-3xl font-bold text-gray-800">{encountersReportData.stats.caseNotesCount}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Contact Notes</p>
                            <p className="text-3xl font-bold text-gray-800">{encountersReportData.stats.contactNotesCount}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Workshops Delivered</p>
                            <p className="text-3xl font-bold text-gray-800">{encountersReportData.stats.workshopsCount}</p>
                        </div>
                    </div>

                    <div className="h-[400px] w-full mt-8">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Encounters Trend</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={encountersReportData.graphData}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 30,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="caseNotes" name="Case Notes" stackId="a" fill="#4D7C7B" />
                                <Bar dataKey="workshops" name="Workshops Delivered" stackId="a" fill="#9CB072" />
                                <Bar dataKey="contactNotes" name="Contact Notes" stackId="a" fill="#6B7280" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}

            {/* Barriers to Employment Report */}
            {activeTab === 'barriers' && (
                <Card
                    title="Barriers to Employment"
                    className="no-print"
                    titleAction={
                        <button
                            onClick={handlePrintBarriersReport}
                            className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Report
                        </button>
                    }
                >
                    <div className="mb-4">
                        <p className="text-sm text-gray-500">Analysis based on <span className="font-semibold text-gray-700">{barriersReportData.totalActive} Active</span> clients.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Chart Area */}
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={barriersReportData.data}
                                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" unit="%" />
                                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']}
                                    />
                                    <Legend />
                                    <Bar dataKey="genPopPercentage" name="Gen Pop %" fill="#4D7C7B" />
                                    <Bar dataKey="chybaPercentage" name="CHYBA %" fill="#E6A532" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Table Area */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Barrier</th>
                                        <th scope="col" className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">Gen Pop</th>
                                        <th scope="col" className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">CHYBA</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {barriersReportData.data.map((barrier) => (
                                        <tr key={barrier.name}>
                                            <td className="px-3 py-2 font-medium text-gray-900">{barrier.name}</td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="text-gray-900 font-semibold">{barrier.genPopCount}</div>
                                                <div className="text-xs text-gray-500">{barrier.genPopPercentage.toFixed(1)}%</div>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="text-gray-900 font-semibold">{barrier.chybaCount}</div>
                                                <div className="text-xs text-gray-500">{barrier.chybaPercentage.toFixed(1)}%</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'workshopMatrix' && (
                <Card
                    title="Workshop Matrix Report"
                    titleAction={
                        <div className="flex items-center space-x-2">
                            <label htmlFor="matrixStatusFilter" className="text-sm font-medium text-gray-700">Filter Status:</label>
                            <select
                                id="matrixStatusFilter"
                                value={matrixStatusFilter}
                                onChange={(e) => setMatrixStatusFilter(e.target.value)}
                                className="p-1 border border-gray-300 rounded-md text-sm bg-white focus:ring-[#404E3B] focus:border-[#404E3B]"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Declined">Declined</option>
                                <option value="No Show">No Show</option>
                                <option value="Blank">Not Enrolled (Blank)</option>
                            </select>
                        </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                        Client Name
                                    </th>
                                    {workshopMatrixData.allWorkshopNames.map(name => (
                                        <th key={name} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                            {name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {workshopMatrixData.matrix.map(({ client, workshopStatusMap }) => (
                                    <tr key={client.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                                            <Link to={`/clients/${client.id}`} className="text-[#404E3B] hover:underline">
                                                {client.profile.firstName} {client.profile.lastName}
                                            </Link>
                                        </td>
                                        {workshopMatrixData.allWorkshopNames.map(name => (
                                            <td key={name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {workshopStatusMap[name] ? (
                                                    <WorkshopStatusBadge status={workshopStatusMap[name]} />
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {workshopMatrixData.matrix.length === 0 && (
                                    <tr>
                                        <td colSpan={workshopMatrixData.allWorkshopNames.length + 1} className="px-6 py-4 text-center text-sm text-gray-500">
                                            No clients found matching the criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'workshopAttendance' && (
                <Card
                    title="Workshop Attendance List"
                    className="printable-card"
                    titleAction={
                        <div className="relative z-10 flex items-center space-x-4 no-print">
                            <div>
                                <label htmlFor="workshopFilter" className="sr-only">Filter by workshop</label>
                                <select
                                    id="workshopFilter"
                                    value={workshopFilter}
                                    onChange={e => setWorkshopFilter(e.target.value)}
                                    className="p-1 border border-gray-300 rounded-md text-sm bg-white focus:ring-[#404E3B] focus:border-[#404E3B]"
                                >
                                    <option value="All">All Workshops</option>
                                    {workshopReportData.workshopNames.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={handlePrintWorkshopReport}
                                className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Print Report
                            </button>
                        </div>
                    }
                >
                    <div id="workshop-report-printable" className="space-y-8">
                        {workshopReportData.workshopNames.filter(name => workshopFilter === 'All' || name === workshopFilter).map(workshopName => (
                            <div key={workshopName} className="break-inside-avoid">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">{workshopName}</h3>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workshop Date</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Staff</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {workshopReportData.groupedWorkshops[workshopName].map(entry => (
                                                <tr key={entry.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Link to={`/clients/${entry.clientId}`} className="text-sm font-medium text-[#404E3B] hover:underline">
                                                            {entry.clientName}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <WorkshopStatusBadge status={entry.status} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(entry.workshopDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.assignedToName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                        {workshopReportData.workshopNames.length === 0 && !loading && (
                            <p className="text-center text-gray-500 py-10">No workshop data available to generate a report.</p>
                        )}
                    </div>
                </Card>
            )}

            {/* Time Tracking Report */}
            {activeTab === 'timeTracking' && (
                <Card
                    title="Case Management Time Tracking"
                    className="no-print"
                    titleAction={
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2">
                                <label htmlFor="clientTypeFilter" className="text-sm font-medium text-gray-700">Client Type:</label>
                                <select
                                    id="clientTypeFilter"
                                    value={clientTypeFilter}
                                    onChange={(e) => setClientTypeFilter(e.target.value)}
                                    className="p-1 border border-gray-300 rounded-md text-sm bg-white focus:ring-[#404E3B] focus:border-[#404E3B]"
                                >
                                    <option value="All">All Types</option>
                                    <option value="General Population">General Population</option>
                                    <option value="CHYBA">CHYBA</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="timeTrackingMonthFilter" className="text-sm font-medium text-gray-700">Month:</label>
                                <select
                                    id="timeTrackingMonthFilter"
                                    value={timeTrackingMonthFilter}
                                    onChange={(e) => setTimeTrackingMonthFilter(e.target.value)}
                                    className="p-1 border border-gray-300 rounded-md text-sm bg-white focus:ring-[#404E3B] focus:border-[#404E3B]"
                                >
                                    <option value="All">All Months</option>
                                    {timeTrackingData.availableMonths.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handlePrintTimeTrackingReport}
                                className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Print Report
                            </button>
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col justify-center items-center text-center">
                            <Clock className="w-8 h-8 text-[#404E3B] mb-2" />
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Time Spent</p>
                            <p className="text-4xl font-bold text-[#404E3B] mt-2">{timeTrackingData.totalHours} <span className="text-xl font-normal text-gray-600">Hours</span></p>
                            <p className="text-sm text-gray-500 mt-1">({timeTrackingData.totalMinutes} Minutes)</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col justify-center items-center text-center">
                            <details className="w-full">
                                <summary className="cursor-pointer list-none flex flex-col items-center">
                                    <p className="text-sm text-gray-500 uppercase tracking-wide">Total Case Notes Analyzed</p>
                                    <p className="text-4xl font-bold text-gray-800 mt-2">{timeTrackingData.noteCount}</p>
                                </summary>
                            </details>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Breakdown by Staff</h3>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Minutes</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Note Count</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {timeTrackingData.staffBreakdown.map((staff) => (
                                        <tr key={staff.name}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{staff.minutes}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-center">{(staff.minutes / 60).toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{staff.noteCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                {timeTrackingData.totalMinutes > 0
                                                    ? ((staff.minutes / timeTrackingData.totalMinutes) * 100).toFixed(1) + '%'
                                                    : '0%'}
                                            </td>
                                        </tr>
                                    ))}
                                    {timeTrackingData.staffBreakdown.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                                No case note data found for the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}


            {activeTab === 'narrative' && user?.role === 'admin' && (
                <Card
                    title="Narrative Report Generator"
                    className="no-print border-blue-100"
                    titleAction={<Sparkles className="h-5 w-5 text-blue-400" />}
                >
                    <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                        <p className="text-sm text-blue-800">
                            Use Google Gemini AI to generate a narrative monthly report.
                            This tool analyzes client intakes, workshops, and case notes.
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Month</label>
                        <input
                            type="month"
                            value={reportMonth}
                            onChange={(e) => setReportMonth(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 max-w-sm"
                        />
                    </div>

                    {reportError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm border border-red-200">
                            {reportError}
                        </div>
                    )}

                    <button
                        onClick={generateNarrativeReport}
                        disabled={isGenerating}
                        className={`w-full py-3 rounded-md font-medium text-white transition-all
                                ${isGenerating
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transform active:scale-[0.99]'
                            }`}
                    >
                        {isGenerating ? 'Generating Report...' : 'Generate Narrative Report'}
                    </button>

                    {generatedReport && (
                        <div className="mt-8 border-t pt-6 animation-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">Generated Report</h4>
                                <button
                                    onClick={() => navigator.clipboard.writeText(generatedReport)}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    Copy to Clipboard
                                </button>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-md border border-gray-200 prose max-w-none whitespace-pre-wrap font-serif leading-relaxed text-gray-800">
                                {generatedReport}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* AI Insights Tab */}
            {activeTab === 'aiInsights' && user?.role === 'admin' && (
                <Card
                    title="AI Insights (Beta)"
                    className="no-print border-purple-200"
                    titleAction={<Bot className="h-5 w-5 text-purple-600" />}
                >
                    <div className="bg-purple-50 p-4 rounded-lg mb-6 border border-purple-100">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <Sparkles className="h-5 w-5 text-purple-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-purple-900 font-medium">Ask open-ended questions about your data</p>
                                <p className="text-sm text-purple-700 mt-1">
                                    The AI analyzes workshops, case notes, and client profiles from the last 12 months.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleAIQuerySubmit} className="space-y-4">
                        <div>
                            <label htmlFor="aiQuery" className="block text-sm font-medium text-gray-700">Your Question</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <input
                                    type="text"
                                    id="aiQuery"
                                    className="flex-1 min-w-0 block w-full px-4 py-3 rounded-none rounded-l-md border-gray-300 focus:ring-purple-500 focus:border-purple-500 sm:text-sm border"
                                    placeholder="e.g., How many clients attended the job preparedness workshop last week?"
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={aiLoading || !aiQuery.trim()}
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    {aiLoading ? (
                                        'Analyzing...'
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Ask AI
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {aiError && (
                        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-100 flex items-start">
                            <XCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                            <span>{aiError}</span>
                        </div>
                    )}

                    {aiAnswer && (
                        <div className="mt-8 border-t pt-6 animation-fade-in">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
                                <Bot className="h-5 w-5 mr-2 text-purple-600" />
                                AI Answer
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 prose prose-purple max-w-none whitespace-pre-wrap leading-relaxed text-gray-800 shadow-sm">
                                {aiAnswer}
                            </div>
                        </div>
                    )}
                </Card>
            )}

        </div >
    );
};

export default ReportsPage;
