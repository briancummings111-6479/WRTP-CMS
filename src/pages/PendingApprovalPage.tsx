import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Clock } from 'lucide-react';

const PendingApprovalPage: React.FC = () => {
    const { logout, user } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                        <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
                    <p className="text-gray-600 mb-6">
                        Hello, <span className="font-medium">{user?.name}</span>. Your account has been created and is currently pending administrator approval.
                    </p>
                    <p className="text-sm text-gray-500 mb-8">
                        You will receive an email once your account has been activated. If you believe this is an error, please contact the system administrator.
                    </p>

                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#404E3B] bg-[#E6E6E6] hover:bg-[#d1d1d1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#404E3B]"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
