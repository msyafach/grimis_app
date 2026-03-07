import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from '@/components/shared/table/Table';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { PropagateLoader } from 'react-spinners';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FiEye, FiEdit, FiTrash2 } from 'react-icons/fi';
import { getRoleLabel } from '../../utils/roleUtils';

setLanguage('id');

const ManajemenPenggunaTabel = ({ resetKey }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState("");
    const [currentUserInstansiId, setCurrentUserInstansiId] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getCurrentUser, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCurrentUserRole(response.data.role);
                setCurrentUserInstansiId(response.data.instansi_id);

                // After getting current user info, fetch users
                fetchUsers(response.data.role, response.data.instansi_id);
            } catch (error) {
                console.error("Error fetching current user:", error);
                setError("Failed to fetch current user information");
                setLoading(false);
            }
        };

        fetchCurrentUser();
    }, [resetKey]);

    const fetchUsers = async (role, instansiId) => {
        try {
            const token = localStorage.getItem('access_token');
            let endpoint = API_ENDPOINTS.getAllUsers;

            // Jika bukan SUPER_ADMIN dan memiliki instansi_id, gunakan filter instansi
            if (role !== "SUPER_ADMIN" && instansiId) {
                endpoint = API_ENDPOINTS.getUsersByInstansi(instansiId);
            }

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching users:", error);
            setError("Failed to fetch users");
            setLoading(false);
        }
    };

    const handleAction = (action, userId) => {
        if (action === 'delete') {
            setSelectedUserId(userId);
            setShowDeleteModal(true);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(API_ENDPOINTS.deleteUser(selectedUserId), {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Refresh the user list after deletion
            fetchUsers(currentUserRole, currentUserInstansiId);
            setShowDeleteModal(false);
            showToast('success', 'Pengguna berhasil dihapus');
        } catch (error) {
            console.error("Error deleting user:", error);
            showToast('error', 'Gagal menghapus pengguna');
        }
    };

    const handleCloseModal = () => {
        setShowDeleteModal(false);
        setSelectedUserId(null);
    };

    const columns = useMemo(() => [
        {
            header: 'No',
            accessorKey: 'no',
            cell: ({ row }) => row.index + 1
        },
        {
            header: 'Nama',
            accessorKey: 'nama',
            cell: ({ row }) => `${row.original.nama_depan || ''} ${row.original.nama_belakang || ''}`
        },
        {
            header: 'Username',
            accessorKey: 'username'
        },
        {
            header: 'Email',
            accessorKey: 'email'
        },
        {
            header: 'Peran',
            accessorKey: 'role',
            cell: ({ row }) => getRoleLabel(row.original.role)
        },
        {
            header: 'Instansi',
            accessorKey: 'nama_instansi',
            cell: ({ row }) => row.original.nama_instansi || '-'
        },
        {
            header: 'Aksi',
            accessorKey: 'actions',
            cell: ({ row }) => (
                <div className="d-flex gap-2">
                    <Link to={`/settings-unit-kerja/manajemen-pengguna/detail/${row.original.id}`} className="btn btn-sm btn-soft-info">
                        <FiEye size={16} />
                    </Link>
                    <Link to={`/settings-unit-kerja/manajemen-pengguna/edit/${row.original.id}`} className="btn btn-sm btn-soft-warning">
                        <FiEdit size={16} />
                    </Link>
                    {/* Don't allow ADMIN_KLP to delete SUPER_ADMIN or other ADMIN_KLP users */}
                    {!(currentUserRole === "ADMIN_KLP" && (row.original.role === "SUPER_ADMIN" || row.original.role === "ADMIN_KLP")) && (
                        <button
                            className="btn btn-sm btn-soft-danger"
                            onClick={() => handleAction('delete', row.original.id)}
                        >
                            <FiTrash2 size={16} />
                        </button>
                    )}
                </div>
            )
        }
    ], [currentUserRole]);

    if (loading || error) {
        return (
            <ContentLoaderWrapper loading={loading} error={error} />
        );
    }

    return (
        <>
            <Table
                title="Daftar Pengguna"
                data={users}
                columns={columns}
            />

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Hapus</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Apakah Anda yakin ingin menghapus pengguna ini?
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-sm btn-secondary" onClick={handleCloseModal}>
                        Batal
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={handleConfirmDelete}>
                        Hapus
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

ManajemenPenggunaTabel.propTypes = {
    resetKey: PropTypes.number.isRequired,
};

export default ManajemenPenggunaTabel;
