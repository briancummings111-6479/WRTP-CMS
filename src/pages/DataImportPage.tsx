import React, { useState, useCallback, useMemo } from 'react';
import Card from '../components/Card';
import { UploadCloud, FileText, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/mockApi';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';

type ParsedRow = {
    data: { [key: string]: string };
    original: string;
    errors: string[];
};

type ImportLogEntry = {
    status: 'success' | 'error';
    message: string;
};

const CSV_HEADERS = [
    'firstName', 'lastName', 'dob', 'phone', 'phone2', 'email', 'street', 'apt', 'city', 'state', 'zip',
    'referralSource', 'googleDriveLink', 'clientStatus', 'clientType', 'assignedCaseManager',
    'applicationPacket', 'id', 'proofOfIncome', 'initialAssessment', 'roi', 'ispCompleted',
    'cpr', 'firstAid', 'foodHandlersCard', 'constructionCTE', 'cosmetologyCTE', 'culinaryCTE', 'fireCTE', 'medicalCTE'
];

const DataImportPage: React.FC = () => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);

    React.useEffect(() => {
        api.getAdmins().then(setAdmins);
    }, []);

    const adminNameMap = useMemo(() => {
        return new Map(admins.map(admin => [admin.name.toLowerCase(), admin.id]));
    }, [admins]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setParsedData([]);
            setImportLog([]);
            parseAndValidateFile(selectedFile);
        } else {
            alert("Please select a valid .csv file.");
            setFile(null);
        }
    };
    
    const parseAndValidateFile = (fileToParse: File) => {
        setIsParsing(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target?.result as string;
            const lines = csvText.trim().split(/\r?\n/);
            if (lines.length < 2) {
                alert("CSV file must have a header row and at least one data row.");
                setIsParsing(false);
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const missingHeaders = CSV_HEADERS.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                 alert(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
                 setIsParsing(false);
                 return;
            }

            const rows = lines.slice(1).map((line, index) => {
                const values = line.split(',');
                const rowData: { [key: string]: string } = headers.reduce((obj, header, i) => {
                    obj[header] = values[i] ? values[i].trim() : '';
                    return obj;
                }, {} as { [key: string]: string });
                
                const errors: string[] = [];
                if (!rowData.firstName || !rowData.lastName) errors.push("Missing first or last name.");
                if (rowData.dob && !/^\d{4}-\d{2}-\d{2}$/.test(rowData.dob)) errors.push("Invalid DOB format (use YYYY-MM-DD).");
                if (!rowData.email) errors.push("Missing email.");
                if (!adminNameMap.has(rowData.assignedCaseManager?.toLowerCase())) errors.push(`Case Manager "${rowData.assignedCaseManager}" not found.`);

                return { data: rowData, original: line, errors };
            });
            setParsedData(rows);
            setIsParsing(false);
        };
        reader.readAsText(fileToParse);
    };

    const handleDownloadTemplate = () => {
        const csvContent = CSV_HEADERS.join(',');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "client_import_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async () => {
        if (!user) return;
        const validRows = parsedData.filter(row => row.errors.length === 0);
        if (validRows.length === 0) {
            alert("No valid rows to import. Please fix the errors shown in the preview.");
            return;
        }

        setIsImporting(true);
        setImportLog([]);

        for (const [index, row] of validRows.entries()) {
            try {
                const assignedAdmin = admins.find(a => a.name.toLowerCase() === row.data.assignedCaseManager?.toLowerCase());
                
                const toBool = (val: string) => val.toLowerCase() === 'true' || val === '1';

                const clientData = {
                    profile: {
                        firstName: row.data.firstName,
                        lastName: row.data.lastName,
                        dob: row.data.dob,
                    },
                    contactInfo: {
                        phone: row.data.phone,
                        phone2: row.data.phone2,
                        email: row.data.email,
                        street: row.data.street,
                        apt: row.data.apt,
                        city: row.data.city,
                        state: row.data.state,
                        zip: row.data.zip,
                    },
                    referralSource: row.data.referralSource,
                    googleDriveLink: row.data.googleDriveLink,
                    caseManagement: {
                        applicationPacket: toBool(row.data.applicationPacket),
                        id: toBool(row.data.id),
                        proofOfIncome: toBool(row.data.proofOfIncome),
                        initialAssessment: toBool(row.data.initialAssessment),
                        roi: toBool(row.data.roi),
                        ispCompleted: toBool(row.data.ispCompleted),
                    },
                    training: {
                        cpr: toBool(row.data.cpr),
                        firstAid: toBool(row.data.firstAid),
                        foodHandlersCard: toBool(row.data.foodHandlersCard),
                        constructionCTE: toBool(row.data.constructionCTE),
                        cosmetologyCTE: toBool(row.data.cosmetologyCTE),
                        culinaryCTE: toBool(row.data.culinaryCTE),
                        fireCTE: toBool(row.data.fireCTE),
                        medicalCTE: toBool(row.data.medicalCTE),
                    },
                    metadata: {
                        assignedAdminId: assignedAdmin!.id,
                        assignedAdminName: assignedAdmin!.name,
                        clientType: row.data.clientType as Client['metadata']['clientType'] || 'General Population',
                        status: row.data.clientStatus as Client['metadata']['status'] || 'Prospect',
                    }
                };
                
                await api.addClient(clientData as any, user.uid);
                setImportLog(prev => [...prev, { status: 'success', message: `Successfully imported ${row.data.firstName} ${row.data.lastName}.` }]);
            } catch (error) {
                 setImportLog(prev => [...prev, { status: 'error', message: `Failed to import ${row.data.firstName} ${row.data.lastName}: ${error}` }]);
            }
        }

        setIsImporting(false);
    };

    const validRowCount = parsedData.filter(r => r.errors.length === 0).length;
    const errorRowCount = parsedData.length - validRowCount;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Client Data Import</h1>
            <Card title="Step 1: Prepare & Upload CSV File">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <p className="text-gray-600 mb-4">
                            To import clients, please use our CSV template to ensure your data is formatted correctly. All columns in the template are required for a successful import.
                        </p>
                        <button
                            onClick={handleDownloadTemplate}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Download className="h-5 w-5 mr-2" />
                            Download CSV Template
                        </button>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                        <label htmlFor="file-upload" className="mt-2 block text-sm font-medium text-[#404E3B] hover:text-[#5a6c53] cursor-pointer">
                            {file ? `Selected: ${file.name}` : "Click to upload a CSV file"}
                        </label>
                        <input id="file-upload" name="file-upload" type="file" accept=".csv" onChange={handleFileChange} className="sr-only" />
                        <p className="mt-1 text-xs text-gray-500">Maximum file size: 5MB</p>
                    </div>
                </div>
            </Card>

            {isParsing && <p>Parsing file...</p>}

            {parsedData.length > 0 && (
                <Card title="Step 2: Preview & Validate Data">
                    <div className="mb-4 p-3 bg-gray-50 rounded-md border flex justify-around">
                        <div className="text-center"><p className="text-2xl font-bold text-gray-700">{parsedData.length}</p><p className="text-sm text-gray-500">Total Rows</p></div>
                        <div className="text-center"><p className="text-2xl font-bold text-green-600">{validRowCount}</p><p className="text-sm text-gray-500">Valid Rows</p></div>
                        <div className="text-center"><p className="text-2xl font-bold text-red-600">{errorRowCount}</p><p className="text-sm text-gray-500">Rows with Errors</p></div>
                    </div>
                    <div className="overflow-x-auto max-h-96 border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                             <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                                    {CSV_HEADERS.slice(0, 5).map(h => <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>)}
                                    <th className="px-4 py-2 text-left font-semibold">...</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {parsedData.slice(0, 10).map((row, index) => (
                                    <tr key={index} className={row.errors.length > 0 ? 'bg-red-50' : 'bg-green-50'}>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {row.errors.length > 0 
                                                ? <div className="flex items-center text-red-600" title={row.errors.join('\n')}><AlertCircle className="h-5 w-5 mr-2" /> Error</div>
                                                : <div className="flex items-center text-green-600"><CheckCircle className="h-5 w-5 mr-2" /> Valid</div>
                                            }
                                        </td>
                                        {CSV_HEADERS.slice(0, 5).map(h => <td key={h} className="px-4 py-2 whitespace-nowrap">{row.data[h]}</td>)}
                                        <td className="px-4 py-2 whitespace-nowrap">...</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {parsedData.length > 10 && <p className="text-center text-sm text-gray-500 mt-2">Showing first 10 rows of {parsedData.length}.</p>}
                </Card>
            )}

            {parsedData.length > 0 && (
                <Card title="Step 3: Start Import">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-600">Ready to import <strong>{validRowCount}</strong> valid client records. Rows with errors will be skipped.</p>
                        <button 
                            onClick={handleImport} 
                            disabled={isImporting || validRowCount === 0}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-gray-400"
                        >
                            {isImporting ? `Importing ${importLog.length}/${validRowCount}...` : `Import ${validRowCount} Clients`}
                        </button>
                    </div>
                </Card>
            )}
            
            {importLog.length > 0 && (
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
            )}
        </div>
    );
};

export default DataImportPage;
