import React, { useState } from 'react';
import Card from '../components/Card';
import { UploadCloud, Download, AlertCircle, CheckCircle, XCircle, RefreshCw, ArrowRight, Save, Database } from 'lucide-react';
import api from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Client, AuditChecklist } from '../types';
import { STAFF_ROLES } from '../config/staff';

type ParsedRow = {
    data: { [key: string]: string };
    original: string;
    errors: string[];
};

type ImportLogEntry = {
    status: 'success' | 'error';
    message: string;
};

// Config for mappable fields
const SYSTEM_FIELDS = [
    { key: 'participantId', label: 'Participant ID', required: false },
    { key: 'profile.firstName', label: 'First Name', required: true },
    { key: 'profile.middleInitial', label: 'Middle Initial', required: false },
    { key: 'profile.lastName', label: 'Last Name', required: true },
    { key: 'profile.dob', label: 'Date of Birth (DOB)', required: false },
    { key: 'contactInfo.email', label: 'Email', required: false },
    { key: 'contactInfo.phone', label: 'Phone', required: false },
    { key: 'contactInfo.street', label: 'Street Address', required: false },
    { key: 'contactInfo.city', label: 'City', required: false },
    { key: 'contactInfo.zip', label: 'Zip Code', required: false },
    // Add common fields as needed
];

// --- NEW Initial data for Audit Checklist ---
const initialAuditChecklist: AuditChecklist = [
    { id: "1.1", label: "1.1 WRTP Contact Form", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.2", label: "1.2 Completed WRTP Application", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.3", label: "1.3 Proof of Identity (e.g., ID, DL)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.5", label: "1.5 Income Verification", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.6", label: "1.6 WRTP Assessment", present: false, complete: false, uploaded: false, notes: "" },
    { id: "1.9", label: "1.9 Authorization of Release", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.1", label: "2.1 Initial ISP Completed & Signed", present: false, complete: false, uploaded: false, notes: "" },
    { id: "2.2", label: "2.2 Updated ISP (if applicable)", present: false, complete: false, uploaded: false, notes: "" },
    { id: "referrals", label: "Referrals & Services Provided", present: false, complete: false, uploaded: false, notes: "" },
];

const DataImportPage: React.FC = () => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');

    // Raw CSV Data
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<string[][]>([]);

    // Mapping State: { systemFieldParams: csvHeaderName }
    const [variableMapping, setVariableMapping] = useState<{ [key: string]: string }>({});

    // Processed Data
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
    // State for Admin Tools compatibility
    const [isParsing, setIsParsing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setParsedData([]);
            setImportLog([]);
            parseRawCSV(selectedFile);
        } else {
            alert("Please select a valid .csv file.");
            setFile(null);
        }
    };

    const parseRawCSV = (fileToParse: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target?.result as string;
            const lines = csvText.trim().split(/\r?\n/);
            if (lines.length < 2) {
                alert("CSV file must have a header row and at least one data row.");
                return;
            }

            // Helper to parse line handling quotes
            const parseCSVLine = (line: string) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
            const rows = lines.slice(1).map(line => parseCSVLine(line).map(val => val.replace(/^"|"$/g, '').trim()));

            setCsvHeaders(headers);
            setRawRows(rows);

            // Auto-guess mapping
            const newMapping: { [key: string]: string } = {};
            SYSTEM_FIELDS.forEach(field => {
                // Try exact match or case-insensitive match
                const match = headers.find(h =>
                    h === field.key ||
                    h.toLowerCase() === field.label.toLowerCase() ||
                    h.toLowerCase() === field.key.split('.').pop()?.toLowerCase() ||
                    (field.key === 'profile.firstName' && h.toLowerCase().includes('first name')) ||
                    (field.key === 'profile.lastName' && h.toLowerCase().includes('last name')) ||
                    (field.key === 'profile.middleInitial' && (h.toLowerCase().includes('middle') || h.toLowerCase() === 'mi')) ||
                    (field.key === 'profile.dob' && h.toLowerCase().includes('dob')) ||
                    (field.key === 'participantId' && h.toLowerCase().includes('participant'))
                );
                if (match) {
                    newMapping[field.key] = match;
                }
            });
            setVariableMapping(newMapping);
            setStep('mapping');
        };
        reader.readAsText(fileToParse);
    };

    const handleMappingConfirm = () => {
        // Validation: Check required fields
        const missingRequired = SYSTEM_FIELDS.filter(f => f.required && !variableMapping[f.key]);
        if (missingRequired.length > 0) {
            alert(`Please map the following required fields: ${missingRequired.map(f => f.label).join(', ')}`);
            return;
        }

        const processedRows: ParsedRow[] = rawRows.map(rowValues => {
            const rowData: { [key: string]: string } = {};

            // Map system fields using the mapping configuration
            Object.entries(variableMapping).forEach(([systemKey, csvHeader]) => {
                const headerIndex = csvHeaders.indexOf(csvHeader);
                if (headerIndex !== -1) {
                    rowData[systemKey] = rowValues[headerIndex] || '';
                }
            });

            // Basic Validation
            const errors: string[] = [];
            if (!rowData['profile.firstName']) errors.push("Missing First Name");
            if (!rowData['profile.lastName']) errors.push("Missing Last Name");
            if (rowData['profile.dob'] && isNaN(Date.parse(rowData['profile.dob']))) {
                errors.push("Invalid DOB");
            }

            return {
                data: rowData,
                original: rowValues.join(','),
                errors
            };
        });

        setParsedData(processedRows);
        setStep('preview');
    };

    const handleDownloadTemplate = () => {
        const headers = SYSTEM_FIELDS.map(f => f.label);
        const csvContent = headers.join(',');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "wrtp_client_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async () => {
        if (!user) return;
        const validRows = parsedData.filter(row => row.errors.length === 0);
        if (validRows.length === 0) {
            alert("No valid rows to import.");
            return;
        }

        setStep('importing');
        setImportLog([]);

        for (const row of validRows) {
            try {
                const formatDate = (dateStr: string) => {
                    if (!dateStr) return '';
                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) return '';
                    return date.toISOString().split('T')[0];
                };

                const participantId = row.data['participantId'];
                let existingClient: Client | undefined;

                if (participantId) {
                    existingClient = await api.getClientByParticipantId(participantId);
                }

                if (!existingClient) {
                    existingClient = await api.getClientByName(row.data['profile.firstName'], row.data['profile.lastName']);
                }

                // Construct Client Object
                const clientData: Partial<Client> = {
                    participantId: participantId || '',
                    profile: {
                        firstName: row.data['profile.firstName'],
                        lastName: row.data['profile.lastName'],
                        middleInitial: row.data['profile.middleInitial'] || '',
                        dob: formatDate(row.data['profile.dob']),
                        age: 0, // Should be calculated or allowed to be null/0
                        gender: '', // Not in default map but can be added if mapped
                    },
                    contactInfo: {
                        phone: row.data['contactInfo.phone'] || '',
                        email: row.data['contactInfo.email'] || '',
                        street: row.data['contactInfo.street'] || '',
                        city: row.data['contactInfo.city'] || '',
                        zip: row.data['contactInfo.zip'] || '',
                        state: 'CA', // Default
                        phone2: '',
                        apt: ''
                    },
                    metadata: {
                        assignedAdminId: existingClient?.metadata.assignedAdminId || '',
                        assignedAdminName: existingClient?.metadata.assignedAdminName || 'Unassigned',
                        clientType: existingClient?.metadata.clientType || 'General Population',
                        status: existingClient?.metadata.status || 'Prospect',
                        createdBy: existingClient?.metadata.createdBy || user.uid,
                        lastModifiedBy: user.uid,
                        dateCreated: existingClient?.metadata.dateCreated || Date.now(),
                        lastModified: Date.now(),
                    },
                    auditChecklist: existingClient ? existingClient.auditChecklist : initialAuditChecklist,
                    training: existingClient?.training || {
                        cpr: false, firstAid: false, foodHandlersCard: false, osha10: false, nccer: false,
                        constructionCTE: false, cosmetologyCTE: false, culinaryCTE: false, fireCTE: false,
                        medicalCTE: false, earlyChildhoodEducationCTE: false, entrepreneurshipCTE: false
                    },
                    // Preserve existing complex objects if simple import
                    demographics: existingClient?.demographics,
                    referralSource: existingClient?.referralSource || 'Imported'
                };

                if (existingClient) {
                    // Merge updates carefully
                    const updatedClient: Client = {
                        ...existingClient,
                        ...clientData,
                        id: existingClient.id,
                        profile: { ...existingClient.profile, ...clientData.profile }, // Merge profile
                        contactInfo: { ...existingClient.contactInfo, ...clientData.contactInfo }, // Merge contact
                        metadata: { ...existingClient.metadata, ...clientData.metadata }
                    };
                    await api.updateClient(updatedClient);
                    setImportLog(prev => [...prev, { status: 'success', message: `Updated: ${row.data['profile.firstName']} ${row.data['profile.lastName']}` }]);
                } else {
                    await api.addClient(clientData as any, user.uid);
                    setImportLog(prev => [...prev, { status: 'success', message: `Created: ${row.data['profile.firstName']} ${row.data['profile.lastName']}` }]);
                }

            } catch (error) {
                setImportLog(prev => [...prev, { status: 'error', message: `Failed: ${row.data['profile.firstName']} ${row.data['profile.lastName']} - ${error}` }]);
            }
        }
        setStep('preview'); // finished
    };

    const validRowCount = parsedData.filter(r => r.errors.length === 0).length;

    return (
        <div className="space-y-6" >
            <h1 className="text-3xl font-bold text-gray-800">Client Data Import</h1>

            {/* Step 1: Upload */}
            <Card title="Step 1: Upload CSV">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <p className="text-gray-600 mb-4">Upload your participant list. You will be able to map columns in the next step.</p>
                        <button onClick={handleDownloadTemplate} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <Download className="h-4 w-4 mr-2" /> Download Template
                        </button>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <label className="mt-2 block text-sm font-medium text-[#404E3B] cursor-pointer">
                            {file ? file.name : "Click to upload .csv"}
                            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>
                </div>
            </Card>

            {/* Step 2: Mapping */}
            {step === 'mapping' && (
                <Card title="Step 2: Map Columns">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">Map the columns from your CSV to the system fields. Required fields are marked with *.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {SYSTEM_FIELDS.map(field => (
                                <div key={field.key} className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-1">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        className="form-input"
                                        value={variableMapping[field.key] || ''}
                                        onChange={(e) => setVariableMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    >
                                        <option value="">-- Ignore --</option>
                                        {csvHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end pt-4">
                            <button onClick={handleMappingConfirm} className="inline-flex items-center px-4 py-2 bg-[#404E3B] text-white rounded-md hover:bg-[#5a6c53]">
                                Next: Preview <ArrowRight className="h-4 w-4 ml-2" />
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 3: Preview */}
            {(step === 'preview' || step === 'importing') && (
                <Card title="Step 3: Preview & Import">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded text-sm">
                            <div className="flex space-x-4">
                                <span className="text-gray-700">Total: <b>{parsedData.length}</b></span>
                                <span className="text-green-600">Valid: <b>{validRowCount}</b></span>
                                <span className="text-red-600">Errors: <b>{parsedData.length - validRowCount}</b></span>
                            </div>
                            {step !== 'importing' && (
                                <button onClick={handleImport} disabled={validRowCount === 0} className="inline-flex items-center px-4 py-2 bg-[#404E3B] text-white rounded-md hover:bg-[#5a6c53] disabled:opacity-50">
                                    <Save className="h-4 w-4 mr-2" /> Start Import
                                </button>
                            )}
                        </div>

                        {importLog.length > 0 && (
                            <div className="max-h-40 overflow-y-auto bg-gray-100 p-2 rounded text-xs">
                                {importLog.map((log, i) => (
                                    <div key={i} className={log.status === 'success' ? 'text-green-700' : 'text-red-700'}>
                                        {log.message}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="overflow-x-auto max-h-96 border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                                        <th className="px-4 py-2 text-left font-semibold">Participant ID</th>
                                        <th className="px-4 py-2 text-left font-semibold">First Name</th>
                                        <th className="px-4 py-2 text-left font-semibold">Middle</th>
                                        <th className="px-4 py-2 text-left font-semibold">Last Name</th>
                                        <th className="px-4 py-2 text-left font-semibold">DOB</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {parsedData.slice(0, 50).map((row, index) => (
                                        <tr key={index} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                                            <td className="px-4 py-2">
                                                {row.errors.length > 0 ? <AlertCircle className="h-5 w-5 text-red-500" title={row.errors.join(', ')} /> : <CheckCircle className="h-5 w-5 text-green-500" />}
                                            </td>
                                            <td className="px-4 py-2">{row.data['participantId']}</td>
                                            <td className="px-4 py-2">{row.data['profile.firstName']}</td>
                                            <td className="px-4 py-2">{row.data['profile.middleInitial']}</td>
                                            <td className="px-4 py-2">{row.data['profile.lastName']}</td>
                                            <td className="px-4 py-2">{row.data['profile.dob']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}

            {
                importLog.length > 0 && (
                    <Card title="Import Results">
                        <div className="max-h-60 overflow-y-auto space-y-2 text-sm">
                            {importLog.map((entry, index) => (
                                <div key={index} className={`flex items-center p-2 rounded-md ${entry.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {entry.status === 'success' ? <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" /> : <XCircle className="h-5 w-5 mr-3 flex-shrink-0" />}
                                    <span>{entry.message}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )
            }



            <Card title="Administrative Tools">
                <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Data Synchronization</h4>
                        <p className="text-sm text-gray-500">
                            Sync "Most Recent Case Note" dates for all clients. Run this once to populate historical data.
                        </p>
                        <div>
                            <button
                                onClick={async () => {
                                    if (confirm("This will scan all clients and recount their most recent case note date. Continue?")) {
                                        setIsParsing(true);
                                        try {
                                            const count = await api.syncAllClientsLastCaseNoteDate();
                                            alert(`Successfully synced ${count} clients.`);
                                        } catch (error) {
                                            alert("Sync failed: " + error);
                                        } finally {
                                            setIsParsing(false);
                                        }
                                    }
                                }}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sync Case Note Dates
                            </button>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Backup & Export</h4>
                        <p className="text-sm text-gray-500 mb-3">
                            Download a full JSON backup of all database content (Clients, Notes, Tasks, etc.).
                        </p>
                        <button
                            onClick={async () => {
                                setIsParsing(true);
                                try {
                                    const backupData = await api.createBackup();
                                    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `wrtp_backup_${new Date().toISOString().split('T')[0]}.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    alert("Backup downloaded successfully.");
                                } catch (error) {
                                    console.error(error);
                                    alert("Backup failed: " + error);
                                } finally {
                                    setIsParsing(false);
                                }
                            }}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download Full Backup
                        </button>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Data Cleanup</h4>
                        <p className="text-sm text-gray-500 mb-3">
                            Identify and remove duplicate client records (same First + Last Name). Keeps the oldest record.
                        </p>
                        <button
                            onClick={async () => {
                                setIsParsing(true);
                                try {
                                    const clients = await api.getClients();
                                    const groups: { [key: string]: Client[] } = {};
                                    clients.forEach(c => {
                                        const key = `${c.profile.firstName.trim().toLowerCase()}|${c.profile.lastName.trim().toLowerCase()}`;
                                        if (!groups[key]) groups[key] = [];
                                        groups[key].push(c);
                                    });

                                    let duplicateCount = 0;
                                    const duplicatesToDelete: Client[] = [];

                                    Object.values(groups).forEach(group => {
                                        if (group.length > 1) {
                                            // Sort by dateCreated ascending (oldest first)
                                            // If dateCreated is missing, assume 0
                                            group.sort((a, b) => (a.metadata.dateCreated || 0) - (b.metadata.dateCreated || 0));

                                            // Keep the first one (oldest), mark others for deletion
                                            const toDelete = group.slice(1);
                                            duplicatesToDelete.push(...toDelete);
                                            duplicateCount += toDelete.length;
                                        }
                                    });

                                    if (duplicateCount > 0) {
                                        if (confirm(`Found ${duplicateCount} duplicate records. Do you want to delete them? This action cannot be undone.`)) {
                                            let deleted = 0;
                                            for (const client of duplicatesToDelete) {
                                                await api.deleteClient(client.id);
                                                deleted++;
                                            }
                                            alert(`Successfully deleted ${deleted} duplicate records.`);
                                        }
                                    } else {
                                        alert("No duplicates found.");
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert("Error scanning for duplicates: " + e);
                                } finally {
                                    setIsParsing(false);
                                }
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Scan & Remove Duplicates
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default DataImportPage;
