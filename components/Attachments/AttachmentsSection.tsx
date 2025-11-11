import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/mockApi';
import { ClientAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Card from '../Card';
import AttachmentItem from './AttachmentItem';
import { UploadCloud, Paperclip } from 'lucide-react';

interface AttachmentsSectionProps {
    clientId: string;
    showList?: boolean;
}

const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ clientId, showList = true }) => {
    const { user } = useAuth();
    const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAttachments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getAttachmentsByClientId(clientId);
            setAttachments(data);
        } catch (error) {
            console.error("Failed to fetch attachments:", error);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && user) {
            const file = e.target.files[0];
            setUploading(true);
            try {
                const newAttachmentData = {
                    clientId,
                    fileName: file.name,
                    fileType: file.type || 'Unknown',
                    fileSize: file.size,
                    storageUrl: `gs://chwrtp-files/clientFiles/${clientId}/${file.name}`, // Mock URL
                    uploadedBy: user.name,
                    uploadDate: Date.now(),
                };
                await api.addClientAttachment(newAttachmentData);
                if (showList) {
                    await fetchAttachments(); // Refresh list
                } else {
                    alert(`"${file.name}" uploaded successfully. View it in the 'Files' tab.`);
                }
            } catch (error) {
                console.error("Failed to upload file:", error);
                alert("Upload failed. Please try again.");
            } finally {
                setUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''; // Reset file input
                }
            }
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
        <Card title="Attachments" titleAction={uploadButton}>
            {showList && (
                <>
                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Loading attachments...</div>
                    ) : attachments.length > 0 ? (
                        <div className="space-y-3">
                            {attachments.map(attachment => (
                                <AttachmentItem key={attachment.id} attachment={attachment} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No attachments</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by uploading a file.</p>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
};

export default AttachmentsSection;