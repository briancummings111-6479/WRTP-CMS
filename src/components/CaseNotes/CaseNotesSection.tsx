import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/mockApi';
import { CaseNote } from '../../types';
import CaseNoteItem from './CaseNoteItem';
import NewCaseNoteForm from './NewCaseNoteForm';
import { Printer } from 'lucide-react';

interface CaseNotesSectionProps {
    clientId: string;
    clientName: string;
}

const CaseNotesSection: React.FC<CaseNotesSectionProps> = ({ clientId, clientName }) => {
    const [notes, setNotes] = useState<CaseNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [noteToEdit, setNoteToEdit] = useState<CaseNote | null>(null);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        const notesData = await api.getCaseNotesByClientId(clientId);
        setNotes(notesData);
        setLoading(false);
    }, [clientId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const generatePrintHTMLForAllNotes = (notesToPrint: CaseNote[], nameOfClient: string): string => {
        const renderNoteHTML = (note: CaseNote) => `
            <div class="bg-white p-4 rounded-lg border border-gray-300 mb-4 break-inside-avoid">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-gray-800 text-lg">${note.noteType}</h4>
                        <div class="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span>Date: ${new Date(note.noteDate).toLocaleString()}</span>
                            <span>By: ${note.staffName}</span>
                        </div>
                    </div>
                    <div class="text-sm">
                        <span class="px-2.5 py-1 inline-flex items-center font-medium rounded-full bg-gray-100 text-gray-800">${note.urgency}</span>
                    </div>
                </div>
                <hr class="my-3"/>
                <div class="prose prose-sm max-w-none text-gray-700">${note.noteBody}</div>
                <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                    <span>Service: ${note.serviceType}</span>
                    <span>Contact: ${note.contactMethod}</span>
                    <span>Duration: ${note.durationMinutes} mins</span>
                </div>
            </div>
        `;

        const allNotesHTML = notesToPrint.map(renderNoteHTML).join('');

        return `
            <html>
            <head>
                <title>Case Note History - ${nameOfClient}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: sans-serif; }
                    .prose { max-width: 65ch; }
                    .break-inside-avoid { page-break-inside: avoid; }
                </style>
            </head>
            <body class="p-8 bg-gray-50">
                <header class="mb-6">
                    <h1 class="text-3xl font-bold">Case Note History</h1>
                    <h2 class="text-xl text-gray-700">${nameOfClient}</h2>
                </header>
                ${allNotesHTML}
            </body>
            </html>
        `;
    };

    const handlePrintAll = () => {
        const printContent = generatePrintHTMLForAllNotes(notes, clientName);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500); // Allow time for styles to load
        }
    };

    const handleStartEditing = (note: CaseNote) => {
        setNoteToEdit(note);
    };

    const handleCancelEditing = () => {
        setNoteToEdit(null);
    };

    const handleSaveNote = () => {
        setNoteToEdit(null);
        fetchNotes();
    };

    if (loading) {
        return <div>Loading notes...</div>;
    }

    return (
        <div className="space-y-6">
            {noteToEdit ? (
                <NewCaseNoteForm
                    clientId={clientId}
                    onSave={handleSaveNote}
                    noteToEdit={noteToEdit}
                    onCancel={handleCancelEditing}
                />
            ) : (
                <>
                    <NewCaseNoteForm clientId={clientId} onSave={handleSaveNote} />
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Note History</h3>
                            {notes.length > 0 && (
                                <button
                                    onClick={handlePrintAll}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 no-print"
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print All Notes
                                </button>
                            )}
                        </div>
                        {notes.length > 0 ? (
                            <div className="space-y-4">
                                {notes.map(note => (
                                    <CaseNoteItem 
                                        key={note.id} 
                                        note={note}
                                        onEdit={handleStartEditing}
                                        clientName={clientName}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                <p>No case notes have been added for this client yet.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CaseNotesSection;