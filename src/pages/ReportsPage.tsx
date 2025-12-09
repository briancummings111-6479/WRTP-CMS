import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/firebase';
import { Client, Workshop, CaseNote } from '../types';
import Card from '../components/Card';
import { Printer } from 'lucide-react';

const WorkshopStatusBadge: React.FC<{ status: Workshop['status'] }> = ({ status }) => {
    const statusStyles: { [key in Workshop['status']]: string } = {
        Scheduled: 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-purple-100 text-purple-800',
        Completed: 'bg-green-100 text-green-800',
        Declined: 'bg-yellow-100 text-yellow-800',
        'No Show': 'bg-red-100 text-red-800',
        'On Hold': 'bg-gray-100 text-gray-800',
    };
    return (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
            {status}
        </span>
    );
};

const ReportsPage: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
    const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [workshopFilter, setWorkshopFilter] = useState('All');
    const [selectedCaseManager, setSelectedCaseManager] = useState('All');
    const [matrixStatusFilter, setMatrixStatusFilter] = useState<string>('All');
    const [encountersMonthFilter, setEncountersMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));

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

                // Filter users to only those who are likely case managers (admin or viewer, or just all staff)
                const staffUsers = usersData
                    .filter(u => u.role === 'admin' || u.role === 'viewer')
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
        const filteredClientIds = new Set(filteredClients.map(c => c.id));

        const selectedYear = encountersMonthFilter ? parseInt(encountersMonthFilter.split('-')[0]) : null;
        const selectedMonth = encountersMonthFilter ? parseInt(encountersMonthFilter.split('-')[1]) - 1 : null;

        const filterByMonth = (timestamp: number) => {
            if (!encountersMonthFilter) return true;
            const d = new Date(timestamp);
            return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
        };

        const relevantCaseNotes = caseNotes.filter(n =>
            filteredClientIds.has(n.clientId) && filterByMonth(n.noteDate)
        );

        const relevantWorkshops = workshops.filter(w =>
            filteredClientIds.has(w.clientId) && filterByMonth(w.workshopDate)
        );

        const caseNotesCount = relevantCaseNotes.filter(n => n.noteType === 'Case Note').length;
        const contactNotesCount = relevantCaseNotes.filter(n => n.noteType === 'Contact Note').length;
        const workshopsCount = relevantWorkshops.filter(w => w.status === 'Completed' || w.status === 'In Progress').length;

        return {
            totalEncounters: caseNotesCount + contactNotesCount + workshopsCount,
            caseNotesCount,
            contactNotesCount,
            workshopsCount
        };
    }, [filteredClients, caseNotes, workshops, encountersMonthFilter]);

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
        const allWorkshopNames = Array.from(new Set(workshops.map(w =>
            (w.workshopName === 'Other' && w.workshopNameOther ? w.workshopNameOther : w.workshopName) as string
        ))).sort((a, b) => {
            const predefinedOrder = [
                'Career Explorations',
                'Job Preparedness',
                'Interview Success',
                'Financial Literacy',
                'Entrepreneurship'
            ];

            const indexA = predefinedOrder.indexOf(a);
            const indexB = predefinedOrder.indexOf(b);

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
            return a.localeCompare(b);
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

    const generateClientReportHTML = () => {
        const caseManagerName = selectedCaseManager === 'All'
            ? 'All Case Managers'
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
                        <p>Case Manager: <span class="font-semibold text-gray-800">${caseManagerName}</span></p>
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

    const generateWorkshopReportHTML = () => {
        const getStatusBadgeHTML = (status: Workshop['status']) => {
            const statusStyles: { [key in Workshop['status']]: string } = {
                Scheduled: 'bg-blue-100 text-blue-800',
                'In Progress': 'bg-purple-100 text-purple-800',
                Completed: 'bg-green-100 text-green-800',
                Declined: 'bg-yellow-100 text-yellow-800',
                'No Show': 'bg-red-100 text-red-800',
                'On Hold': 'bg-gray-100 text-gray-800',
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
            ? 'All Case Managers'
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
                    <p class="text-gray-600">Case Manager: ${caseManagerName}</p>
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

    if (loading) {
        return <div>Loading report data...</div>;
    }

    const StatListItem: React.FC<{ label: string, value: number, percentage: number }> = ({ label, value, percentage }) => (
        <li className="flex justify-between items-baseline">
            <span className="text-gray-700">{label}:</span>
            <span className="font-semibold text-gray-800">{value} <span className="text-sm font-normal text-gray-500">({percentage.toFixed(1)}%)</span></span>
        </li>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
                <div className="flex items-center space-x-2">
                    <label htmlFor="caseManagerFilter" className="text-sm font-medium text-gray-700">Case Manager:</label>
                    <select
                        id="caseManagerFilter"
                        value={selectedCaseManager}
                        onChange={(e) => setSelectedCaseManager(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm rounded-md"
                    >
                        <option value="All">All Case Managers</option>
                        {admins.map(admin => (
                            <option key={admin.id} value={admin.id}>{admin.name}</option>
                        ))}
                    </select>
                </div>
            </div>

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
                {/* Section 1: Overall Breakdown */}
                <div className="border-b border-gray-200 pb-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Overall Breakdown</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                        <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Prospects</p>
                            <p className="text-3xl font-bold text-gray-800">{reportData.prospectsCount} <span className="text-lg font-normal text-gray-600">({reportData.prospectsPercentage.toFixed(1)}%)</span></p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Enrolled Clients</p>
                            <p className="text-3xl font-bold text-gray-800">{reportData.enrolledClientsCount} <span className="text-lg font-normal text-gray-600">({reportData.enrolledClientsPercentage.toFixed(1)}%)</span></p>
                        </div>
                        <div>
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

            <Card
                title="Encounters Report"
                className="no-print"
                titleAction={
                    <div className="flex items-center space-x-2">
                        <label htmlFor="encountersMonthFilter" className="text-sm font-medium text-gray-700">Month:</label>
                        <input
                            type="month"
                            id="encountersMonthFilter"
                            value={encountersMonthFilter}
                            onChange={(e) => setEncountersMonthFilter(e.target.value)}
                            className="p-1 border border-gray-300 rounded-md text-sm bg-white focus:ring-[#404E3B] focus:border-[#404E3B]"
                        />
                    </div>
                }
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Total Encounters</p>
                        <p className="text-3xl font-bold text-gray-800">{encountersReportData.totalEncounters}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Case Notes</p>
                        <p className="text-3xl font-bold text-gray-800">{encountersReportData.caseNotesCount}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Contact Notes</p>
                        <p className="text-3xl font-bold text-gray-800">{encountersReportData.contactNotesCount}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Workshops</p>
                        <p className="text-3xl font-bold text-gray-800">{encountersReportData.workshopsCount}</p>
                    </div>
                </div>
            </Card>

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
        </div>
    );
};

export default ReportsPage;
