import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { DownloadCloud, FilterX } from 'lucide-react';
import api from '../lib/firebase';
import { Client, Workshop, ISP, PlanOfActionItem, Task, CaseNote } from '../types';

const DataExportPage: React.FC = () => {
  // State for filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [adminFilter, setAdminFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // State for admin list
  const [admins, setAdmins] = useState<{ id: string, name: string }[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Fetch admins for the filter dropdown
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const adminsData = await api.getAdmins();
        setAdmins(adminsData);
      } catch (error) {
        console.error("Failed to fetch admins:", error);
      } finally {
        setLoadingAdmins(false);
      }
    };
    fetchAdmins();
  }, []);

  const handleClearFilters = () => {
    setStatusFilter('All');
    setTypeFilter('All');
    setAdminFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (clients: Client[]): string => {
    if (clients.length === 0) return '';

    const flattenedData = clients.map(client => {
      const d = client.demographics;
      const t = client.training;
      const m = client.metadata;
      const p = client.profile;
      const c = client.contactInfo;
      const inc = d?.incomeCertification;
      const dr = d?.disasterRecovery;
      const pub = d?.publicAssistance;
      const bar = d?.barriersToEmployment;
      const sup = d?.supportServices;
      const hh = d?.householdComposition;
      const coi = d?.conflictOfInterest;

      return {
        id: client.id,
        participantId: client.participantId || '',
        'profile.firstName': p.firstName,
        'profile.lastName': p.lastName,
        'profile.middleInitial': p.middleInitial || '', // Added
        'profile.dob': p.dob || '',
        'profile.age': p.age,
        googleDriveLink: client.googleDriveLink || '', // Moved to match likely order or just appending
        'contactInfo.phone': c.phone,
        'contactInfo.phone2': c.phone2 || '',
        'contactInfo.email': c.email || '',
        'contactInfo.street': c.street,
        'contactInfo.apt': c.apt || '',
        'contactInfo.city': c.city,
        'contactInfo.state': c.state,
        'contactInfo.zip': c.zip,
        referralSource: client.referralSource,
        'training.cpr': t.cpr,
        'training.firstAid': t.firstAid,
        'training.foodHandlersCard': t.foodHandlersCard,
        'training.osha10': t.osha10,
        'training.nccer': t.nccer,
        'training.otherCertificates': t.otherCertificates || '',
        'training.constructionCTE': t.constructionCTE,
        'training.cosmetologyCTE': t.cosmetologyCTE,
        'training.culinaryCTE': t.culinaryCTE,
        'training.fireCTE': t.fireCTE,
        'training.medicalCTE': t.medicalCTE,
        'training.earlyChildhoodEducationCTE': t.earlyChildhoodEducationCTE,
        'training.entrepreneurshipCTE': t.entrepreneurshipCTE,
        'training.otherCteProgram': t.otherCteProgram || '',
        'demographics.residentOfShastaCounty': d?.residentOfShastaCounty ?? '',
        'demographics.currentlyEmployed': d?.currentlyEmployed ?? '',
        'demographics.publicAssistance.housing': pub?.housing ?? '',
        'demographics.publicAssistance.calFresh': pub?.calFresh ?? '',
        'demographics.publicAssistance.calWorksSSI': pub?.calWorksSSI ?? '',
        'demographics.publicAssistance.unemployment': pub?.unemployment ?? '',
        'demographics.publicAssistance.childcare': pub?.childcare ?? '',
        'demographics.publicAssistance.tribalFunding': pub?.tribalFunding ?? '',
        'demographics.publicAssistance.other': pub?.other || '',
        'demographics.barriersToEmployment.transportation': bar?.transportation ?? '',
        'demographics.barriersToEmployment.socialSecurityCard': bar?.socialSecurityCard ?? '',
        'demographics.barriersToEmployment.criminalRecord': bar?.criminalRecord ?? '',
        'demographics.barriersToEmployment.housingInstability': bar?.housingInstability ?? '',
        'demographics.barriersToEmployment.disability': bar?.disability ?? '',
        'demographics.barriersToEmployment.mentalHealthChallenges': bar?.mentalHealthChallenges ?? '',
        'demographics.barriersToEmployment.substanceUseRecovery': bar?.substanceUseRecovery ?? '',
        'demographics.barriersToEmployment.stateIdDriversLicense': bar?.stateIdDriversLicense ?? '',
        'demographics.barriersToEmployment.other': bar?.other || '',
        'demographics.educationLevel': d?.educationLevel || '',
        'demographics.educationOther': d?.educationOther || '',
        'demographics.currentlyEnrolled': d?.currentlyEnrolled ?? '',
        'demographics.hasResume': d?.hasResume ?? '',
        'demographics.jobInterests': d?.jobInterests || '',
        'demographics.interestedInTraining': d?.interestedInTraining ?? '',
        'demographics.supportServices.resumeInterviewHelp': sup?.resumeInterviewHelp ?? '',
        'demographics.supportServices.transportation': sup?.transportation ?? '',
        'demographics.supportServices.childcare': sup?.childcare ?? '',
        'demographics.supportServices.mentalHealthCounseling': sup?.mentalHealthCounseling ?? '',
        'demographics.supportServices.legalServices': sup?.legalServices ?? '',
        'demographics.supportServices.other': sup?.other || '',
        'demographics.householdComposition.liveAlone': hh?.liveAlone ?? '',
        'demographics.householdComposition.expectChange': hh?.expectChange ?? '',
        'demographics.conflictOfInterest.hasConflict': coi?.hasConflict ?? '',
        'demographics.conflictOfInterest.relationship': coi?.relationship || '',
        'demographics.incomeCertification.applicantName': inc?.applicantName || '',
        'demographics.incomeCertification.householdSize': inc?.householdSize ?? '',
        'demographics.incomeCertification.femaleHeadOfHousehold': inc?.femaleHeadOfHousehold ?? '',
        'demographics.incomeCertification.seniorHeadOfHousehold': inc?.seniorHeadOfHousehold ?? '',
        'demographics.incomeCertification.singleParentFamily': inc?.singleParentFamily ?? '',
        'demographics.incomeCertification.disabledFamilyMember': inc?.disabledFamilyMember ?? '',
        'demographics.incomeCertification.elderlyCount': inc?.elderlyCount ?? '',
        'demographics.incomeCertification.studentCount': inc?.studentCount ?? '',
        'demographics.incomeCertification.under18Count': inc?.under18Count ?? '',
        'demographics.incomeCertification.gender': inc?.gender || '',
        'demographics.incomeCertification.race.white': inc?.race?.white ?? '',
        'demographics.incomeCertification.race.nativeHawaiianPI': inc?.race?.nativeHawaiianPI ?? '',
        'demographics.incomeCertification.race.asian': inc?.race?.asian ?? '',
        'demographics.incomeCertification.race.americanIndianAlaskanNative': inc?.race?.americanIndianAlaskanNative ?? '',
        'demographics.incomeCertification.race.twoOrMoreRaces': inc?.race?.twoOrMoreRaces ?? '',
        'demographics.incomeCertification.race.preferNotToAnswer': inc?.race?.preferNotToAnswer ?? '',
        'demographics.incomeCertification.race.blackAfricanAmerican': inc?.race?.blackAfricanAmerican ?? '',
        'demographics.incomeCertification.hispanicLatino': inc?.hispanicLatino || '',
        'demographics.incomeCertification.annualIncome': inc?.annualIncome ?? '',
        'demographics.disasterRecovery.receivedAssistance': dr?.receivedAssistance ?? '',
        'demographics.disasterRecovery.assistanceDetails': dr?.assistanceDetails || '',
        'demographics.disasterRecovery.participatedSimilar': dr?.participatedSimilar ?? '',
        'demographics.disasterRecovery.similarDetails': dr?.similarDetails || '',
        'metadata.dateCreated': new Date(m.dateCreated).toLocaleString(),
        'metadata.createdBy': m.createdBy,
        'metadata.lastModified': new Date(m.lastModified).toLocaleString(),
        'metadata.lastModifiedBy': m.lastModifiedBy,
        'metadata.status': m.status,
        'metadata.clientType': m.clientType,
        'metadata.assignedAdminId': m.assignedAdminId || '',
        'metadata.assignedAdminName': m.assignedAdminName || '',
        'metadata.lastCaseNoteDate': m.lastCaseNoteDate ? new Date(m.lastCaseNoteDate).toLocaleString() : '',
      };
    });

    const headers = Object.keys(flattenedData[0]);
    const headerRow = headers.join(',');

    const rows = flattenedData.map(row => {
      return headers.map(header => {
        const val = (row as any)[header];
        if (val === null || val === undefined) {
          return '';
        }
        const stringVal = String(val);
        // Escape quotes by doubling them and wrap in quotes if it contains comma, newline or quote.
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  };

  const convertWorkshopsToCSV = (workshops: (Workshop & { clientName: string })[]): string => {
    if (workshops.length === 0) return '';

    const flattenedData = workshops.map(workshop => ({
      workshopId: workshop.id,
      clientId: workshop.clientId,
      clientName: workshop.clientName,
      workshopName: workshop.workshopName === 'Other' && workshop.workshopNameOther ? workshop.workshopNameOther : workshop.workshopName,
      workshopDate: new Date(workshop.workshopDate).toLocaleDateString(),
      status: workshop.status,
      assignedStaffId: workshop.assignedToId,
      assignedStaffName: workshop.assignedToName,
    }));

    const headers = Object.keys(flattenedData[0]);
    const headerRow = headers.join(',');

    const rows = flattenedData.map(row => {
      return headers.map(header => {
        const val = (row as any)[header];
        if (val === null || val === undefined) {
          return '';
        }
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  };

  const convertActionStepsToCSV = (actionSteps: (PlanOfActionItem & { clientId: string; clientName: string; caseManager: string; ispDate: string; })[]): string => {
    if (actionSteps.length === 0) return '';

    const flattenedData = actionSteps.map(step => ({
      clientId: step.clientId,
      clientName: step.clientName,
      caseManager: step.caseManager,
      ispDate: step.ispDate,
      actionStepId: step.id,
      goal: step.goal,
      action: step.action,
      responsibleParty: step.responsibleParty,
      targetDate: step.targetDate,
      reviewDate: step.reviewDate,
      completionDate: step.completionDate,
    }));

    const headers = Object.keys(flattenedData[0]);
    const headerRow = headers.join(',');

    const rows = flattenedData.map(row => {
      return headers.map(header => {
        const val = (row as any)[header];
        if (val === null || val === undefined) {
          return '';
        }
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  };

  const convertTasksToCSV = (tasks: Task[]): string => {
    if (tasks.length === 0) return '';

    const flattenedData = tasks.map(task => ({
      taskId: task.id,
      clientId: task.clientId,
      clientName: task.clientName,
      title: task.title,
      details: task.details,
      dueDate: new Date(task.dueDate).toLocaleDateString(),
      status: task.status,
      urgency: task.urgency,
      assignedStaffId: task.assignedToId,
      assignedStaffName: task.assignedToName,
      createdBy: task.createdBy,
    }));

    const headers = Object.keys(flattenedData[0]);
    const headerRow = headers.join(',');

    const rows = flattenedData.map(row => {
      return headers.map(header => {
        const val = (row as any)[header];
        if (val === null || val === undefined) {
          return '';
        }
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  };

  const convertCaseNotesToCSV = (caseNotes: (CaseNote & { clientName: string; caseManager: string; })[]): string => {
    if (caseNotes.length === 0) return '';

    const flattenedData = caseNotes.map(note => ({
      noteId: note.id,
      clientId: note.clientId,
      clientName: note.clientName,
      caseManager: note.caseManager,
      noteDate: new Date(note.noteDate).toLocaleString(),
      noteType: note.noteType,
      urgency: note.urgency,
      serviceType: note.serviceType,
      contactMethod: note.contactMethod,
      durationMinutes: note.durationMinutes,
      noteBody: note.noteBody.replace(/<[^>]*>?/gm, ''), // Strip HTML for CSV
      staffId: note.staffId,
      staffName: note.staffName,
    }));

    const headers = Object.keys(flattenedData[0]);
    const headerRow = headers.join(',');

    const rows = flattenedData.map(row => {
      return headers.map(header => {
        const val = (row as any)[header];
        if (val === null || val === undefined) {
          return '';
        }
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  };




  const convertISPGoalsToCSV = (isps: (ISP & { clientName: string; clientType: string; caseManager: string; })[]): string => {
    if (isps.length === 0) return '';

    const flattenedData = isps.map(isp => ({
      clientId: isp.clientId,
      clientName: isp.clientName,
      clientType: isp.clientType,
      caseManager: isp.caseManager,
      ispDate: new Date(isp.ispDate).toLocaleDateString(),
      shortTermGoals: isp.shortTermGoals,
      longTermGoals: isp.longTermGoals,
      identifiedBarriers: (isp.identifiedBarriers || []).join('; '),
      workshopsAssigned: isp.careerPlanning?.workshopsAssigned || '',
      enrolledInCteOrCollege: isp.careerPlanning?.enrolledInCteOrCollege ? 'Yes' : 'No',
    }));

    const headers = Object.keys(flattenedData[0]);
    const headerRow = headers.join(',');

    const rows = flattenedData.map(row => {
      return headers.map(header => {
        const val = (row as any)[header];
        if (val === null || val === undefined) {
          return '';
        }
        const stringVal = String(val);
        // Clean up newlines for CSV readability in cells
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  };

  const handleExport = async (format: 'JSON' | 'CSV', collection: 'clients' | 'workshops' | 'actionSteps' | 'tasks' | 'caseNotes' | 'ispGoals') => {
    setIsExporting(true);
    try {
      const allClients = await api.getClients();

      const startDateMs = startDate ? new Date(startDate).getTime() : null;
      const endDateObj = endDate ? new Date(endDate) : null;
      if (endDateObj) {
        endDateObj.setHours(23, 59, 59, 999); // Set to end of day
      }
      const endDateMs = endDateObj ? endDateObj.getTime() : null;

      const filteredClients = allClients.filter(client => {
        const statusMatch = statusFilter === 'All' || client.metadata.status === statusFilter;
        const typeMatch = typeFilter === 'All' || client.metadata.clientType === typeFilter;
        const adminMatch = adminFilter === 'All' || client.metadata.assignedAdminName === adminFilter;
        const dateMatch = (!startDateMs || client.metadata.initialAppointmentDate >= startDateMs) &&
          (!endDateMs || client.metadata.initialAppointmentDate <= endDateMs);
        return statusMatch && typeMatch && adminMatch && dateMatch;
      });

      const dateSuffix = new Date().toISOString().split('T')[0];

      if (collection === 'clients') {
        if (filteredClients.length === 0) {
          alert("No client data found for the selected filters.");
          return;
        }

        if (format === 'JSON') {
          const jsonString = JSON.stringify(filteredClients, null, 2);
          downloadFile(jsonString, `clients_export_${dateSuffix}.json`, 'application/json');
        } else if (format === 'CSV') {
          const csvString = convertToCSV(filteredClients);
          downloadFile(csvString, `clients_export_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        }
      } else if (collection === 'caseNotes') {
        if (filteredClients.length === 0) {
          alert("No client data found for the selected filters.");
          return;
        }
        const filteredClientIds = new Set(filteredClients.map(c => c.id));
        const allCaseNotes = await api.getAllCaseNotes();
        const filteredCaseNotes = allCaseNotes.filter(note => filteredClientIds.has(note.clientId));

        if (filteredCaseNotes.length === 0) {
          alert("No case notes found for the selected client filters.");
          return;
        }

        const clientMap = new Map(allClients.map(c => [c.id, {
          name: `${c.profile.firstName} ${c.profile.lastName}`,
          caseManager: c.metadata.assignedAdminName,
        }]));

        const augmentedCaseNotes = filteredCaseNotes.map(note => ({
          ...note,
          clientName: clientMap.get(note.clientId)?.name || 'Unknown Client',
          caseManager: clientMap.get(note.clientId)?.caseManager || 'Unknown',
        }));


        if (format === 'JSON') {
          const jsonString = JSON.stringify(augmentedCaseNotes, null, 2);
          downloadFile(jsonString, `case_notes_export_${dateSuffix}.json`, 'application/json');
        } else if (format === 'CSV') {
          const csvString = convertCaseNotesToCSV(augmentedCaseNotes);
          downloadFile(csvString, `case_notes_export_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        }
      } else if (collection === 'workshops') {
        const filteredClientIds = new Set(filteredClients.map(c => c.id));
        const allWorkshops = await api.getAllWorkshops();

        const filteredWorkshops = allWorkshops.filter(w => filteredClientIds.has(w.clientId));

        if (filteredWorkshops.length === 0) {
          alert("No workshop data found for the selected client filters.");
          return;
        }

        const clientMap = new Map(allClients.map(c => [c.id, `${c.profile.firstName} ${c.profile.lastName}`]));
        const augmentedWorkshops = filteredWorkshops.map(w => ({
          ...w,
          clientName: clientMap.get(w.clientId) || 'Unknown Client',
        }));

        if (format === 'JSON') {
          const jsonString = JSON.stringify(augmentedWorkshops, null, 2);
          downloadFile(jsonString, `workshops_export_${dateSuffix}.json`, 'application/json');
        } else if (format === 'CSV') {
          const csvString = convertWorkshopsToCSV(augmentedWorkshops);
          downloadFile(csvString, `workshops_export_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        }
      } else if (collection === 'actionSteps') {
        if (filteredClients.length === 0) {
          alert("No client data found for the selected filters.");
          return;
        }
        const filteredClientIds = new Set(filteredClients.map(c => c.id));
        const allISPs = await api.getAllISPs();

        const filteredISPs = allISPs.filter(isp => filteredClientIds.has(isp.clientId));

        if (filteredISPs.length === 0) {
          alert("No ISP data found for the selected client filters.");
          return;
        }

        const clientMap = new Map(allClients.map(c => [c.id, {
          name: `${c.profile.firstName} ${c.profile.lastName}`,
          caseManager: c.metadata.assignedAdminName,
        }]));

        const allActionSteps = filteredISPs.flatMap(isp =>
          (isp.planOfAction || []).map(step => ({
            ...step,
            clientId: isp.clientId,
            clientName: clientMap.get(isp.clientId)?.name || 'Unknown Client',
            caseManager: clientMap.get(isp.clientId)?.caseManager || 'Unknown',
            ispDate: new Date(isp.ispDate).toLocaleDateString(),
          }))
        );

        if (allActionSteps.length === 0) {
          alert("No Action Steps found for the selected filters.");
          return;
        }

        if (format === 'JSON') {
          const jsonString = JSON.stringify(allActionSteps, null, 2);
          downloadFile(jsonString, `action_steps_export_${dateSuffix}.json`, 'application/json');
        } else if (format === 'CSV') {
          const csvString = convertActionStepsToCSV(allActionSteps);
          downloadFile(csvString, `action_steps_export_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        }
      } else if (collection === 'tasks') {
        if (filteredClients.length === 0) {
          alert("No client data found for the selected filters.");
          return;
        }
        const filteredClientIds = new Set(filteredClients.map(c => c.id));
        const allTasks = await api.getTasks();

        const filteredTasks = allTasks.filter(task => filteredClientIds.has(task.clientId));

        if (filteredTasks.length === 0) {
          alert("No To-Do items found for the selected filters.");
          return;
        }

        if (format === 'JSON') {
          const jsonString = JSON.stringify(filteredTasks, null, 2);
          downloadFile(jsonString, `todos_export_${dateSuffix}.json`, 'application/json');
        } else if (format === 'CSV') {
          const csvString = convertTasksToCSV(filteredTasks);
          downloadFile(csvString, `todos_export_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        }
      } else if (collection === 'ispGoals') {
        if (filteredClients.length === 0) {
          alert("No client data found for the selected filters.");
          return;
        }
        const filteredClientIds = new Set(filteredClients.map(c => c.id));
        // Use the new getAllISPs function
        const allISPs = await api.getAllISPs();

        const filteredISPs = allISPs.filter(isp => filteredClientIds.has(isp.clientId));

        if (filteredISPs.length === 0) {
          alert("No ISP data found for the selected client filters.");
          return;
        }

        const clientMap = new Map(allClients.map(c => [c.id, {
          name: `${c.profile.firstName} ${c.profile.lastName}`,
          type: c.metadata.clientType,
          caseManager: c.metadata.assignedAdminName,
        }]));

        const augmentedISPs = filteredISPs.map(isp => ({
          ...isp,
          clientName: clientMap.get(isp.clientId)?.name || 'Unknown Client',
          clientType: clientMap.get(isp.clientId)?.type || 'Unknown',
          caseManager: clientMap.get(isp.clientId)?.caseManager || 'Unknown',
        }));

        if (format === 'JSON') {
          const jsonString = JSON.stringify(augmentedISPs, null, 2);
          downloadFile(jsonString, `isp_goals_export_${dateSuffix}.json`, 'application/json');
        } else if (format === 'CSV') {
          const csvString = convertISPGoalsToCSV(augmentedISPs);
          downloadFile(csvString, `isp_goals_export_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
        }
      }

    } catch (error) {
      console.error("Export failed:", error);
      alert("An error occurred during export. Please check the console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const clientStatuses = ['All', 'Prospect', 'Active', 'Inactive'];
  const clientTypes = ['All', 'General Population', 'CHYBA'];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Data Export</h1>
      <Card title="Export Collections">
        <p className="text-gray-600 mb-6">
          Use the filters below to refine your data, then generate and download a JSON or CSV file. This process is handled client-side and may take a few moments for large datasets.
        </p>

        {/* Filters Section */}
        <div className="p-4 border rounded-lg mb-6 bg-gray-50 space-y-4">
          <h4 className="font-semibold text-gray-800">Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Client Status</label>
              <select id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input mt-1">
                {clientStatuses.map(status => <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700">Client Type</label>
              <select id="typeFilter" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="form-input mt-1">
                {clientTypes.map(type => <option key={type} value={type}>{type === 'All' ? 'All Types' : type}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="adminFilter" className="block text-sm font-medium text-gray-700">Case Manager</label>
              <select id="adminFilter" value={adminFilter} onChange={e => setAdminFilter(e.target.value)} className="form-input mt-1" disabled={loadingAdmins}>
                <option value="All">All Case Managers</option>
                {admins.map(admin => <option key={admin.id} value={admin.name}>{admin.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date (Initial Appt.)</label>
                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input mt-1" />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date (Initial Appt.)</label>
                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input mt-1" />
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={handleClearFilters} className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53]">
                <FilterX className="h-5 w-5 mr-2" /> Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg flex justify-between items-center bg-white">
            <div>
              <h4 className="font-semibold text-gray-800">Clients Collection</h4>
              <p className="text-sm text-gray-500">Export client data based on the active filters above.</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => handleExport('JSON', 'clients')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> JSON</>}
              </button>
              <button onClick={() => handleExport('CSV', 'clients')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> CSV</>}
              </button>
            </div>
          </div>
          <div className="p-4 border rounded-lg flex justify-between items-center bg-white">
            <div>
              <h4 className="font-semibold text-gray-800">Case Notes Collection</h4>
              <p className="text-sm text-gray-500">Export all case note data based on the active client filters.</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => handleExport('JSON', 'caseNotes')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> JSON</>}
              </button>
              <button onClick={() => handleExport('CSV', 'caseNotes')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> CSV</>}
              </button>
            </div>
          </div>
          <div className="p-4 border rounded-lg flex justify-between items-center bg-white">
            <div>
              <h4 className="font-semibold text-gray-800">Workshops Collection</h4>
              <p className="text-sm text-gray-500">Export workshop data based on the active client filters above.</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => handleExport('JSON', 'workshops')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> JSON</>}
              </button>
              <button onClick={() => handleExport('CSV', 'workshops')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> CSV</>}
              </button>
            </div>
          </div>
          <div className="p-4 border rounded-lg flex justify-between items-center bg-white">
            <div>
              <h4 className="font-semibold text-gray-800">Action Steps Collection</h4>
              <p className="text-sm text-gray-500">Export all Plan of Action steps based on the active client filters.</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => handleExport('JSON', 'actionSteps')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> JSON</>}
              </button>
              <button onClick={() => handleExport('CSV', 'actionSteps')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> CSV</>}
              </button>
            </div>
          </div>
          <div className="p-4 border rounded-lg flex justify-between items-center bg-white">
            <div>
              <h4 className="font-semibold text-gray-800">To-Do Tasks Collection</h4>
              <p className="text-sm text-gray-500">Export all To-Do items (tasks) based on the active client filters.</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => handleExport('JSON', 'tasks')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> JSON</>}
              </button>
              <button onClick={() => handleExport('CSV', 'tasks')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> CSV</>}
              </button>
            </div>
          </div>
          <div className="p-4 border rounded-lg flex justify-between items-center bg-white">
            <div>
              <h4 className="font-semibold text-gray-800">ISP Goals & Details</h4>
              <p className="text-sm text-gray-500">Export Short Term/Long Term Goals and Barriers from ISPs.</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => handleExport('JSON', 'ispGoals')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> JSON</>}
              </button>
              <button onClick={() => handleExport('CSV', 'ispGoals')} disabled={isExporting} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6c53] disabled:bg-gray-300 disabled:cursor-not-allowed">
                {isExporting ? 'Exporting...' : <><DownloadCloud className="h-5 w-5 mr-2 pointer-events-none" /> CSV</>}
              </button>
            </div>
          </div>
        </div>
        <style>{`.form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; } .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }`}</style>
      </Card>
    </div>
  );
};

export default DataExportPage;
