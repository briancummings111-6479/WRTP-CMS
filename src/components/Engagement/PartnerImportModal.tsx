import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, Check, FileText } from 'lucide-react';
import { Organization, OrganizationType, OrganizationStatus } from '../../types';
import { communityService } from '../../services/communityService';

interface PartnerImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
}

const PartnerImportModal: React.FC<PartnerImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<Partial<Organization>[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [importStats, setImportStats] = useState<{ total: number; success: number; failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                setError('Please upload a valid CSV file.');
                return;
            }
            setFile(selectedFile);
            setError(null);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            try {
                const lines = text.split(/\r\n|\n/);
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

                const data: Partial<Organization>[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Simple CSV regex to handle quoted fields containing commas
                    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                    // Fallback to simple split if regex fails or for simple CSVs
                    // Better regex for CSV: /(?:^|,)(?=[^"]|(")?)"?((?(1)[^"]*|[^,"]*))"?(?=,|$)/g
                    // Let's use a simpler split for now and assume standard formatting, 
                    // or a basic custom splitter that respects quotes.

                    const values = parseCSVLine(line);

                    if (values.length < 2) continue; // Skip empty/invalid lines

                    const org: any = {
                        jobOpeningsCount: 0,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };

                    headers.forEach((header, index) => {
                        let value = values[index]?.trim() || '';
                        // Remove surrounding quotes
                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.slice(1, -1);
                        }
                        // Unescape double quotes
                        value = value.replace(/""/g, '"');

                        if (header.includes('name')) org.name = value;
                        else if (header.includes('type')) org.type = mapOrgType(value);
                        else if (header.includes('status')) org.status = mapOrgStatus(value);
                        else if (header.includes('industry')) org.industry = value;
                        else if (header.includes('website')) org.website = value;
                        else if (header.includes('work phone')) org.phone = value;
                        else if (header.includes('cell phone')) org.cellPhone = value;
                        else if (header.includes('phone')) org.phone = value; // Fallback for generic "Phone"
                        else if (header.includes('email')) org.email = value;
                        else if (header.includes('contact')) org.contactPerson = value;
                        else if (header.includes('address')) org.address = value;
                        else if (header.includes('notes')) org.notes = value;
                    });

                    // Defaults
                    if (!org.name) continue;
                    if (!org.type) org.type = 'Other';
                    if (!org.status) org.status = 'Prospect';

                    data.push(org);
                }
                setPreviewData(data);
            } catch (err) {
                console.error(err);
                setError('Failed to parse CSV file.');
            }
        };
        reader.readAsText(file);
    };

    // Helper to parse a single CSV line handling quotes
    const parseCSVLine = (text: string): string[] => {
        const result: string[] = [];
        let curValue = '';
        let inQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuote) {
                if (char === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        curValue += '"'; // unescape "" to "
                        i++;
                    } else {
                        inQuote = false;
                    }
                } else {
                    curValue += char;
                }
            } else {
                if (char === '"') {
                    inQuote = true;
                } else if (char === ',') {
                    result.push(curValue);
                    curValue = '';
                } else {
                    curValue += char;
                }
            }
        }
        result.push(curValue);
        return result;
    };

    const mapOrgType = (val: string): OrganizationType => {
        const v = val.toLowerCase();
        if (v.includes('employer')) return 'Employer';
        if (v.includes('social') || v.includes('service')) return 'Social Service Agency';
        if (v.includes('training')) return 'Training Partner';
        return 'Other';
    };

    const mapOrgStatus = (val: string): OrganizationStatus => {
        const v = val.toLowerCase();
        if (v.includes('active')) return 'Active Partner';
        if (v.includes('mou')) return 'MOU Signed';
        if (v.includes('inactive')) return 'Inactive';
        return 'Prospect';
    };

    const handleImport = async () => {
        setLoading(true);
        let successCount = 0;
        let failedCount = 0;

        for (const orgData of previewData) {
            try {
                await communityService.addOrganization(orgData as any);
                successCount++;
            } catch (err) {
                console.error("Import failed for", orgData.name, err);
                failedCount++;
            }
        }

        setLoading(false);
        setImportStats({ total: previewData.length, success: successCount, failed: failedCount });

        // Brief delay to show stats then close
        setTimeout(() => {
            onImportComplete();
            handleClose();
        }, 2000);
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData([]);
        setError(null);
        setImportStats(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                <Upload className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Import Partners via CSV</h3>
                                <div className="mt-2 text-sm text-gray-500">
                                    <p className="mb-4">Upload a CSV file containing organization details. The first row should contain headers (Name, Type, Industry, Website, Contact Person, etc.).</p>

                                    {!file && !importStats ? (
                                        <div
                                            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 cursor-pointer transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                            <span className="mt-2 block text-sm font-medium text-gray-900">
                                                Click to upload or drag and drop
                                            </span>
                                            <span className="mt-1 block text-xs text-gray-500">
                                                CSV files only
                                            </span>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".csv"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                    ) : importStats ? (
                                        <div className="rounded-md bg-green-50 p-4">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <Check className="h-5 w-5 text-green-400" aria-hidden="true" />
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-green-800">Import Complete</h3>
                                                    <div className="mt-2 text-sm text-green-700">
                                                        <p>Successfully imported {importStats.success} partners. {importStats.failed > 0 && `Failed: ${importStats.failed}`}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded">
                                                <span className="font-medium text-gray-700">{file.name}</span>
                                                <button onClick={() => { setFile(null); setPreviewData([]); }} className="text-gray-400 hover:text-red-500">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>

                                            {error && (
                                                <div className="rounded-md bg-red-50 p-4 mb-4">
                                                    <div className="flex">
                                                        <div className="flex-shrink-0">
                                                            <AlertCircle className="h-5 w-5 text-red-400" />
                                                        </div>
                                                        <div className="ml-3">
                                                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                                                            <div className="text-sm text-red-700">{error}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="max-h-64 overflow-y-auto border rounded-md">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {previewData.map((org, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{org.name}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{org.type}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{org.contactPerson}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{org.status}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-right">Showing {previewData.length} entries to be imported.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        {!importStats && (
                            <button
                                type="button"
                                disabled={!file || loading || previewData.length === 0}
                                onClick={handleImport}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Importing...' : 'Import Partners'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            {importStats ? 'Close' : 'Cancel'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerImportModal;
