import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import GroupForm from './GroupForm';
import GroupMemberList from './GroupMemberList';
import PermissionSelector from './PermissionSelector';

const GroupManagement = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'members' | 'permissions'

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.groups, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setGroups(response.data);
            setError(null);
        } catch (err) {
            setError('Gagal memuat data group. Silakan coba lagi.');
            console.error('Error fetching groups:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleCreate = () => {
        setSelectedGroup(null);
        setModalMode('create');
        setShowModal(true);
    };

    const handleEdit = (group) => {
        setSelectedGroup(group);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleManageMembers = (group) => {
        setSelectedGroup(group);
        setModalMode('members');
        setShowModal(true);
    };

    const handleManagePermissions = (group) => {
        setSelectedGroup(group);
        setModalMode('permissions');
        setShowModal(true);
    };

    const handleDelete = async (groupId, groupName) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus group "${groupName}"?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(`${API_ENDPOINTS.groups}/${groupId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            await fetchGroups();
        } catch (err) {
            alert('Gagal menghapus group. Pastikan group tidak memiliki anggota.');
            console.error('Error deleting group:', err);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedGroup(null);
        fetchGroups();
    };

    const filteredGroups = useMemo(() => {
        return (Array.isArray(groups) ? groups : []).filter((group) =>
            group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [groups, searchTerm]);

    const renderModal = () => {
        switch (modalMode) {
            case 'create':
                return <GroupForm onClose={handleModalClose} />;
            case 'edit':
                return <GroupForm group={selectedGroup} onClose={handleModalClose} />;
            case 'members':
                return <GroupMemberList group={selectedGroup} onClose={handleModalClose} />;
            case 'permissions':
                return <PermissionSelector group={selectedGroup} onClose={handleModalClose} />;
            default:
                return null;
        }
    };

    return (
        <>
            <PageHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <h1 style={{ margin: 0 }}>Manajemen Group</h1>
                    <button
                        className="btn btn-primary"
                        onClick={handleCreate}
                        style={{ padding: '10px 20px', fontSize: '14px' }}
                    >
                        + Tambah Group
                    </button>
                </div>
            </PageHeader>

            <div className='main-content' style={{ minHeight: 'calc(100vh - 120px)', padding: '20px' }}>
                <div className='row'>
                    <div className='col-12'>
                        <div style={{ marginBottom: '20px' }}>
                            <input
                                type="text"
                                placeholder="Cari group..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                }}
                            />
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="sr-only">Loading...</span>
                                </div>
                            </div>
                        ) : error ? (
                            <div style={{
                                backgroundColor: '#fee',
                                border: '1px solid #fcc',
                                borderRadius: '4px',
                                padding: '16px',
                                color: '#900',
                                marginBottom: '16px',
                            }}>
                                {error}
                                <button
                                    onClick={fetchGroups}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '6px 12px',
                                        backgroundColor: '#900',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                color: '#666',
                            }}>
                                <p>{searchTerm ? 'Group tidak ditemukan' : 'Belum ada group'}</p>
                                <p>{searchTerm ? 'Coba dengan kata kunci yang berbeda' : 'Mulai dengan membuat group baru'}</p>
                                {!searchTerm && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleCreate}
                                        style={{ marginTop: '16px' }}
                                    >
                                        Tambah Group
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="card">
                                <div className="card-body">
                                    <table className="table table-responsive">
                                        <thead>
                                            <tr>
                                                <th>Nama Group</th>
                                                <th>Deskripsi</th>
                                                <th>Jumlah Anggota</th>
                                                <th>Dibuat</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredGroups.map((group) => (
                                                <tr key={group.id}>
                                                    <td><strong>{group.name}</strong></td>
                                                    <td>{group.description || '-'}</td>
                                                    <td>
                                                        <span className="badge badge-primary">{group.member_count} anggota</span>
                                                    </td>
                                                    <td>
                                                        {new Date(group.created_at).toLocaleDateString('id-ID')}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => handleEdit(group)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => handleManageMembers(group)}
                                                            >
                                                                Anggota
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-info"
                                                                onClick={() => handleManagePermissions(group)}
                                                            >
                                                                Izin
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleDelete(group.id, group.name)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showModal && (
                <div
                    className="modal fade show"
                    style={{
                        display: 'block',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                    }}
                    onClick={handleModalClose}
                >
                    <div
                        className="modal-dialog modal-dialog-centered modal-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {modalMode === 'create' && 'Tambah Group Baru'}
                                    {modalMode === 'edit' && 'Edit Group'}
                                    {modalMode === 'members' && 'Kelola Anggota'}
                                    {modalMode === 'permissions' && 'Kelola Izin'}
                                </h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={handleModalClose}
                                >
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {renderModal()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
};

export default GroupManagement;
