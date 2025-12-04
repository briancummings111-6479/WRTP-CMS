import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/firebase';
import { CaseNote } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Save, Loader2 } from 'lucide-react';

interface ContactNotesSectionProps {
    clientId: string;
}

const ContactNotesSection: React.FC<ContactNotesSectionProps> = ({ clientId }) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState<CaseNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNoteText, setNewNoteText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const allNotes = await api.getCaseNotesByClientId(clientId);
            // Filter for Contact Notes only
            const contactNotes = allNotes.filter(n => n.noteType === 'Contact Note');
            // Sort by date descending (newest first) for the list, 
            // but the requirement image shows a running list which usually implies chronological or reverse chronological.
            // The image shows dates 9/22, 9/24, 10.9, 10.13... so it's chronological (oldest at top).
            // However, typical "running lists" often put newest at top or bottom.
            // Let's stick to the image which shows chronological order (oldest first).
            setNotes(contactNotes.sort((a, b) => a.noteDate - b.noteDate));
        } catch (error) {
            console.error("Error fetching contact notes:", error);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleSave = async () => {
        if (!newNoteText.trim() || !user) return;

        setIsSaving(true);
        try {
            const newNote: Omit<CaseNote, 'id'> = {
                clientId,
                staffId: user.uid,
                staffName: user.name || user.email || 'Unknown',
                noteDate: Date.now(),
                noteType: 'Contact Note',
                urgency: 'Green', // Default
                serviceType: 'General Check-in', // Default or maybe we need a specific one?
                contactMethod: 'Other', // Default
                durationMinutes: 0,
                noteBody: newNoteText,
                attachments: []
            };

            await api.addCaseNote(newNote);
            setNewNoteText('');
            fetchNotes(); // Refresh list
        } catch (error) {
            console.error("Error saving contact note:", error);
            alert("Failed to save note. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    if (loading) return <div className="p-4 text-center">Loading contact notes...</div>;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Notes
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                                Staff
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {notes.map((note) => (
                            <tr key={note.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-top">
                                    {new Date(note.noteDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 whitespace-pre-wrap align-top">
                                    {note.noteBody}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                    {note.staffName}
                                </td>
                            </tr>
                        ))}
                        {/* Input Row */}
                        <tr className="bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                {new Date().toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 align-top">
                                <div className="relative">
                                    <textarea
                                        value={newNoteText}
                                        onChange={(e) => setNewNoteText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a new note..."
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#404E3B] focus:border-[#404E3B] sm:text-sm resize-none"
                                        rows={2}
                                        disabled={isSaving}
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            onClick={handleSave}
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
                                {user?.name || 'Me'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ContactNotesSection;
