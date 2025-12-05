import React, { useState } from 'react';
import Card from '../components/Card';
import { UploadCloud, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
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

// Updated headers to match the provided CSV (dot notation)
const CSV_HEADERS = [
    'id', 'participantId', 'googleDriveLink', 'profile.firstName', 'profile.lastName', 'profile.middleInitial', 'gender', 'profile.dob', 'profile.age',
    'contactInfo.phone', 'contactInfo.phone2', 'contactInfo.email', 'contactInfo.street', 'contactInfo.apt', 'contactInfo.city', 'contactInfo.state', 'contactInfo.zip',
    'referralSource', 'dateApplication', 'dateWithdrew',
    'training.cpr', 'training.firstAid', 'training.foodHandlersCard', 'training.osha10', 'training.nccer', 'training.otherCertificates',
    'training.constructionCTE', 'training.cosmetologyCTE', 'training.culinaryCTE', 'training.fireCTE', 'training.medicalCTE',
    'training.earlyChildhoodEducationCTE', 'training.entrepreneurshipCTE', 'training.otherCteProgram',
    'demographics.residentOfShastaCounty', 'demographics.currentlyEmployed',
    'demographics.publicAssistance.housing', 'demographics.publicAssistance.calFresh', 'demographics.publicAssistance.calWorksSSI',
    'demographics.publicAssistance.unemployment', 'demographics.publicAssistance.childcare', 'demographics.publicAssistance.tribalFunding', 'demographics.publicAssistance.other',
    'demographics.barriersToEmployment.transportation', 'demographics.barriersToEmployment.socialSecurityCard', 'demographics.barriersToEmployment.criminalRecord',
    'demographics.barriersToEmployment.housingInstability', 'demographics.barriersToEmployment.disability', 'demographics.barriersToEmployment.mentalHealthChallenges',
    'demographics.barriersToEmployment.substanceUseRecovery', 'demographics.barriersToEmployment.stateIdDriversLicense', 'demographics.barriersToEmployment.other',
    'demographics.educationLevel', 'demographics.educationOther', 'demographics.currentlyEnrolled', 'demographics.hasResume', 'demographics.jobInterests', 'demographics.interestedInTraining',
    'demographics.supportServices.resumeInterviewHelp', 'demographics.supportServices.transportation', 'demographics.supportServices.childcare',
    'demographics.supportServices.mentalHealthCounseling', 'demographics.supportServices.legalServices', 'demographics.supportServices.other',
    'demographics.householdComposition.liveAlone', 'demographics.householdComposition.expectChange',
    'metadata.dateCreated', 'metadata.createdBy', 'metadata.lastModified', 'metadata.lastModifiedBy', 'metadata.status', 'metadata.clientType',
    'metadata.assignedAdminId', 'metadata.assignedAdminName', 'metadata.lastCaseNoteDate'
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
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);

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

            // Simple CSV parser that handles quoted fields
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

            const headers = parseCSVLine(lines[0]);

            // Check for essential headers
            const requiredHeaders = ['profile.firstName', 'profile.lastName'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
                alert(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
                setIsParsing(false);
                return;
            }

            const rows = lines.slice(1).map((line, index) => {
                const values = parseCSVLine(line);
                const rowData: { [key: string]: string } = headers.reduce((obj, header, i) => {
                    obj[header] = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
                    return obj;
                }, {} as { [key: string]: string });

                const errors: string[] = [];
                if (!rowData['profile.firstName'] || !rowData['profile.lastName']) errors.push("Missing first or last name.");

                // Basic date validation if present
                if (rowData['profile.dob'] && isNaN(Date.parse(rowData['profile.dob']))) {
                    errors.push("Invalid DOB format.");
                }

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
        link.setAttribute("download", "wrtp_client_template.csv");
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
                // Helper to format date to YYYY-MM-DD
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

                // Fallback: Try to match by First Name + Last Name if not found by ID
                if (!existingClient) {
                    const firstName = row.data['profile.firstName'];
                    const lastName = row.data['profile.lastName'];
                    if (firstName && lastName) {
                        existingClient = await api.getClientByName(firstName, lastName);
                    }
                }
                // Determine Assigned Case Manager
                // Check multiple possible header names
                const assignedNameInput = row.data['Assigned Admin Name'] || row.data['Case Manager'] || row.data['metadata.assignedAdminName'] || '';

                let assignedAdminId = '';
                let assignedAdminName = 'Unassigned';

                if (assignedNameInput) {
                    // Try to find matching staff
                    const matchedStaff = STAFF_ROLES.find(s => s.name.toLowerCase() === assignedNameInput.toLowerCase());
                    if (matchedStaff) {
                        assignedAdminName = matchedStaff.name;
                        // Seed logic for UID: seeded_${staff.email.replace(/[^a-zA-Z0-9]/g, '')}
                        assignedAdminId = `seeded_${matchedStaff.email.replace(/[^a-zA-Z0-9]/g, '')}`;
                    } else {
                        assignedAdminName = assignedNameInput;
                    }
                }
                // Removed fallback to current user for new clients

                // Helper for boolean conversion
                const toBool = (val: string) => val?.toUpperCase() === 'TRUE' || val?.toUpperCase() === 'YES';

                const clientData: Partial<Client> = {
                    participantId: participantId || '',
                    googleDriveLink: row.data['googleDriveLink'] || '',
                    profile: {
                        firstName: row.data['profile.firstName'],
                        lastName: row.data['profile.lastName'],
                        middleInitial: row.data['profile.middleInitial'] || '',
                        dob: formatDate(row.data['profile.dob']),
                        age: parseInt(row.data['profile.age']) || 0,
                        gender: row.data['gender'] || '',
                    },
                    contactInfo: {
                        phone: row.data['contactInfo.phone'] || '',
                        phone2: row.data['contactInfo.phone2'] || '',
                        email: row.data['contactInfo.email'] || '',
                        street: row.data['contactInfo.street'] || '',
                        apt: row.data['contactInfo.apt'] || '',
                        city: row.data['contactInfo.city'] || '',
                        state: row.data['contactInfo.state'] || 'CA',
                        zip: row.data['contactInfo.zip'] || '',
                    },
                    referralSource: row.data['referralSource'] || 'Imported',

                    auditChecklist: existingClient ? existingClient.auditChecklist : initialAuditChecklist,

                    training: {
                        cpr: toBool(row.data['training.cpr']),
                        firstAid: toBool(row.data['training.firstAid']),
                        foodHandlersCard: toBool(row.data['training.foodHandlersCard']),
                        osha10: toBool(row.data['training.osha10']),
                        nccer: toBool(row.data['training.nccer']),
                        otherCertificates: row.data['training.otherCertificates'] || '',
                        constructionCTE: toBool(row.data['training.constructionCTE']),
                        cosmetologyCTE: toBool(row.data['training.cosmetologyCTE']),
                        culinaryCTE: toBool(row.data['training.culinaryCTE']),
                        fireCTE: toBool(row.data['training.fireCTE']),
                        medicalCTE: toBool(row.data['training.medicalCTE']),
                        earlyChildhoodEducationCTE: toBool(row.data['training.earlyChildhoodEducationCTE']),
                        entrepreneurshipCTE: toBool(row.data['training.entrepreneurshipCTE']),
                        otherCteProgram: row.data['training.otherCteProgram'] || '',
                    },

                    demographics: {
                        residentOfShastaCounty: toBool(row.data['demographics.residentOfShastaCounty']),
                        currentlyEmployed: toBool(row.data['demographics.currentlyEmployed']),
                        publicAssistance: {
                            housing: toBool(row.data['demographics.publicAssistance.housing']),
                            calFresh: toBool(row.data['demographics.publicAssistance.calFresh']),
                            calWorksSSI: toBool(row.data['demographics.publicAssistance.calWorksSSI']),
                            unemployment: toBool(row.data['demographics.publicAssistance.unemployment']),
                            childcare: toBool(row.data['demographics.publicAssistance.childcare']),
                            tribalFunding: toBool(row.data['demographics.publicAssistance.tribalFunding']),
                            other: row.data['demographics.publicAssistance.other'] || '',
                        },
                        barriersToEmployment: {
                            transportation: toBool(row.data['demographics.barriersToEmployment.transportation']),
                            socialSecurityCard: toBool(row.data['demographics.barriersToEmployment.socialSecurityCard']),
                            criminalRecord: toBool(row.data['demographics.barriersToEmployment.criminalRecord']),
                            housingInstability: toBool(row.data['demographics.barriersToEmployment.housingInstability']),
                            disability: toBool(row.data['demographics.barriersToEmployment.disability']),
                            mentalHealthChallenges: toBool(row.data['demographics.barriersToEmployment.mentalHealthChallenges']),
                            substanceUseRecovery: toBool(row.data['demographics.barriersToEmployment.substanceUseRecovery']),
                            stateIdDriversLicense: toBool(row.data['demographics.barriersToEmployment.stateIdDriversLicense']),
                            other: row.data['demographics.barriersToEmployment.other'] || '',
                        },
                        educationLevel: row.data['demographics.educationLevel'] as any || 'No High School Diploma',
                        educationOther: row.data['demographics.educationOther'] || '',
                        currentlyEnrolled: toBool(row.data['demographics.currentlyEnrolled']),
                        hasResume: toBool(row.data['demographics.hasResume']),
                        jobInterests: row.data['demographics.jobInterests'] || '',
                        interestedInTraining: toBool(row.data['demographics.interestedInTraining']),
                        supportServices: {
                            resumeInterviewHelp: toBool(row.data['demographics.supportServices.resumeInterviewHelp']),
                            transportation: toBool(row.data['demographics.supportServices.transportation']),
                            childcare: toBool(row.data['demographics.supportServices.childcare']),
                            mentalHealthCounseling: toBool(row.data['demographics.supportServices.mentalHealthCounseling']),
                            legalServices: toBool(row.data['demographics.supportServices.legalServices']),
                            other: row.data['demographics.supportServices.other'] || '',
                        },
                        householdComposition: {
                            liveAlone: toBool(row.data['demographics.householdComposition.liveAlone']),
                            members: [],
                            expectChange: toBool(row.data['demographics.householdComposition.expectChange']),
                        },
                        conflictOfInterest: {
                            hasConflict: toBool(row.data['demographics.conflictOfInterest.hasConflict']),
                            relationship: row.data['demographics.conflictOfInterest.relationship'] || '',
                        },
                        incomeCertification: {
                            applicantName: row.data['demographics.incomeCertification.applicantName'] || '',
                            householdSize: parseInt(row.data['demographics.incomeCertification.householdSize']) || 1,
                            femaleHeadOfHousehold: toBool(row.data['demographics.incomeCertification.femaleHeadOfHousehold']),
                            seniorHeadOfHousehold: toBool(row.data['demographics.incomeCertification.seniorHeadOfHousehold']),
                            singleParentFamily: toBool(row.data['demographics.incomeCertification.singleParentFamily']),
                            disabledFamilyMember: toBool(row.data['demographics.incomeCertification.disabledFamilyMember']),
                            elderlyCount: parseInt(row.data['demographics.incomeCertification.elderlyCount']) || 0,
                            studentCount: parseInt(row.data['demographics.incomeCertification.studentCount']) || 0,
                            under18Count: parseInt(row.data['demographics.incomeCertification.under18Count']) || 0,
                            gender: row.data['demographics.incomeCertification.gender'] as any || 'Choose not to disclose',
                            race: {
                                white: toBool(row.data['demographics.incomeCertification.race.white']),
                                nativeHawaiianPI: toBool(row.data['demographics.incomeCertification.race.nativeHawaiianPI']),
                                asian: toBool(row.data['demographics.incomeCertification.race.asian']),
                                americanIndianAlaskanNative: toBool(row.data['demographics.incomeCertification.race.americanIndianAlaskanNative']),
                                twoOrMoreRaces: toBool(row.data['demographics.incomeCertification.race.twoOrMoreRaces']),
                                preferNotToAnswer: toBool(row.data['demographics.incomeCertification.race.preferNotToAnswer']),
                                blackAfricanAmerican: toBool(row.data['demographics.incomeCertification.race.blackAfricanAmerican']),
                            },
                            hispanicLatino: row.data['demographics.incomeCertification.hispanicLatino'] as any || 'Prefer Not To Answer',
                            annualIncome: parseFloat(row.data['demographics.incomeCertification.annualIncome']) || 0,
                        },
                        disasterRecovery: {
                            receivedAssistance: toBool(row.data['demographics.disasterRecovery.receivedAssistance']),
                            assistanceDetails: row.data['demographics.disasterRecovery.assistanceDetails'] || '',
                            participatedSimilar: toBool(row.data['demographics.disasterRecovery.participatedSimilar']),
                            similarDetails: row.data['demographics.disasterRecovery.similarDetails'] || '',
                        },
                        // New Fields
                        femaleTrainee: toBool(row.data['demographics.femaleTrainee']),
                        fosterYouth: toBool(row.data['demographics.fosterYouth']),
                        agingOutFosterCare: toBool(row.data['demographics.agingOutFosterCare']),
                        homeless: toBool(row.data['demographics.homeless']),
                        limitedSpeakingEnglish: toBool(row.data['demographics.limitedSpeakingEnglish']),
                        veteran: toBool(row.data['demographics.veteran']),
                        releasedCorrectionalFacility: toBool(row.data['demographics.releasedCorrectionalFacility']),
                        selfCertificationAnnualIncome: parseFloat(row.data['demographics.self-certificationAnnualIncome']) || 0,
                    },

                    metadata: {
                        assignedAdminId: assignedNameInput !== '' || 'Assigned Admin Name' in row.data || 'Case Manager' in row.data || 'metadata.assignedAdminName' in row.data ? assignedAdminId : (existingClient ? existingClient.metadata.assignedAdminId : ''),
                        assignedAdminName: assignedNameInput !== '' || 'Assigned Admin Name' in row.data || 'Case Manager' in row.data || 'metadata.assignedAdminName' in row.data ? assignedAdminName : (existingClient ? existingClient.metadata.assignedAdminName : 'Unassigned'),
                        clientType: row.data['metadata.clientType'] as any || 'General Population',
                        status: row.data['metadata.status'] as any || (row.data['dateWithdrew'] ? 'Inactive' : 'Active'),
                        createdBy: existingClient ? existingClient.metadata.createdBy : user.uid,
                        lastModifiedBy: user.uid,
                        dateCreated: existingClient ? existingClient.metadata.dateCreated : Date.now(),
                        lastModified: Date.now(),
                        lastCaseNoteDate: row.data['metadata.lastCaseNoteDate'] ? new Date(row.data['metadata.lastCaseNoteDate']).getTime() : undefined,
                    },
                };

                if (existingClient) {
                    // Update existing client
                    const updatedClient: Client = {
                        ...existingClient,
                        ...clientData,
                        id: existingClient.id,
                        metadata: {
                            ...existingClient.metadata,
                            ...clientData.metadata,
                            lastModified: Date.now(),
                            lastModifiedBy: user.uid
                        }
                    } as Client;

                    await api.updateClient(updatedClient);
                    setImportLog(prev => [...prev, { status: 'success', message: `Successfully updated ${row.data['profile.firstName']} ${row.data['profile.lastName']} (ID: ${participantId}).` }]);
                } else {
                    // Create new client
                    await api.addClient(clientData as any, user.uid);
                    setImportLog(prev => [...prev, { status: 'success', message: `Successfully imported ${row.data['profile.firstName']} ${row.data['profile.lastName']}.` }]);
                }

            } catch (error) {
                setImportLog(prev => [...prev, { status: 'error', message: `Failed to import/update ${row.data['profile.firstName']} ${row.data['profile.lastName']}: ${error}` }]);
            }
        }

        setIsImporting(false);
    };

    const validRowCount = parsedData.filter(r => r.errors.length === 0).length;
    const errorRowCount = parsedData.length - validRowCount;

    return (
        <div className="space-y-6" >
            <h1 className="text-3xl font-bold text-gray-800">Client Data Import</h1>
            <Card title="Step 1: Prepare & Upload CSV File">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <p className="text-gray-600 mb-4">
                            Upload the WRTP Participant List CSV. The system will automatically map the columns.
                        </p>
                        <button
                            onClick={handleDownloadTemplate}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Download className="h-5 w-5 mr-2" />
                            Download Template
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

            {isParsing && <p>Parsing file...</p>
            }

            {
                parsedData.length > 0 && (
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
                                        <th className="px-4 py-2 text-left font-semibold">First Name</th>
                                        <th className="px-4 py-2 text-left font-semibold">Last Name</th>
                                        <th className="px-4 py-2 text-left font-semibold">Email</th>
                                        <th className="px-4 py-2 text-left font-semibold">Phone</th>
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
                                            <td className="px-4 py-2 whitespace-nowrap">{row.data['profile.firstName']}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.data['profile.lastName']}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.data['contactInfo.email']}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.data['contactInfo.phone']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {parsedData.length > 10 && <p className="text-center text-sm text-gray-500 mt-2">Showing first 10 rows of {parsedData.length}.</p>}
                    </Card>
                )
            }

            {
                parsedData.length > 0 && (
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
                )
            }

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



            <Card title="Data Cleanup (Fix Duplicates)">
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Use this tool to identify and remove duplicate client records created during import.
                        It finds clients with the same First and Last Name and keeps only the oldest record.
                    </p>
                    <div className="flex space-x-4">
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
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                        >
                            Scan & Remove Duplicates
                        </button>
                    </div>
                </div>
            </Card>
        </div >
    );
};

export default DataImportPage;
