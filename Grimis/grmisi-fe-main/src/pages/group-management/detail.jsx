import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { PropagateLoader } from 'react-spinners';
import { showToast } from '@/utils/toast';
import API_ENDPOINTS from '../../config/apiConfig';

const GroupDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadGroupData();
        loadUsers();
    }, [id]);

    const loadGroupData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getGroupById(id), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setGroup(response.data);
        } catch (error) {
            showToast("error", "Gagal memuat data group");
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getUsers, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to load users:", error);
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) {
            showToast("error", "Pilih user terlebih dahulu");
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('access_token');
            await axios.post(
                API_ENDPOINTS.addMemberToGroup(id, selectedUserId),
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            showToast("success", "User berhasil ditambahkan ke group");
            setShowAddMemberModal(false);
            setSelectedUserId('');
            loadGroupData();
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Gagal menambahkan user";
            showToast("error", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm("Apakah Anda yakin ingin menghapus user dari group?")) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(
                API_ENDPOINTS.removeMemberFromGroup(id, userId),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            showToast("success", "User berhasil dihapus dari group");
            loadGroupData();
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Gagal menghapus user";
            showToast("error", errorMessage);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <PropagateLoader color="#021526" loading={loading} size={15} />
            </div>
        );
    }

    if (!group) {
        return (
            <div className="alert alert-warning m-3">
                Group tidak ditemukan
            </div>
        );
    }

    // Get member IDs for quick lookup
    const memberIds = new Set((group.members || []).map(m => m.user_id));

    return (
        <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
            <div className="container-fluid">
                {/* Group Info Card */}
                <div className="card mb-4">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="card-title mb-0">Informasi Group</h5>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-warning btn-sm"
                                onClick={() => navigate(`/groups/edit/${id}`)}
                            >
                                Edit Group
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate('/groups')}
                            >
                                Kembali
                            </button>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-6">
                                <h6>Nama Group</h6>
                                <p>{group.name}</p>
                            </div>
                            <div className="col-md-6">
                                <h6>Deskripsi</h6>
                                <p>{group.description || '-'}</p>
                            </div>
                            <div className="col-md-6">
                                <h6>Jumlah Anggota</h6>
                                <p>{group.member_count || 0}</p>
                            </div>
                            <div className="col-md-6">
                                <h6>Permissions</h6>
                                <p>{group.permissions?.length || 0} permissions assigned</p>
                            </div>
                        </div>

                        {group.permissions && group.permissions.length > 0 && (
                            <div className="mt-3">
                                <h6>Daftar Permissions:</h6>
                                <div className="d-flex flex-wrap gap-2">
                                    {group.permissions.map((perm, index) => (
                                        <span key={index} className="badge bg-primary">
                                            {perm}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Members Card */}
                <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="card-title mb-0">Anggota Group</h5>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowAddMemberModal(true)}
                        >
                            + Tambah Anggota
                        </button>
                    </div>
                    <div className="card-body">
                        {group.members && group.members.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Nama</th>
                                            <th>Email</th>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.members.map((member, index) => (
                                            <tr key={member.user_id}>
                                                <td>{index + 1}</td>
                                                <td>{member.nama_depan} {member.nama_belakang}</td>
                                                <td>{member.email}</td>
                                                <td>{member.username}</td>
                                                <td>
                                                    <span className="badge bg-info">
                                                        {member.role}
                                                    </span>
                                                </td>
                                                <td>
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
                        ) : (
                            <div className="text-center text-muted py-4">
                                Belum ada anggota dalam group ini
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
            <Modal show={showAddMemberModal} onHide={() => setShowAddMemberModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Tambah Anggota ke Group</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <label htmlFor="userSelect" className="form-label">Pilih User</label>
                        <select
                            className="form-select"
                            id="userSelect"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="">-- Pilih User --</option>
                            {users
                                .filter(user => !memberIds.has(user.id))
                                .map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.nama_depan} {user.nama_belakang} ({user.email})
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddMemberModal(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddMember}
                        disabled={submitting || !selectedUserId}
                    >
                        {submitting ? 'Menyimpan...' : 'Tambah'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default GroupDetail;
