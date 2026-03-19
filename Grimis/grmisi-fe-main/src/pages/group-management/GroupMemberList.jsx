import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';

const GroupMemberList = ({ group, onClose }) => {
    const [groupData, setGroupData] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');

    const fetchGroupData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_ENDPOINTS.groups}/${group.id}`);
            setGroupData(response.data);
            setError(null);
        } catch (err) {
            setError('Gagal memuat data group.');
            console.error('Error fetching group data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.users);
            setAllUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    useEffect(() => {
        fetchGroupData();
        fetchUsers();
    }, [group.id]);

    const handleAddMember = async () => {
        if (!selectedUserId) {
            alert('Pilih pengguna terlebih dahulu');
            return;
        }

        try {
            await axios.post(
                `${API_ENDPOINTS.groups}/${group.id}/members/${selectedUserId}`
            );
            setShowAddMember(false);
            setSelectedUserId('');
            await fetchGroupData();
            await fetchUsers();
        } catch (err) {
            alert('Gagal menambahkan anggota. Pengguna mungkin sudah menjadi anggota.');
            console.error('Error adding member:', err);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini dari group?')) {
            return;
        }

        try {
            await axios.delete(
                `${API_ENDPOINTS.groups}/${group.id}/members/${userId}`
            );
            await fetchGroupData();
            await fetchUsers();
        } catch (err) {
            alert('Gagal menghapus anggota dari group.');
            console.error('Error removing member:', err);
        }
    };

    const getUserName = (userId) => {
        const user = allUsers.find((u) => u.id === userId);
        return user ? `${user.full_name} (${user.username})` : userId;
    };

    const getAvailableUsers = () => {
        const memberIds = groupData?.member_ids || [];
        return allUsers.filter((u) => !memberIds.includes(u.id));
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</div>;
    }

    if (error) {
        return (
            <div style={{ padding: '20px', color: '#900' }}>
                <p>{error}</p>
                <button onClick={onClose} style={{ marginTop: '10px' }}>
                    Tutup
                </button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '8px' }}>Kelola Anggota: {groupData?.name}</h2>
                <p style={{ color: '#666' }}>{groupData?.description}</p>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}
            >
                <h3>Daftar Anggota ({groupData?.member_count || 0})</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddMember(true)}
                >
                    + Tambah Anggota
                </button>
            </div>

            {showAddMember && (
                <div
                    style={{
                        backgroundColor: '#f5f5f5',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                    }}
                >
                    <h4 style={{ marginBottom: '12px' }}>Tambah Anggota Baru</h4>
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            marginBottom: '12px',
                        }}
                    >
                        <option value="">-- Pilih Pengguna --</option>
                        {getAvailableUsers().map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.full_name} ({user.username}) - {user.role}
                            </option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => {
                                setShowAddMember(false);
                                setSelectedUserId('');
                            }}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleAddMember}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#0066cc',
                                color: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            Tambahkan
                        </button>
                    </div>
                </div>
            )}

            {groupData?.member_count === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#666',
                    }}
                >
                    <p>Belum ada anggota dalam group ini.</p>
                    <p>Klik "Tambah Anggota" untuk menambahkan pengguna.</p>
                </div>
            ) : (
                <div
                    style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        overflow: 'hidden',
                    }}
                >
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                        }}
                    >
                        <thead>
                            <tr style={{ backgroundColor: '#f5f5f5' }}>
                                <th
                                    style={{
                                        padding: '12px',
                                        textAlign: 'left',
                                        borderBottom: '2px solid #ddd',
                                    }}
                                >
                                    Nama Pengguna
                                </th>
                                <th
                                    style={{
                                        padding: '12px',
                                        textAlign: 'left',
                                        borderBottom: '2px solid #ddd',
                                    }}
                                >
                                    Username
                                </th>
                                <th
                                    style={{
                                        padding: '12px',
                                        textAlign: 'left',
                                        borderBottom: '2px solid #ddd',
                                    }}
                                >
                                    Role
                                </th>
                                <th
                                    style={{
                                        padding: '12px',
                                        textAlign: 'right',
                                        borderBottom: '2px solid #ddd',
                                    }}
                                >
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(groupData?.members || []).map((member) => (
                                <tr
                                    key={member.id}
                                    style={{ borderBottom: '1px solid #eee' }}
                                >
                                    <td style={{ padding: '12px' }}>{member.full_name}</td>
                                    <td style={{ padding: '12px' }}>{member.username}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span
                                            style={{
                                                backgroundColor: '#e0e0e0',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                            }}
                                        >
                                            {member.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        <button
                                            className="btn-sm btn-danger"
                                            onClick={() => handleRemoveMember(member.id)}
                                        >
                                            Hapus
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 20px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    Tutup
                </button>
            </div>
        </div>
    );
};

export default GroupMemberList;