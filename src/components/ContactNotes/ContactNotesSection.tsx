import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/firebase';
import { CaseNote } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Save, Loader2, Edit2, X, Check } from 'lucide-react';

interface ContactNotesSectionProps {
    clientId: string;
}

const ContactNotesSection: React.FC<ContactNotesSectionProps> = ({ clientId }) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState<CaseNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // New Note State
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteDate, setNewNoteDate] = useState<string>('');
    const [newNoteStaffId, setNewNoteStaffId] = useState('');

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        date: string;
        text: string;
        staffId: string;
    }>({ date: '', text: '', staffId: '' });

    // Staff Data
    const [staffMembers, setStaffMembers] = useState<{ uid: string; name: string }[]>([]);

    // Helper to get initials
    const getInitials = (name: string) => {
        if (!name) return '';
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);
    };

    // Initialize defaults
    useEffect(() => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const todayWithOffset = new Date(today.getTime() - (offset * 60 * 1000));
        setNewNoteDate(todayWithOffset.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (user && !newNoteStaffId) {
            setNewNoteStaffId(user.uid);
        }
    }, [user, newNoteStaffId]);

    const fetchStaff = useCallback(async () => {
        try {
            const staff = await api.getStaffUsers();
            setStaffMembers(staff.map(s => ({ uid: s.uid, name: s.name })));
        } catch (error) {
            console.error("Failed to fetch staff members", error);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const allNotes = await api.getCaseNotesByClientId(clientId);
            // Filter for Contact Notes only
            const contactNotes = allNotes.filter(n => n.noteType === 'Contact Note');
            // Sort by date ascending (oldest first) as per requirement image
            setNotes(contactNotes.sort((a, b) => b.noteDate - a.noteDate));
        } catch (error) {
            console.error("Error fetching contact notes:", error);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleSaveNew = async () => {
        if (!newNoteText.trim() || !user || !newNoteDate) return;

        setIsSaving(true);
        try {
            const selectedStaff = staffMembers.find(s => s.uid === newNoteStaffId) || { uid: user.uid, name: user.name || 'Unknown' };
            const timestamp = new Date(newNoteDate + 'T12:00:00').getTime(); // Use noon to avoid timezone shift issues on date only

            const newNote: Omit<CaseNote, 'id'> = {
                clientId,
                staffId: selectedStaff.uid,
                staffName: selectedStaff.name,
                noteDate: timestamp,
                noteType: 'Contact Note',
                urgency: 'Green',
                serviceType: 'General Check-in',
                contactMethod: 'Other',
                durationMinutes: 0,
                noteBody: newNoteText,
                attachments: []
            };

            await api.addCaseNote(newNote);
            setNewNoteText('');
            // Reset date to today? Maybe keep it. Let's keep it.
            fetchNotes();
        } catch (error) {
            console.error("Error saving contact note:", error);
            alert("Failed to save note. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditClick = (note: CaseNote) => {
        const noteDate = new Date(note.noteDate);
        const offset = noteDate.getTimezoneOffset();
        const dateWithOffset = new Date(noteDate.getTime() - (offset * 60 * 1000));

        setEditingId(note.id);
        setEditForm({
            date: dateWithOffset.toISOString().split('T')[0],
            text: note.noteBody,
            staffId: note.staffId
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ date: '', text: '', staffId: '' });
    };

    const handleUpdateNote = async (noteId: string) => {
        if (!editForm.text.trim()) return;

        // Optimistic update or wait? Let's wait.
        try {
            // We need the original note to preserve other fields
            const originalNote = notes.find(n => n.id === noteId);
            if (!originalNote) return;

            const selectedStaff = staffMembers.find(s => s.uid === editForm.staffId) || { uid: originalNote.staffId, name: originalNote.staffName };
            const timestamp = new Date(editForm.date + 'T12:00:00').getTime();

            const updatedNote: CaseNote = {
                ...originalNote,
                noteBody: editForm.text,
                noteDate: timestamp,
                staffId: selectedStaff.uid,
                staffName: selectedStaff.name
            };

            await api.updateCaseNote(updatedNote);
            setEditingId(null);
            fetchNotes();
        } catch (error) {
            console.error("Error updating note:", error);
            alert("Failed to update note.");
        }
    };

    const handleKeyDownNew = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveNew();
        }
    };

    const handleKeyDownEdit = (e: React.KeyboardEvent, noteId: string) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUpdateNote(noteId);
        }
        if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };


    if (loading) return <div className="p-4 text-center">Loading contact notes...</div>;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="overflow-visible">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Notes
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                Staff
                            </th>
                            <th scope="col" className="relative px-6 py-3 w-16">
                                <span className="sr-only">Edit</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {notes.map((note) => {
                            const isEditing = editingId === note.id;
                            return (
                                <tr key={note.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-top">
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#404E3B] focus:border-[#404E3B] text-sm"
                                            />
                                        ) : (
                                            new Date(note.noteDate).toLocaleDateString()
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-pre-wrap align-top">
                                        {isEditing ? (
                                            <textarea
                                                value={editForm.text}
                                                onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                                                onKeyDown={(e) => handleKeyDownEdit(e, note.id)}
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm"
                                                rows={3}
                                            />
                                        ) : (
                                            note.noteBody
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                        {isEditing ? (
                                            <select
                                                value={editForm.staffId}
                                                onChange={e => setEditForm({ ...editForm, staffId: e.target.value })}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#404E3B] focus:border-[#404E3B] text-sm"
                                            >
                                                {staffMembers.map(member => (
                                                    <option key={member.uid} value={member.uid}>
                                                        {getInitials(member.name)}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            getInitials(note.staffName)
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                        {isEditing ? (
                                            <div className="flex space-x-2 justify-end">
                                                <button onClick={() => handleUpdateNote(note.id)} className="text-[#404E3B] hover:text-[#2d3829]">
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-500">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditClick(note)} className="text-gray-400 hover:text-gray-500">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Input Row */}
                        <tr className="bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                <input
                                    type="date"
                                    value={newNoteDate}
                                    onChange={e => setNewNoteDate(e.target.value)}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#404E3B] focus:border-[#404E3B] text-sm"
                                />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                <div className="relative">
                                    <textarea
                                        value={newNoteText}
                                        onChange={(e) => setNewNoteText(e.target.value)}
                                        onKeyDown={handleKeyDownNew}
                                        placeholder="Type a new note..."
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm resize-none"
                                        rows={2}
                                        disabled={isSaving}
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            onClick={handleSaveNew}
                                            disabled={!newNoteText.trim() || isSaving}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-[#404E3B] hover:bg-[#2d3829] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                <select
                                    value={newNoteStaffId}
                                    onChange={e => setNewNoteStaffId(e.target.value)}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#404E3B] focus:border-[#404E3B] text-sm"
                                >
                                    {staffMembers.map(member => (
                                        <option key={member.uid} value={member.uid}>
                                            {getInitials(member.name)}
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                {/* Spacer for edit column */}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ContactNotesSection;
