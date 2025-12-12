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

    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeSourceId, setMergeSourceId] = useState('');
    const [mergeTargetId, setMergeTargetId] = useState('');
    const [mergeStatus, setMergeStatus] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', email: '', role: 'viewer' as AppUser['role'], title: '' });

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

    const handleMergeUsers = async () => {
        if (!mergeSourceId || !mergeTargetId) {
            alert("Please select both a source and target user.");
            return;
        }
        if (mergeSourceId === mergeTargetId) {
            alert("Source and Target users cannot be the same.");
            return;
        }

        if (!window.confirm(`Are you sure you want to merge all data from the Source user to the Target user? This action cannot be undone.`)) {
            return;
        }

        setMergeStatus("Merging...");
        try {
            const result = await api.mergeUserData(mergeSourceId, mergeTargetId);
            setMergeStatus(`Merge Complete! Moved: ${result.clients} clients, ${result.tasks} tasks, ${result.notes} notes, ${result.workshops} workshops.`);
            alert(`Merge Successful!\n\nMoved:\n- ${result.clients} Clients\n- ${result.tasks} Tasks\n- ${result.notes} Notes\n- ${result.workshops} Workshops\n\nYou can now safely delete the empty Source user.`);
            setShowMergeModal(false);
            setMergeSourceId('');
            setMergeTargetId('');
            setMergeStatus(null);
            fetchUsers(); // Refresh to see any updates (though user list shouldn't change yet)
        } catch (error) {
            console.error("Merge failed:", error);
            setMergeStatus("Merge Failed. Check console.");
            alert("Merge failed. Please check the console for details.");
        }
    };

    const handleAddUser = async () => {
        if (!addForm.name || !addForm.email) {
            alert("Name and Email are required.");
            return;
        }

        try {
            await api.createUser(addForm);
            alert("User created successfully!");
            setShowAddModal(false);
            setAddForm({ name: '', email: '', role: 'viewer', title: '' });
            fetchUsers();
        } catch (error: any) {
            console.error("Failed to create user:", error);
            alert("Failed to create user: " + (error.message || error));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div className="p-6">Loading users...</div>;

    if (currentUser?.title !== 'Administrator') {
        return <div className="p-6 text-red-600">Access Denied. Admin permissions required.</div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                <button
                    onClick={() => setShowMergeModal(true)}
                    className="bg-[#404E3B] text-white px-4 py-2 rounded hover:bg-[#333f2f] flex items-center"
                >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Merge Users
                </button>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center ml-4"
                >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add User
                </button>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-white p-5 rounded-lg shadow-xl w-96">
                        <h2 className="text-xl font-bold mb-4">Add New User</h2>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                            <input
                                type="text"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={addForm.name}
                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                placeholder="Full Name"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                            <input
                                type="email"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={addForm.email}
                                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                placeholder="email@example.com"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Title</label>
                            <input
                                type="text"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={addForm.title}
                                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                                placeholder="e.g. Case Manager"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Role</label>
                            <select
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={addForm.role}
                                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as AppUser['role'] })}
                            >
                                <option value="viewer">Viewer</option>
                                <option value="admin">Admin</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Add User
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Merge Modal */}
            {
                showMergeModal && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                        <div className="bg-white p-5 rounded-lg shadow-xl w-96">
                            <h2 className="text-xl font-bold mb-4">Merge User Accounts</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Move all data from one user to another. Useful for fixing duplicate accounts.
                            </p>

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">From (Source)</label>
                                <select
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={mergeSourceId}
                                    onChange={(e) => setMergeSourceId(e.target.value)}
                                >
                                    <option value="">Select Source User</option>
                                    {users.map(u => (
                                        <option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">To (Target)</label>
                                <select
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={mergeTargetId}
                                    onChange={(e) => setMergeTargetId(e.target.value)}
                                >
                                    <option value="">Select Target User</option>
                                    {users.map(u => (
                                        <option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            {mergeStatus && (
                                <div className="mb-4 text-sm font-semibold text-blue-600">
                                    {mergeStatus}
                                </div>
                            )}

                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setShowMergeModal(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMergeUsers}
                                    disabled={!!mergeStatus && mergeStatus === "Merging..."}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Merge Data
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

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
        </div >
    );
};

export default UsersPage;
