import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/mockApi';
import { Client, Workshop } from '../types';
import Card from '../components/Card';
import { Printer } from 'lucide-react';

const WorkshopStatusBadge: React.FC<{ status: Workshop['status'] }> = ({ status }) => {
    const statusStyles: { [key in Workshop['status']]: string } = {
        Scheduled: 'bg-blue-100 text-blue-800',
        Completed: 'bg-green-100 text-green-800',
        Declined: 'bg-yellow-100 text-yellow-800',
        'No Show': 'bg-red-100 text-red-800',
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
    const [loading, setLoading] = useState(true);
    const [workshopFilter, setWorkshopFilter] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [clientsData, workshopsData] = await Promise.all([
                    api.getClients(),
                    api.getAllWorkshops()
                ]);
                setClients(clientsData);
                setWorkshops(workshopsData);
            } catch (error) {
                console.error("Failed to fetch report data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const reportData = useMemo(() => {
        const totalIndividuals = clients.length;
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

        const prospects = clients.filter(c => c.metadata.status === 'Prospect');
        const enrolledClients = clients.filter(c => c.metadata.status !== 'Prospect');
        
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

    }, [clients]);

    const workshopReportData = useMemo(() => {
        if (clients.length === 0 || workshops.length === 0) return { groupedWorkshops: {}, workshopNames: [] };

        const clientMap = new Map(clients.map(c => [c.id, `${c.profile.firstName} ${c.profile.lastName}`]));

        const grouped = workshops.reduce((acc, workshop) => {
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
    }, [clients, workshops]);

    const generateWorkshopReportHTML = () => {
        const getStatusBadgeHTML = (status: Workshop['status']) => {
            const statusStyles: { [key in Workshop['status']]: string } = {
                Scheduled: 'bg-blue-100 text-blue-800',
                Completed: 'bg-green-100 text-green-800',
                Declined: 'bg-yellow-100 text-yellow-800',
                'No Show': 'bg-red-100 text-red-800',
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
            }).join('<div class="h-8"></div>'); // Add some space between tables

        const noDataMessage = workshopReportData.workshopNames.length === 0 
            ? '<p class="text-center text-gray-500 py-10">No workshop data available to generate a report.</p>' 
            : '';
            
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
            <h1 className="text-3xl font-bold text-gray-800 no-print">Reports</h1>
            <Card title="Client Population Report" className="no-print">
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
                title="Workshop Attendance Report"
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
