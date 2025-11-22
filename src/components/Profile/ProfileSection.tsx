import React from 'react';
import Card from '../Card';
import AttachmentsSection from '../Attachments/AttachmentsSection';
import { useAuth } from '../../context/AuthContext';
import { Edit, Printer } from 'lucide-react';

interface ProfileSectionProps {
    clientId: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ clientId }) => {
    const { user } = useAuth();
    
    const handleEdit = () => {
        alert("Edit Profile functionality coming soon.");
    };

    const handlePrint = () => {
        const printableElement = document.getElementById('profile-printable-area');
        if (printableElement) {
            printableElement.classList.add('printable');
            window.print();
            printableElement.classList.remove('printable');
        }
    };

    return (
        <div className="space-y-6">
            <Card
                title="Client Profile Details"
                titleAction={
                    <div className="flex items-center space-x-2 no-print">
                         <button
                            onClick={handlePrint}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Profile
                        </button>
                        {user?.role === 'admin' && (
                            <button
                                onClick={handleEdit}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-[#404E3B] bg-[#E6E6E6] hover:bg-[#f2f2f2]"
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                }
            >
                 <div id="profile-printable-area">
                    <div className="text-center py-20 text-gray-500">
                        Detailed client profile view coming soon.
                    </div>
                </div>
            </Card>
            <AttachmentsSection clientId={clientId} showList={false} />
        </div>
    );
};

export default ProfileSection;