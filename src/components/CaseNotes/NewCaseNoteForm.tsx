import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CaseNote } from '../../types';
import api from '../../lib/firebase';
import { Bold, Italic, List } from 'lucide-react';
import Card from '../Card';

interface NewCaseNoteFormProps {
    clientId: string;
    onSave: () => void;
    onCancel?: () => void;
    noteToEdit?: CaseNote | null;
}

const NewCaseNoteForm: React.FC<NewCaseNoteFormProps> = ({ clientId, onSave, onCancel, noteToEdit }) => {
    const { user } = useAuth();
    const isEditing = !!noteToEdit;

    // Helper to get today's date as YYYY-MM-DD in local timezone
    const getTodayString = () => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const todayWithOffset = new Date(today.getTime() - (offset * 60 * 1000));
        return todayWithOffset.toISOString().split('T')[0];
    };

    const [noteDate, setNoteDate] = useState<string>(getTodayString());
    const [noteType, setNoteType] = useState<CaseNote['noteType']>('Case Note');
    const [urgency, setUrgency] = useState<CaseNote['urgency']>('Green');
    const [serviceType, setServiceType] = useState<CaseNote['serviceType']>('General Check-in');
    const [contactMethod, setContactMethod] = useState<CaseNote['contactMethod']>('Hartnell Office');
    const [durationMinutes, setDurationMinutes] = useState<number>(15);
    const [attachments, setAttachments] = useState<{ fileName: string; storageUrl: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setNoteDate(getTodayString());
        setNoteType('Case Note');
        setUrgency('Green');
        setServiceType('General Check-in');
        setContactMethod('Hartnell Office');
        setDurationMinutes(15);
        setAttachments([]);
        if (editorRef.current) editorRef.current.innerHTML = '';
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    useEffect(() => {
        if (isEditing && noteToEdit) {
            const noteDateAsDate = new Date(noteToEdit.noteDate);
            const offset = noteDateAsDate.getTimezoneOffset();
            const dateWithOffset = new Date(noteDateAsDate.getTime() - (offset * 60 * 1000));
            setNoteDate(dateWithOffset.toISOString().split('T')[0]);
            setNoteType(noteToEdit.noteType);
            setUrgency(noteToEdit.urgency);
            setServiceType(noteToEdit.serviceType);
            setContactMethod(noteToEdit.contactMethod);
            setDurationMinutes(noteToEdit.durationMinutes);
            setAttachments(noteToEdit.attachments || []);
            if (editorRef.current) {
                editorRef.current.innerHTML = noteToEdit.noteBody;
            }
        } else {
            resetForm();
        }
    }, [noteToEdit, isEditing]);


    if (user?.role !== 'admin') {
        return null; // Don't render form for non-admins
    }

    const handleFormat = (command: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // FIX: Explicitly type `file` as `File` to resolve type inference issue.
            const newFiles = Array.from(e.target.files).map((file: File) => ({
                fileName: file.name,
                storageUrl: `gs://chwrtp-files/caseNoteFiles/${clientId}/note_id_placeholder/${file.name}` // Mock URL
            }));
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const noteBody = editorRef.current?.innerHTML || '';
        if (!noteBody.trim() || !user) return;

        setSubmitting(true);

        try {
            const timestamp = new Date(noteDate + 'T00:00:00').getTime();
            if (isEditing && noteToEdit) {
                const updatedNote: CaseNote = {
                    ...noteToEdit,
                    noteType,
                    urgency,
                    serviceType,
                    contactMethod,
                    durationMinutes,
                    noteBody,
                    attachments,
                    staffId: user.uid,
                    staffName: user.name,
                    noteDate: timestamp,
                };
                await api.updateCaseNote(updatedNote);
            } else {
                const newNoteData = {
                    clientId,
                    staffId: user.uid,
                    staffName: user.name,
                    noteDate: timestamp,
                    noteType,
                    urgency,
                    serviceType,
                    contactMethod,
                    durationMinutes,
                    noteBody,
                    attachments,
                };
                await api.addCaseNote(newNoteData);
            }
            resetForm();
            onSave();
        } catch (error) {
            console.error("Failed to save case note:", error);
            alert("Error: Could not save case note.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card title={isEditing ? 'Edit Case Note' : 'Add New Case Note'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Note Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Note Date</label>
                        <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} className="form-input" required />
                    </div>
                    {/* Note Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Note Type</label>
                        <select value={noteType} onChange={e => setNoteType(e.target.value as CaseNote['noteType'])} className="form-input">
                            <option>Case Note</option>
                            <option>Contact Note</option>
                        </select>
                    </div>
                    {/* Urgency */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Urgency</label>
                        <select value={urgency} onChange={e => setUrgency(e.target.value as CaseNote['urgency'])} className="form-input">
                            <option value="Green">Green (Normal)</option>
                            <option value="Yellow">Yellow (Review)</option>
                            <option value="Red">Red (Urgent)</option>
                        </select>
                    </div>
                    {/* Service Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Service Type</label>
                        <select value={serviceType} onChange={e => setServiceType(e.target.value as CaseNote['serviceType'])} className="form-input">
                            <option>Job Search</option>
                            <option>Supportive Service</option>
                            <option>Training</option>
                            <option>Intake Meeting</option>
                            <option>ISP Review</option>
                            <option>General Check-in</option>
                        </select>
                    </div>
                    {/* Contact Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Method</label>
                        <select value={contactMethod} onChange={e => setContactMethod(e.target.value as CaseNote['contactMethod'])} className="form-input">
                            <option>Hartnell Office</option>
                            <option>CHYBA Office</option>
                            <option>Offsite</option>
                            <option>Phone</option>
                            <option>Text Message</option>
                            <option>Email</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                {/* Rich Text Editor */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Note Body</label>
                    <div className="mt-1 border border-gray-300 rounded-md">
                        <div className="flex items-center p-2 border-b bg-gray-50 space-x-2 rounded-t-md">
                            <button type="button" onClick={() => handleFormat('bold')} className="p-1.5 rounded hover:bg-gray-200"><Bold className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleFormat('italic')} className="p-1.5 rounded hover:bg-gray-200"><Italic className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 rounded hover:bg-gray-200"><List className="w-4 h-4" /></button>
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable
                            className="p-3 min-h-[120px] focus:outline-none"
                            aria-label="Note body editor"
                        ></div>
                    </div>
                </div>

                {/* Duration and Attachments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Duration (Minutes)</label>
                        <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value, 10))} className="form-input" min="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Attachments</label>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="form-input text-sm p-1.5" />
                    </div>
                </div>

                {attachments.length > 0 && (
                    <div className="text-sm text-gray-600">
                        <p className="font-medium">Selected files:</p>
                        <ul className="list-disc list-inside">
                            {attachments.map((file, i) => <li key={i}>{file.fileName}</li>)}
                        </ul>
                    </div>
                )}


                <div className="flex justify-end space-x-2">
                    {isEditing && onCancel && (
                        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            Cancel
                        </button>
                    )}
                    <button type="submit" disabled={submitting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B] disabled:bg-[#8d9b89]">
                        {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Note')}
                    </button>
                </div>
            </form>
            <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid #D1D5DB;
                    border-radius: 0.375rem;
                    background-color: #fff;
                    transition: border-color 0.2s;
                    margin-top: 0.25rem;
                }
                .form-input:focus {
                    outline: none;
                    border-color: #404E3B;
                    box-shadow: 0 0 0 2px rgba(64, 78, 59, 0.3);
                }
            `}</style>
        </Card>
    );
};

export default NewCaseNoteForm;