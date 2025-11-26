import React, { useState, useEffect } from 'react';
import api from '../lib/firebase';
import { User as AppUser, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Edit, Trash2, Save, X, UserPlus } from 'lucide-react';

const UsersPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<AppUser>>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.getStaffUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user: AppUser) => {
        setEditingUserId(user.uid);
        setEditForm({ ...user });
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setEditForm({});
    };

    const handleSaveEdit = async () => {
        if (!editingUserId || !editForm) return;

        try {
            // Optimistic update
            setUsers(prev => prev.map(u => u.uid === editingUserId ? { ...u, ...editForm } : u));

            // API call
            // We need to cast editForm to AppUser, ensuring required fields exist.
            // In this context, we are merging with existing user so it should be safe, 
            // but let's be explicit.
            const userToUpdate = users.find(u => u.uid === editingUserId);
            if (userToUpdate) {
                await api.updateUser({ ...userToUpdate, ...editForm });
            }

            setEditingUserId(null);
            setEditForm({});
        } catch (error) {
            console.error("Failed to update user:", error);
            fetchUsers(); // Revert on error
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;

        try {
            setUsers(prev => prev.filter(u => u.uid !== uid));
            await api.deleteUser(uid);
        } catch (error) {
            console.error("Failed to delete user:", error);
            fetchUsers();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div className="p-6">Loading users...</div>;

    if (currentUser?.role !== 'admin') {
        return <div className="p-6 text-red-600">Access Denied. Admin permissions required.</div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                {/* Invite button could go here in future */}
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.uid}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingUserId === user.uid ? (
                                        <input
                                            type="text"
                                            name="name"
                                            value={editForm.name || ''}
                                            onChange={handleChange}
                                            className="border rounded px-2 py-1 w-full"
                                        />
                                    ) : (
                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingUserId === user.uid ? (
                                        <select
                                            name="role"
                                            value={editForm.role || 'viewer'}
                                            onChange={handleChange}
                                            className="border rounded px-2 py-1 w-full"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="viewer">Viewer</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    ) : (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' :
                                                user.role === 'viewer' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingUserId === user.uid ? (
                                        <input
                                            type="text"
                                            name="title"
                                            value={editForm.title || ''}
                                            onChange={handleChange}
                                            className="border rounded px-2 py-1 w-full"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-500">{user.title || '-'}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {editingUserId === user.uid ? (
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-900"><Save className="h-5 w-5" /></button>
                                            <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900"><X className="h-5 w-5" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end space-x-3">
                                            <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900"><Edit className="h-5 w-5" /></button>
                                            {/* Prevent deleting yourself */}
                                            {currentUser?.uid !== user.uid && (
                                                <button onClick={() => handleDeleteUser(user.uid)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersPage;
