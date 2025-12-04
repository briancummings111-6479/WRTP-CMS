import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/firebase';
import { ClientAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Card from '../Card';
import AttachmentItem from './AttachmentItem';
import { UploadCloud, Paperclip, FileUp } from 'lucide-react';

interface AttachmentsSectionProps {
    clientId: string;
    showList?: boolean;
    category?: string; // Optional category filter
}

const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ clientId, showList = true, category }) => {
    const { user } = useAuth();
    const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAttachments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getAttachmentsByClientId(clientId);
            // Filter by category if provided
            const filteredData = category
                ? data.filter(a => a.category === category)
                : data;

            // Sort alphabetically by fileName
            filteredData.sort((a, b) => a.fileName.localeCompare(b.fileName));

            setAttachments(filteredData);
        } catch (error) {
            console.error("Failed to fetch attachments:", error);
        } finally {
            setLoading(false);
        }
    }, [clientId, category]);

    useEffect(() => {
        if (showList) {
            fetchAttachments();
        } else {
            setLoading(false);
        }
    }, [fetchAttachments, showList]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const processFile = async (file: File) => {
        if (!user) return;
        setUploading(true);
        try {
            // 1. Upload file to Storage with timeout
            const uploadPromise = api.uploadClientFile(file, clientId);
            const timeoutPromise = new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error("Upload timed out")), 15000)
            );

            const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);

            // 2. Save metadata to Firestore
            const newAttachment: ClientAttachment = {
                id: crypto.randomUUID(), // Generate a unique ID
                clientId,
                fileName: file.name,
                fileType: file.type || 'Unknown',
                fileSize: file.size,
                storageUrl: downloadUrl,
                uploadedBy: user.name,
                uploadDate: Date.now(),
                category: category // Save with category if present
            };

            await api.addAttachment(newAttachment);

            if (showList) {
                await fetchAttachments(); // Refresh list
            } else {
                alert(`"${file.name}" uploaded successfully. View it in the 'Files' tab.`);
            }
        } catch (error: any) {
            console.error("Failed to upload file:", error);
            let errorMessage = "Upload failed. Please try again.";
            if (error.message === "Upload timed out") {
                errorMessage = "Upload timed out. This is often caused by CORS configuration on Firebase Storage when running locally. Please check your Firebase Console > Storage > Settings > CORS.";
            } else if (error.code === 'storage/unauthorized') {
                errorMessage = "Upload failed: Unauthorized. Check Firebase Storage rules.";
            } else {
                errorMessage = `Upload failed: ${error.message || error}`;
            }
            alert(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await processFile(e.target.files[0]);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset file input
            }
        }
    };

    const handleDeleteAttachment = async (attachment: ClientAttachment) => {
        if (!user || !window.confirm(`Are you sure you want to delete "${attachment.fileName}"? This action cannot be undone.`)) return;

        try {
            // 1. Delete from Storage
            await api.deleteClientFile(attachment.clientId, attachment.fileName);

            // 2. Delete from Firestore
            await api.deleteAttachment(attachment.id);

            // 3. Update local state
            setAttachments(prev => prev.filter(a => a.id !== attachment.id));
        } catch (error) {
            console.error("Failed to delete attachment:", error);
            alert("Failed to delete attachment. Please try again.");
        }
    };

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!uploading && user?.role === 'admin') {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (uploading || user?.role !== 'admin') return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Currently handling single file upload for simplicity, but could loop for multiple
            await processFile(e.dataTransfer.files[0]);
        }
    };

    const uploadButton = user?.role === 'admin' && (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
            />
            <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#404E3B] hover:bg-[#5a6c53] disabled:bg-[#8d9b89]"
            >
                <UploadCloud className="-ml-1 mr-2 h-5 w-5" />
                {uploading ? 'Uploading...' : 'Upload File'}
            </button>
        </>
    );

    return (
        <Card title={category ? `${category} Attachments` : "Attachments"} titleAction={uploadButton}>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative -m-4 sm:-m-6 p-4 sm:p-6 transition-colors duration-200 rounded-md ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
                    }`}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10 rounded-md pointer-events-none">
                        <FileUp className="h-12 w-12 text-blue-500 mb-2" />
                        <p className="text-lg font-medium text-blue-600">Drop file to upload</p>
                    </div>
                )}

                {showList && (
                    <>
                        {loading ? (
                            <div className="text-center py-10 text-gray-500">Loading attachments...</div>
                        ) : attachments.length > 0 ? (
                            <div className="space-y-3">
                                {attachments.map(attachment => (
                                    <AttachmentItem
                                        key={attachment.id}
                                        attachment={attachment}
                                        onDelete={user?.role === 'admin' ? handleDeleteAttachment : undefined}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No attachments</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {user?.role === 'admin' ? 'Upload a file or drag and drop here.' : 'No files available.'}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
};

export default AttachmentsSection;