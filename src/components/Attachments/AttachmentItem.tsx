import React from 'react';
import { ClientAttachment } from '../../types';
import { FileText, FileImage, File as FileIcon, Download, Trash2 } from 'lucide-react';

interface AttachmentItemProps {
    attachment: ClientAttachment;
    onDelete?: (attachment: ClientAttachment) => void;
}

const FileTypeIcon: React.FC<{ fileType: string }> = ({ fileType }) => {
    const lowerType = fileType.toLowerCase();
    if (lowerType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />;
    if (lowerType.includes('image')) return <FileImage className="h-8 w-8 text-blue-500 flex-shrink-0" />;
    return <FileIcon className="h-8 w-8 text-gray-500 flex-shrink-0" />;
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const AttachmentItem: React.FC<AttachmentItemProps> = ({ attachment, onDelete }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100">
            <div className="flex items-center space-x-4 min-w-0">
                <FileTypeIcon fileType={attachment.fileType} />
                <div className="min-w-0">
                    <a href={attachment.storageUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 truncate hover:text-[#404E3B] hover:underline">
                        {attachment.fileName}
                    </a>
                    <p className="text-xs text-gray-500">
                        Uploaded by {attachment.uploadedBy} on {new Date(attachment.uploadDate).toLocaleDateString()} &bull; {formatBytes(attachment.fileSize)}
                    </p>
                </div>
            </div>
            <div className="flex items-center">
                <a
                    href={attachment.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-[#404E3B] flex-shrink-0 ml-2"
                    aria-label={`Download ${attachment.fileName}`}
                >
                    <Download className="h-5 w-5" />
                </a>
                {onDelete && (
                    <button
                        onClick={() => onDelete(attachment)}
                        className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 flex-shrink-0 ml-2"
                        aria-label={`Delete ${attachment.fileName}`}
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AttachmentItem;