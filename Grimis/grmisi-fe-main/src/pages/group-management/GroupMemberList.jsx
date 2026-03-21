import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';

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
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_ENDPOINTS.groups}/${group.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
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
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.users, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
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
            const token = localStorage.getItem('access_token');
            await axios.post(
                `${API_ENDPOINTS.groups}/${group.id}/members/${selectedUserId}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
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
            const token = localStorage.getItem('access_token');
            await axios.delete(
                `${API_ENDPOINTS.groups}/${group.id}/members/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            await fetchGroupData();
            await fetchUsers();
        } catch (err) {
            alert('Gagal menghapus anggota dari group.');
            console.error('Error removing member:', err);
        }
    };

    const getAvailableUsers = () => {
        const memberIds = groupData?.member_ids || [];
        return (Array.isArray(allUsers) ? allUsers : []).filter((u) => !memberIds.includes(u.id));
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Memuat data...</div>;
    }

    if (error) {
        return (
            <div style={{ padding: '20px', color: '#900' }}>
                <p>{error}</p>
                <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '10px' }}>
                    Tutup
                </button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '8px' }}>Kelola Anggota: {groupData?.name}</h4>
                <p className="text-muted">{groupData?.description}</p>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}
            >
                <h5>Daftar Anggota ({groupData?.member_count || 0})</h5>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddMember(true)}
                >
                    + Tambah Anggota
                </button>
            </div>

            {showAddMember && (
                <div
                    className="alert alert-info"
                    style={{ marginBottom: '16px' }}
                >
                    <h6 style={{ marginBottom: '12px' }}>Tambah Anggota Baru</h6>
                    <select
                        className="form-control"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        style={{ marginBottom: '12px' }}
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
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                setShowAddMember(false);
                                setSelectedUserId('');
                            }}
                        >
                            Batal
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleAddMember}
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
                <div className="table-responsive">
                    <table className="table table-bordered">
                        <thead className="thead-light">
                            <tr>
                                <th>Nama Pengguna</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th style={{ textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(groupData?.members || []).map((member) => (
                                <tr key={member.user_id}>
                                    <td>{member.full_name || `${member.nama_depan} ${member.nama_belakang}`}</td>
                                    <td>{member.username}</td>
                                    <td>
                                        <span className="badge badge-secondary">{member.role}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleRemoveMember(member.user_id)}
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
                    className="btn btn-secondary"
                    onClick={onClose}
                >
                    Tutup
                </button>
            </div>
        </div>
    );
};

export default GroupMemberList;
