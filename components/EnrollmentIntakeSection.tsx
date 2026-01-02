import React, { useState, useEffect, useMemo } from 'react';
import { Client, DemographicsAndBarriers, ClientProfile, ClientContactInfo, ClientEnrollmentIntake } from '../types'; 
import api from '../services/firebaseApi'; 
import Card from './Card'; 
import { Edit, Save, X } from 'lucide-react';

interface EnrollmentIntakeSectionProps {
  client: Client;
  // onClientUpdate is used to persist changes to Firebase
  onClientUpdate: (updatedClient: Client) => Promise<void>;
}

// --- CONSTANTS ---
// Barrier flags that reside in the DemographicsAndBarriers object
const DEMOGRAPHICS_BARRIERS_MAP: { key: keyof DemographicsAndBarriers, label: string }[] = [
  { key: 'femaleTrainee', label: 'Female Trainee' },
  { key: 'youthAgingOutFosterCare', label: 'Youth Aging out of Foster Care' },
  { key: 'disabledHousehold', label: 'Disabled Household' },
  { key: 'femaleHeadOfHousehold', label: 'Female Head of Household' },
  { key: 'fosterYouth', label: 'Foster Youth' },
  { key: 'homeless', label: 'Housing Instability/Homeless' },
  { key: 'limitedSpeakingEnglish', label: 'Limited Speaking English' },
  { key: 'senior', label: 'Senior (62+)' },
  { key: 'singleParent', label: 'Single Parent Family' },
  { key: 'veteran', label: 'Veteran' },
  { key: 'recentlyReleased', label: 'Recently Released from Correctional Facility' },
  { key: 'otherBarrier', label: 'Other Barrier Identified' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary', 'Decline to State', 'Other'];
const RACE_ETHNICITY_OPTIONS = [
    'White', 'Black or African American', 'Asian', 'Native American or Alaska Native', 
    'Native Hawaiian or Other Pacific Islander', 'Hispanic or Latino', 'Two or More Races', 'Decline to State'
];
const FINANCIAL_SERVICE_OPTIONS = ['Moderate', 'Low', 'Extremely Low'];

const PUBLIC_ASSISTANCE_MAP: { key: keyof ClientEnrollmentIntake, label: string }[] = [
    { key: 'paHousing', label: 'Housing (Section 8)' }, 
    { key: 'paCalFresh', label: 'CalFresh' }, 
    { key: 'paCalWORKS', label: 'CalWORKs/SSI' }, 
    { key: 'paUnemployment', label: 'Unemployment' }, 
    { key: 'paChildcare', label: 'Childcare' }, 
    { key: 'paTribalFunding', label: 'Tribal Funding/BIA Card' },
];

const EMPLOYMENT_BARRIERS_MAP: { key: keyof ClientEnrollmentIntake, label: string }[] = [
    { key: 'ebTransportation', label: 'Transportation' }, 
    { key: 'ebCriminalRecord', label: 'Criminal Record' }, 
    { key: 'ebHousingInstability', label: 'Housing Instability' },
    { key: 'ebDisability', label: 'Disability' }, 
    { key: 'ebMentalHealth', label: 'Mental Health Challenges' }, 
    { key: 'ebSubstanceUse', label: 'Substance Use Recovery' }, 
    { key: 'ebStateID', label: 'State ID/Drivers License' }, 
    { key: 'ebSSNCard', label: 'Social Security Card' },
];

const EDUCATION_LEVELS_MAP: { key: keyof ClientEnrollmentIntake, label: string }[] = [
    { key: 'edNoHighSchool', label: 'No High School Diploma' }, 
    { key: 'edGED', label: 'GED' }, 
    { key: 'edHighSchoolDiploma', label: 'High School Diploma' }, 
    { key: 'edSomeCollege', label: 'Some College' }, 
    { key: 'edAssociateDegree', label: 'Associate Degree' }, 
    { key: 'edBachelorDegree', label: 'Bachelor’s Degree' },
];

const SUPPORT_SERVICES_MAP: { key: keyof ClientEnrollmentIntake, label: string }[] = [
    { key: 'ssResumeInterview', label: 'Resume & Interview Help' }, 
    { key: 'ssTransportation', label: 'Transportation' }, 
    { key: 'ssChildcare', label: 'Childcare' }, 
    { key: 'ssMentalHealth', label: 'Mental Health Counseling' }, 
    { key: 'ssLegalServices', label: 'Legal Services' },
];

// --- DEFAULTS ---
const DEMOGRAPHICS_DEFAULTS: DemographicsAndBarriers = {
    gender: '', raceEthnicity: '', selfCertificationAnnualIncome: false, femaleTrainee: false,
    youthAgingOutFosterCare: false, disabledHousehold: false, femaleHeadOfHousehold: false,
    fosterYouth: false, homeless: false, limitedSpeakingEnglish: false, otherBarrier: false,
    senior: false, singleParent: false, veteran: false, recentlyReleased: false,
}

const ENROLLMENT_INTAKE_DEFAULTS: ClientEnrollmentIntake = {
    isShastaCountyResident: false, isCurrentlyEmployed: false,
    paHousing: false, paCalFresh: false, paCalWORKS: false, paUnemployment: false, paChildcare: false, paTribalFunding: false, paOther: '',
    ebTransportation: false, ebCriminalRecord: false, ebHousingInstability: false, ebDisability: false, 
    ebMentalHealth: false, ebSubstanceUse: false, ebStateID: false, ebSSNCard: false, ebOther: '',
    edNoHighSchool: false, edGED: false, edHighSchoolDiploma: false, edSomeCollege: false, edAssociateDegree: false, edBachelorDegree: false, edOther: '',
    currentlyEnrolled: false, hasResume: false, jobCareerInterest: '', wantJobTraining: false,
    ssResumeInterview: false, ssTransportation: false, ssChildcare: false, ssMentalHealth: false, ssLegalServices: false, ssOther: '',
    emergencyContact1: '', emergencyContact2: '',
}


const EnrollmentIntakeSection: React.FC<EnrollmentIntakeSectionProps> = ({ client, onClientUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Create a combined default object for safer spreading in initial state
  const initialDataSnapshot = useMemo(() => {
    // Defensive check and merge for nested objects
    const dem = client.demographicsAndBarriers ?? DEMOGRAPHICS_DEFAULTS;
    const intake = client.enrollmentIntake ?? ENROLLMENT_INTAKE_DEFAULTS;

    return {
      // Profile
      firstName: client.profile.firstName, middleInitial: client.profile.middleInitial || '', lastName: client.profile.lastName,
      dob: client.profile.dob || '', last4SSN: client.profile.last4SSN || '', ageAtEnrollment: client.profile.ageAtEnrollment ?? 0,
      // Contact
      phone: client.contactInfo.phone, email: client.contactInfo.email, street: client.contactInfo.street || '',
      city: client.contactInfo.city || '', state: client.contactInfo.state || '', zip: client.contactInfo.zip || '',
      // Demographics
      ...dem,
      // Intake
      ...intake,
      // Client Root/Metadata
      referralSource: client.referralSource || '', 
      financialServiceLevel: client.metadata.financialServiceLevel || '',
      programCompleter: client.metadata.programCompleter,
      dateApplication: client.metadata.dateApplication || '',
      dateWithdrew: client.metadata.dateWithdrew || '',
      // Age (needed for calculation logic)
      age: client.profile.age,
    };
  }, [client]);

  // --- FIX 1: Type is now inferred from useState, solving the global scope issue ---
  const [formData, setFormData] = useState(initialDataSnapshot);
  type EnrollmentFormData = typeof formData;
  // --- END FIX 1 ---
  
  // Sync state if client prop changes externally
  useEffect(() => {
    setFormData(initialDataSnapshot);
  }, [initialDataSnapshot]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    let newAge = formData.age;
    let newAgeAtEnrollment = formData.ageAtEnrollment;
    
    if (name === 'dob' && value) {
        const birthDate = new Date(value);
        const today = new Date();
        newAge = today.getFullYear() - birthDate.getFullYear();
        
        if (formData.dateApplication) {
            const appDate = new Date(formData.dateApplication);
            newAgeAtEnrollment = appDate.getFullYear() - birthDate.getFullYear();
            if (appDate.getMonth() < birthDate.getMonth() || (appDate.getMonth() === birthDate.getMonth() && appDate.getDate() < birthDate.getDate())) {
              newAgeAtEnrollment--;
            }
        } else {
             newAgeAtEnrollment = newAge;
        }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      age: name === 'dob' ? newAge : prev.age,
      ageAtEnrollment: name === 'dob' ? newAgeAtEnrollment : prev.ageAtEnrollment,
    }));
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    // --- 1. Construct Profile Data ---
    const updatedProfile: ClientProfile = {
      firstName: formData.firstName,
      middleInitial: formData.middleInitial,
      lastName: formData.lastName,
      dob: formData.dob || undefined,
      age: formData.age, 
      ageAtEnrollment: Number(formData.ageAtEnrollment), 
      last4SSN: formData.last4SSN || undefined,
    };

    // --- 2. Construct Contact Info ---
    const updatedContactInfo: ClientContactInfo = {
        phone: formData.phone,
        email: formData.email,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        phone2: client.contactInfo.phone2, // Preserve existing optional fields
        apt: client.contactInfo.apt, 
    };

    // --- 3. Construct Demographics & Barriers ---
    const updatedDemographics: DemographicsAndBarriers = {
        gender: formData.gender,
        raceEthnicity: formData.raceEthnicity,
        selfCertificationAnnualIncome: formData.selfCertificationAnnualIncome,
        femaleTrainee: formData.femaleTrainee,
        youthAgingOutFosterCare: formData.youthAgingOutFosterCare,
        disabledHousehold: formData.disabledHousehold,
        femaleHeadOfHousehold: formData.femaleHeadOfHousehold,
        fosterYouth: formData.fosterYouth,
        homeless: formData.homeless,
        limitedSpeakingEnglish: formData.limitedSpeakingEnglish,
        otherBarrier: formData.otherBarrier,
        senior: formData.senior,
        singleParent: formData.singleParent,
        veteran: formData.veteran,
        recentlyReleased: formData.recentlyReleased,
    };

    // --- 4. Construct Enrollment Intake Data ---
    const updatedIntake: ClientEnrollmentIntake = {
        isShastaCountyResident: formData.isShastaCountyResident,
        isCurrentlyEmployed: formData.isCurrentlyEmployed,
        paHousing: formData.paHousing, paCalFresh: formData.paCalFresh, paCalWORKS: formData.paCalWORKS,
        paUnemployment: formData.paUnemployment, paChildcare: formData.paChildcare, paTribalFunding: formData.paTribalFunding,
        paOther: formData.paOther,
        ebTransportation: formData.ebTransportation, ebCriminalRecord: formData.ebCriminalRecord, ebHousingInstability: formData.ebHousingInstability,
        ebDisability: formData.ebDisability, ebMentalHealth: formData.ebMentalHealth, ebSubstanceUse: formData.ebSubstanceUse,
        ebStateID: formData.ebStateID, ebSSNCard: formData.ebSSNCard, ebOther: formData.ebOther,
        edNoHighSchool: formData.edNoHighSchool, edGED: formData.edGED, edHighSchoolDiploma: formData.edHighSchoolDiploma,
        edSomeCollege: formData.edSomeCollege, edAssociateDegree: formData.edAssociateDegree, edBachelorDegree: formData.edBachelorDegree,
        edOther: formData.edOther,
        currentlyEnrolled: formData.currentlyEnrolled, hasResume: formData.hasResume,
        jobCareerInterest: formData.jobCareerInterest, wantJobTraining: formData.wantJobTraining,
        ssResumeInterview: formData.ssResumeInterview, ssTransportation: formData.ssTransportation, ssChildcare: formData.ssChildcare,
        ssMentalHealth: formData.ssMentalHealth, ssLegalServices: formData.ssLegalServices, ssOther: formData.ssOther,
        emergencyContact1: formData.emergencyContact1, emergencyContact2: formData.emergencyContact2,
    };

    // --- 5. Assemble Final Client Object ---
    const updatedClient: Client = {
      ...client,
      profile: updatedProfile,
      contactInfo: updatedContactInfo,
      demographicsAndBarriers: updatedDemographics,
      enrollmentIntake: updatedIntake, // New collection
      referralSource: formData.referralSource,
      metadata: {
        ...client.metadata,
        dateApplication: formData.dateApplication || undefined,
        dateWithdrew: formData.dateWithdrew || undefined,
        programCompleter: formData.programCompleter,
        financialServiceLevel: formData.financialServiceLevel,
      }
    };
    
    try {
      await onClientUpdate(updatedClient);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving enrollment intake:", error);
      setSaveError("Failed to save enrollment data. Please check the console.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError(null);
    setFormData(initialDataSnapshot); // Reset to the last known client data
  };

  const renderDisplayField = (label: string, value: string | number | boolean | undefined) => (
    <div className="text-sm">
      <p className="font-medium text-gray-500">{label}</p>
      <p className="text-gray-800 break-words">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || 'N/A')}
      </p>
    </div>
  );

  const renderInputField = (label: string, name: keyof EnrollmentFormData, type: string = 'text', required: boolean = false) => (
    <div>
      <label htmlFor={name as string} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name as string}
        id={name as string}
        required={required}
        value={formData[name] as string | number}
        onChange={handleChange}
        className="form-input"
      />
    </div>
  );
  
  const renderSelectField = (label: string, name: keyof EnrollmentFormData, options: string[], required: boolean = false) => (
      <div>
          <label htmlFor={name as string} className="block text-sm font-medium text-gray-700">{label}</label>
          <select
              name={name as string}
              id={name as string}
              required={required}
              value={formData[name] as string}
              onChange={handleChange}
              className="form-input"
          >
              <option value="">Select...</option>
              {options.map(option => (
                  <option key={option} value={option}>{option}</option>
              ))}
          </select>
      </div>
  );

  // --- FIX 2: Refactored Checkbox Group to accept keys and the correct data object ---
  const renderCheckboxGroup = <T extends ClientEnrollmentIntake | DemographicsAndBarriers>(
    title: string, 
    map: { key: keyof T, label: string }[], 
    dataObject: T, 
    otherField?: keyof T
  ) => (
    <div className="space-y-2 mt-2">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2">
            {map.map(item => (
                <div key={item.key as string} className="flex items-center">
                    <input
                        type="checkbox"
                        name={item.key as string}
                        // Reads value directly from the local formData state
                        checked={!!formData[item.key as keyof EnrollmentFormData]}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]"
                    />
                    <label htmlFor={item.key as string} className="ml-2 text-sm text-gray-700">{item.label}</label>
                </div>
            ))}
        </div>
        {otherField && (
            <div className="pt-2">
                <label htmlFor={otherField as string} className="block text-sm font-medium text-gray-700">Other:</label>
                <input
                    type="text"
                    name={otherField as string}
                    id={otherField as string}
                    value={formData[otherField as keyof EnrollmentFormData] as string}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Specify other reason"
                />
            </div>
        )}
    </div>
);


  return (
    <Card title="Enrollment Intake Data" className="space-y-4">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89] flex items-center"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Intake'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" /> Edit Intake Data
            </button>
          )}
        </div>
        
        {saveError && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{saveError}</div>}

        <div className="space-y-6">
          {/* ---------------------------------------------------------------------------------- */}
          {/* Section 1: Contact Information (Updated Title) */}
          {/* ---------------------------------------------------------------------------------- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">1. Contact Information</legend>
            <div className={`grid gap-4 ${isEditing ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              
              {isEditing ? (
                <>
                  {renderInputField('First Name', 'firstName', 'text', true)}
                  {renderInputField('M.I.', 'middleInitial')}
                  {renderInputField('Last Name', 'lastName', 'text', true)}
                  {renderInputField('Date of Birth', 'dob', 'date')}
                  {renderInputField('SSN (Last 4)', 'last4SSN')}
                  {renderInputField('Phone', 'phone', 'tel', true)}
                  {renderInputField('Email', 'email', 'email', true)}
                  {renderInputField('Referral Source', 'referralSource')}
                  {renderInputField('Street Address', 'street')}
                  {renderInputField('City', 'city')}
                  {renderInputField('State', 'state')}
                  {renderInputField('Zip', 'zip')}
                  {renderInputField('Emergency Contact 1', 'emergencyContact1')}
                  {renderInputField('Emergency Contact 2', 'emergencyContact2')}
                </>
              ) : (
                <>
                  {renderDisplayField('Full Name', `${client.profile.firstName} ${client.profile.middleInitial || ''} ${client.profile.lastName}`)}
                  {renderDisplayField('DOB / Age', `${client.profile.dob || 'N/A'} (Age ${client.profile.age || 'N/A'})`)}
                  {renderDisplayField('SSN (Last 4)', client.profile.last4SSN)}
                  {renderDisplayField('Phone', client.contactInfo.phone)}
                  {renderDisplayField('Email', client.contactInfo.email)}
                  {renderDisplayField('Address', `${client.contactInfo.street}, ${client.contactInfo.city}, ${client.contactInfo.state} ${client.contactInfo.zip}`)}
                  {renderDisplayField('Referral Source', client.referralSource)}
                  {renderDisplayField('Emergency Contact 1', client.enrollmentIntake?.emergencyContact1)}
                  {renderDisplayField('Emergency Contact 2', client.enrollmentIntake?.emergencyContact2)}
                </>
              )}
            </div>
          </fieldset>

          {/* ---------------------------------------------------------------------------------- */}
          {/* Section 2: Household and Employment Information (NEW SECTION) */}
          {/* ---------------------------------------------------------------------------------- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">2. Household and Employment Information</legend>
            
            <div className={`grid gap-4 ${isEditing ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
                {/* Employment Status */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Residency/Employment Status</h4>
                    {isEditing ? (
                        <div className="space-y-1">
                            <div className="flex items-center">
                                <input type="checkbox" name="isShastaCountyResident" checked={formData.isShastaCountyResident} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
                                <label className="ml-2 text-sm text-gray-700">Shasta County Resident</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" name="isCurrentlyEmployed" checked={formData.isCurrentlyEmployed} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
                                <label className="ml-2 text-sm text-gray-700">Currently Employed</label>
                            </div>
                        </div>
                    ) : (
                        <>
                            {renderDisplayField('Shasta County Resident', client.enrollmentIntake?.isShastaCountyResident)}
                            {renderDisplayField('Currently Employed', client.enrollmentIntake?.isCurrentlyEmployed)}
                        </>
                    )}
                </div>

                {/* Public Assistance */}
                {isEditing ? (
                    <div className="md:col-span-1">
                        {renderCheckboxGroup("Receiving Public Assistance", PUBLIC_ASSISTANCE_MAP as any, formData.enrollmentIntake as any, 'paOther')}
                    </div>
                ) : (
                    <div className="md:col-span-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Receiving Public Assistance</h4>
                        <p className="text-sm text-gray-800">
                            {(PUBLIC_ASSISTANCE_MAP.filter(key => client.enrollmentIntake?.[key]).map(key => PUBLIC_ASSISTANCE_MAP.find(m => m.key === key)?.label || key.replace(/pa/g, '').replace(/([A-Z])/g, ' $1').trim()).join(', ') || 'None reported')}
                            {client.enrollmentIntake?.paOther && (client.enrollmentIntake?.paOther.length > 0) && (
                                <> ({client.enrollmentIntake.paOther})</>
                            )}
                        </p>
                    </div>
                )}
            </div>

            {/* Employment Barriers (Demographics & Intake Barriers) */}
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 mt-6 mb-4">Demographics and Barriers</h4>
            <div className={`grid gap-4 ${isEditing ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              
              {isEditing ? (
                <>
                  {renderSelectField('Gender', 'gender', GENDER_OPTIONS, true)}
                  {renderSelectField('Race/Ethnicity', 'raceEthnicity', RACE_ETHNICITY_OPTIONS, true)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Self-Certify Income</label>
                    <input
                      type="checkbox"
                      name="selfCertificationAnnualIncome"
                      checked={formData.selfCertificationAnnualIncome}
                      onChange={handleChange}
                      className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B] mt-2"
                    />
                    <span className="ml-2 text-sm text-gray-700">Self-Certified (LMI Eligibility)</span>
                  </div>
                </>
              ) : (
                <>
                  {renderDisplayField('Gender', client.demographicsAndBarriers.gender)}
                  {renderDisplayField('Race/Ethnicity', client.demographicsAndBarriers.raceEthnicity)}
                  {renderDisplayField('Self-Certify Income', client.demographicsAndBarriers.selfCertificationAnnualIncome)}
                </>
              )}
            </div>
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 mt-6 mb-4">Employment Barriers (from Intake Form)</h4>
            {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Maps to ClientEnrollmentIntake */}
                    {renderCheckboxGroup("Barriers to Employment", EMPLOYMENT_BARRIERS_MAP as any, formData.enrollmentIntake as any, 'ebOther')}
                </div>
            ) : (
                <div className="text-sm text-gray-800">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Barriers to Employment</h4>
                    <p className="text-sm text-gray-800">
                        {(EMPLOYMENT_BARRIERS_MAP.filter(key => client.enrollmentIntake?.[key]).map(key => EMPLOYMENT_BARRIERS_MAP.find(m => m.key === key)?.label || key.replace(/eb/g, '').replace(/([A-Z])/g, ' $1').trim()).join(', ') || 'None reported')}
                         {client.enrollmentIntake?.ebOther && (client.enrollmentIntake?.ebOther.length > 0) && (
                            <> (Other: {client.enrollmentIntake.ebOther})</>
                        )}
                    </p>
                </div>
            )}

            {/* Grant-Defined Barriers (from DemographicsAndBarriers) */}
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1 mt-6 mb-4">Grant-Specific Barrier Flags</h4>
             {isEditing ? (
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Maps to DemographicsAndBarriers */}
                    {renderCheckboxGroup("Grant Barrier Flags", DEMOGRAPHICS_BARRIERS_MAP as any, formData.demographicsAndBarriers as any)}
                </div>
            ) : (
                <div className="text-sm text-gray-800">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Grant Barrier Flags</h4>
                    <p className="text-sm text-gray-800">
                        {(DEMOGRAPHICS_BARRIERS_MAP.filter(item => client.demographicsAndBarriers[item.key]).map(item => item.label).join(', ') || 'None reported')}
                    </p>
                </div>
            )}
          </fieldset>
          
          {/* ---------------------------------------------------------------------------------- */}
          {/* Section 3: Education & Training Interests (NEW SECTION) */}
          {/* ---------------------------------------------------------------------------------- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">3. Education & Training Interests</legend>
            
            <div className={`grid gap-4 ${isEditing ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                {/* Education Level */}
                {isEditing ? (
                    <div className="md:col-span-1">
                        {renderCheckboxGroup("Education Level", EDUCATION_LEVELS_MAP as any, formData.enrollmentIntake as any, 'edOther')}
                    </div>
                ) : (
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Highest Education Level</h4>
                        <p className="text-sm text-gray-800">
                            {(EDUCATION_LEVELS_MAP.filter(key => client.enrollmentIntake?.[key]).map(key => EDUCATION_LEVELS_MAP.find(m => m.key === key)?.label || key.replace(/ed/g, '').replace(/([A-Z])/g, ' $1').trim()).join(', ') || 'None reported')}
                            {client.enrollmentIntake?.edOther && (client.enrollmentIntake?.edOther.length > 0) && (
                                <> (Other: {client.enrollmentIntake.edOther})</>
                            )}
                        </p>
                    </div>
                )}

                {/* Training Interests */}
                <div className="md:col-span-2 space-y-4">
                    {isEditing ? (
                        <>
                            <div>
                                <label htmlFor="jobCareerInterest" className="block text-sm font-medium text-gray-700">Job / Career Interest</label>
                                <input type="text" name="jobCareerInterest" id="jobCareerInterest" value={formData.jobCareerInterest} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <input type="checkbox" name="currentlyEnrolled" checked={formData.currentlyEnrolled} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
                                    <label className="ml-2 text-sm text-gray-700">Currently Enrolled (School/Training)</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" name="hasResume" checked={formData.hasResume} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
                                    <label className="ml-2 text-sm text-gray-700">Has Resume</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" name="wantJobTraining" checked={formData.wantJobTraining} onChange={handleChange} className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B]" />
                                    <label className="ml-2 text-sm text-gray-700">Want Job Training</label>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            {renderDisplayField('Job / Career Interest', client.enrollmentIntake?.jobCareerInterest)}
                            {renderDisplayField('Currently Enrolled', client.enrollmentIntake?.currentlyEnrolled)}
                            {renderDisplayField('Has Resume', client.enrollmentIntake?.hasResume)}
                            {renderDisplayField('Want Job Training', client.enrollmentIntake?.wantJobTraining)}
                        </div>
                    )}
                </div>
            </div>
          </fieldset>
          
          {/* ---------------------------------------------------------------------------------- */}
          {/* Section 4: Support Services (NEW SECTION) */}
          {/* ---------------------------------------------------------------------------------- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">4. Support Services</legend>
            
            {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {renderCheckboxGroup("Support Types Desired", SUPPORT_SERVICES_MAP as any, formData.enrollmentIntake as any, 'ssOther')}
                </div>
            ) : (
                <div className="text-sm text-gray-800">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Support Types Desired</h4>
                    <p className="text-sm text-gray-800">
                        {(SUPPORT_SERVICES_MAP.filter(key => client.enrollmentIntake?.[key]).map(key => SUPPORT_SERVICES_MAP.find(m => m.key === key)?.label || key.replace(/ss/g, '').replace(/([A-Z])/g, ' $1').trim()).join(', ') || 'None requested')}
                         {client.enrollmentIntake?.ssOther && (client.enrollmentIntake?.ssOther.length > 0) && (
                            <> (Other: {client.enrollmentIntake.ssOther})</>
                        )}
                    </p>
                </div>
            )}
          </fieldset>


          {/* ---------------------------------------------------------------------------------- */}
          {/* Section 5: Program Status & Financials (Moved to Section 5) */}
          {/* ---------------------------------------------------------------------------------- */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-md font-medium text-gray-700 px-1">5. Program Status & Financials</legend>
            <div className={`grid gap-4 ${isEditing ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                {isEditing ? (
                    <>
                        {renderInputField('Date Application', 'dateApplication', 'date')}
                        {renderInputField('Age at Enrollment', 'ageAtEnrollment', 'number')}
                        <div>
                            <label htmlFor="financialServiceLevel" className="block text-sm font-medium text-gray-700">Financial Service Level</label>
                            <select name="financialServiceLevel" id="financialServiceLevel" value={formData.financialServiceLevel} onChange={handleChange} className="form-input">
                                <option value="">Select...</option>
                                {FINANCIAL_SERVICE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Program Completer?</label>
                            <input
                                type="checkbox"
                                name="programCompleter"
                                checked={formData.programCompleter}
                                onChange={handleChange}
                                className="h-4 w-4 text-[#404E3B] border-gray-300 rounded focus:ring-[#404E3B] mt-2"
                            />
                            <span className="ml-2 text-sm text-gray-700">Completed Program</span>
                        </div>
                        {formData.programCompleter && renderInputField('Date Withdrew', 'dateWithdrew', 'date')}
                    </>
                ) : (
                    <>
                        {renderDisplayField('Date Application', client.metadata.dateApplication)}
                        {renderDisplayField('Age at Enrollment', client.profile.ageAtEnrollment)}
                        {renderDisplayField('Financial Service Level', client.metadata.financialServiceLevel)}
                        {renderDisplayField('Program Completer', client.metadata.programCompleter)}
                        {client.metadata.dateWithdrew && renderDisplayField('Date Withdrew', client.metadata.dateWithdrew)}
                    </>
                )}
            </div>
          </fieldset>
          
        </div>
      </form>
      <style>{`
          .form-input { display: block; width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; }
          .form-input:focus { outline: none; border-color: #404E3B; box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3); }
      `}</style>
    </Card>
  );
};

export default EnrollmentIntakeSection;