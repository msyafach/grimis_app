import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container,
    Header,
    Content,
    ActionButton,
    Table,
    TableHeader,
    TableRow,
    TableCell,
    TableBody,
    EmptyState,
    LoadingState,
    ErrorState,
    Badge,
    SearchInput,
} from '../../components/shared';
import { API_ENDPOINTS } from '../../config/api';
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
            const response = await axios.get(API_ENDPOINTS.groups);
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
            await axios.delete(`${API_ENDPOINTS.groups}/${groupId}`);
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

    const filteredGroups = groups.filter((group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        <Container>
            <Header>
                <h1>Manajemen Group</h1>
                <ActionButton onClick={handleCreate}>+ Tambah Group</ActionButton>
            </Header>

            <Content>
                <SearchInput
                    placeholder="Cari group..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {loading ? (
                    <LoadingState message="Memuat data group..." />
                ) : error ? (
                    <ErrorState message={error} onRetry={fetchGroups} />
                ) : filteredGroups.length === 0 ? (
                    <EmptyState
                        title={searchTerm ? 'Group tidak ditemukan' : 'Belum ada group'}
                        message={
                            searchTerm
                                ? 'Coba dengan kata kunci yang berbeda'
                                : 'Mulai dengan membuat group baru'
                        }
                        action={searchTerm ? null : handleCreate}
                        actionLabel="Tambah Group"
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>Nama Group</TableCell>
                                <TableCell>Deskripsi</TableCell>
                                <TableCell>Jumlah Anggota</TableCell>
                                <TableCell>Dibuat</TableCell>
                                <TableCell>Aksi</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGroups.map((group) => (
                                <TableRow key={group.id}>
                                    <TableCell>
                                        <strong>{group.name}</strong>
                                    </TableCell>
                                    <TableCell>{group.description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="primary">{group.member_count} anggota</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(group.created_at).toLocaleDateString('id-ID')}
                                    </TableCell>
                                    <TableCell>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                className="btn-sm btn-primary"
                                                onClick={() => handleEdit(group)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn-sm btn-secondary"
                                                onClick={() => handleManageMembers(group)}
                                            >
                                                Anggota
                                            </button>
                                            <button
                                                className="btn-sm btn-secondary"
                                                onClick={() => handleManagePermissions(group)}
                                            >
                                                Izin
                                            </button>
                                            <button
                                                className="btn-sm btn-danger"
                                                onClick={() => handleDelete(group.id, group.name)}
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Content>

            {showModal && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={handleModalClose}
                >
                    <div
                        className="modal-content"
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '24px',
                            maxWidth: '800px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {renderModal()}
                    </div>
                </div>
            )}
        </Container>
    );
};

export default GroupManagement;
