import React from 'react';
import { CaseNote } from '../../types';
import { Clock, Calendar, User, Tag, Phone, Printer, Flame, AlertTriangle, Circle, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CaseNoteItemProps {
    note: CaseNote;
    onEdit: (note: CaseNote) => void;
    onDelete: (noteId: string) => void;
    clientName: string;
}

const UrgencyBadge: React.FC<{ urgency: CaseNote['urgency'] }> = ({ urgency }) => {
    const urgencyConfig = {
        Green: {
            styles: 'bg-green-100 text-green-800',
            icon: <Circle className="h-3 w-3 mr-1.5" />,
            text: 'Normal'
        },
        Yellow: {
            styles: 'bg-yellow-100 text-yellow-800',
            icon: <AlertTriangle className="h-3 w-3 mr-1.5" />,
            text: 'Medium'
        },
        Red: {
            styles: 'bg-red-100 text-red-800',
            icon: <Flame className="h-3 w-3 mr-1.5" />,
            text: 'High'
        },
    };
    const config = urgencyConfig[urgency];
    return (
        <span className={`px-2.5 py-1 inline-flex items-center text-xs font-medium rounded-full ${config.styles}`}>
            {config.icon}
            {config.text}
        </span>
    );
};


const CaseNoteItem: React.FC<CaseNoteItemProps> = ({ note, onEdit, onDelete, clientName }) => {
    const { user } = useAuth();
    const isStaffOrAdmin = user?.role === 'admin' || user?.role === 'staff' || (user?.role === 'viewer' && user?.title !== 'Applicant');

    const handleDelete = () => {
        // Use a simple confirm for now. The parent handles the actual API call.
        if (window.confirm("Are you sure you want to delete this case note? This action cannot be undone.")) {
            onDelete(note.id);
        }
    };

    const generatePrintHTML = (noteToPrint: CaseNote): string => {
        const renderNoteHTML = (note: CaseNote) => `
            <div class="bg-white p-4 rounded-lg border border-gray-300 mb-4 break-inside-avoid">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-gray-800 text-lg">${note.noteType}</h4>
                        <div class="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span>Date: ${new Date(note.noteDate).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}</span>
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

        return `
            <html>
            <head>
                <title>Case Note - ${clientName}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: sans-serif; }
                    .prose { max-width: 65ch; }
                </style>
            </head>
            <body class="p-8 bg-gray-50">
                <header class="mb-6">
                    <h1 class="text-3xl font-bold">Case Note</h1>
                    <h2 class="text-xl text-gray-700">${clientName}</h2>
                </header>
                ${renderNoteHTML(noteToPrint)}
            </body>
            </html>
        `;
    };

    const handlePrint = () => {
        const printContent = generatePrintHTML(note);
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

    // Function to auto-link URLs in text
    const linkify = (text: string) => {
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#404E3B] hover:underline">${url}</a>`);
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-gray-800">{note.noteType}</h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(note.noteDate).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}</span>
                        <span className="flex items-center"><User className="w-3 h-3 mr-1" />{note.staffName}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <UrgencyBadge urgency={note.urgency} />
                    {isStaffOrAdmin && (
                        <>
                            <button onClick={() => onEdit(note)} className="text-gray-400 hover:text-[#404E3B] no-print" aria-label="Edit note">
                                <Edit className="w-5 h-5" />
                            </button>
                            <button onClick={handleDelete} className="text-gray-400 hover:text-red-600 no-print" aria-label="Delete note">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </>
                    )}
                    <button onClick={handlePrint} className="text-gray-400 hover:text-[#404E3B] no-print" aria-label="Print note">
                        <Printer className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <hr className="my-3" />
            <div className="prose prose-sm max-w-none text-gray-700 break-all" dangerouslySetInnerHTML={{ __html: linkify(note.noteBody) }} />

            {note.attachments.length > 0 && (
                <div className="mt-3">
                    <h5 className="text-sm font-semibold text-gray-600">Attachments:</h5>
                    <ul className="list-disc list-inside text-sm mt-1">
                        {note.attachments.map((file, index) => (
                            <li key={index}>
                                <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="text-[#404E3B] hover:underline">{file.fileName}</a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center"><Tag className="w-3 h-3 mr-1.5" />Service: {note.serviceType}</span>
                <span className="flex items-center"><Phone className="w-3 h-3 mr-1.5" />{note.contactMethod}</span>
                <span className="flex items-center"><Clock className="w-3 h-3 mr-1.5" />{note.durationMinutes} mins</span>
            </div>
        </div>
    );
};

export default CaseNoteItem;