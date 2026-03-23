import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'users' | 'permissions'
    const [formData, setFormData] = useState({ name: '', description: '', permissions: [] });
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.roles, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoles(response.data);
            setError(null);
        } catch (err) {
            setError('Gagal memuat data role. Silakan coba lagi.');
            console.error('Error fetching roles:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.users, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchPermissions = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_BASE_URL}/api/v1/users/me/permissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // This is a placeholder - permissions should come from a dedicated endpoint
            setAvailablePermissions([]);
        } catch (err) {
            console.error('Error fetching permissions:', err);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleCreate = () => {
        setSelectedRole(null);
        setFormData({ name: '', description: '', permissions: [] });
        setModalMode('create');
        setShowModal(true);
    };

    const handleEdit = (role) => {
        setSelectedRole(role);
        setFormData({
            name: role.name || '',
            description: role.description || '',
            permissions: role.permissions || []
        });
        setModalMode('edit');
        setShowModal(true);
    };

    const handleManageUsers = async (role) => {
        setSelectedRole(role);
        await fetchUsers();
        setSelectedUsers(role.users?.map(u => u.user_id) || []);
        setModalMode('users');
        setShowModal(true);
    };

    const handleManagePermissions = (role) => {
        setSelectedRole(role);
        setFormData({ ...formData, permissions: role.permissions || [] });
        setModalMode('permissions');
        setShowModal(true);
    };

    const handleDelete = async (roleId, roleName) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus role "${roleName}"?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(API_ENDPOINTS.deleteRole(roleId), {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchRoles();
        } catch (err) {
            alert('Gagal menghapus role. Pastikan role tidak memiliki pengguna.');
            console.error('Error deleting role:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            if (modalMode === 'create') {
                await axios.post(API_ENDPOINTS.createRole, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else if (modalMode === 'edit') {
                await axios.put(API_ENDPOINTS.updateRole(selectedRole.id), formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else if (modalMode === 'permissions') {
                await axios.put(API_ENDPOINTS.updateRolePermissions(selectedRole.id), {
                    permissions: formData.permissions
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchRoles();
        } catch (err) {
            alert('Gagal menyimpan role. Silakan coba lagi.');
            console.error('Error saving role:', err);
        }
    };

    const handleUserToggle = async (userId, isSelected) => {
        try {
            const token = localStorage.getItem('access_token');
            if (isSelected) {
                await axios.post(API_ENDPOINTS.assignRoleToUser(selectedRole.id, userId), {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.delete(API_ENDPOINTS.removeRoleFromUser(selectedRole.id, userId), {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            // Refresh role data
            const response = await axios.get(API_ENDPOINTS.getRoleById(selectedRole.id), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedRole(response.data);
        } catch (err) {
            console.error('Error updating role users:', err);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedRole(null);
        fetchRoles();
    };

    const filteredRoles = useMemo(() => {
        return (Array.isArray(roles) ? roles : []).filter((role) =>
            role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [roles, searchTerm]);

    const permissionCategories = {
        'Dashboard': ['view:dashboard', 'view:risk_map'],
        'Organisasi': ['manage:organization', 'view:organization', 'manage:structural_units', 'view:structural_units'],
        'Parameter': ['manage:parameters', 'view:parameters', 'propose:parameters'],
        'Risiko': ['manage:risk', 'view:risk', 'propose:risk', 'approve:risk'],
        'Identifikasi': ['manage:identification', 'view:identification', 'create:identification', 'edit:identification', 'delete:identification'],
        'Analisis': ['manage:analysis', 'view:analysis', 'create:analysis', 'edit:analysis'],
        'Evaluasi': ['manage:evaluation', 'view:evaluation', 'create:evaluation', 'edit:evaluation', 'verify:evaluation'],
        'Monitoring': ['manage:monitoring', 'view:monitoring', 'create:monitoring', 'manage:reporting', 'view:reports', 'export:reports'],
        'Pengguna': ['manage:users', 'view:users', 'create:users', 'edit:users', 'delete:users'],
        'Group': ['manage:groups', 'view:groups'],
        'Role': ['manage:roles', 'view:roles'],
        'Approval': ['approve:proposals', 'view:approvals'],
        'Settings': ['manage:settings', 'view:settings', 'view:audit_logs']
    };

    const permissionLabels = {
        'view:dashboard': 'Lihat Dashboard',
        'view:risk_map': 'Lihat Peta Risiko',
        'manage:organization': 'Kelola Organisasi',
        'view:organization': 'Lihat Organisasi',
        'manage:structural_units': 'Kelola Unit Struktural',
        'view:structural_units': 'Lihat Unit Struktural',
        'manage:parameters': 'Kelola Parameter',
        'view:parameters': 'Lihat Parameter',
        'propose:parameters': 'Ajukan Parameter',
        'manage:risk': 'Kelola Risiko',
        'view:risk': 'Lihat Risiko',
        'propose:risk': 'Ajukan Risiko',
        'approve:risk': 'Setujui Risiko',
        'manage:identification': 'Kelola Identifikasi',
        'view:identification': 'Lihat Identifikasi',
        'create:identification': 'Buat Identifikasi',
        'edit:identification': 'Edit Identifikasi',
        'delete:identification': 'Hapus Identifikasi',
        'manage:analysis': 'Kelola Analisis',
        'view:analysis': 'Lihat Analisis',
        'create:analysis': 'Buat Analisis',
        'edit:analysis': 'Edit Analisis',
        'manage:evaluation': 'Kelola Evaluasi',
        'view:evaluation': 'Lihat Evaluasi',
        'create:evaluation': 'Buat Evaluasi',
        'edit:evaluation': 'Edit Evaluasi',
        'verify:evaluation': 'Verifikasi Evaluasi',
        'manage:monitoring': 'Kelola Monitoring',
        'view:monitoring': 'Lihat Monitoring',
        'create:monitoring': 'Buat Monitoring',
        'manage:reporting': 'Kelola Laporan',
        'view:reports': 'Lihat Laporan',
        'export:reports': 'Export Laporan',
        'manage:users': 'Kelola Pengguna',
        'view:users': 'Lihat Pengguna',
        'create:users': 'Buat Pengguna',
        'edit:users': 'Edit Pengguna',
        'delete:users': 'Hapus Pengguna',
        'manage:groups': 'Kelola Group',
        'view:groups': 'Lihat Group',
        'manage:roles': 'Kelola Role',
        'view:roles': 'Lihat Role',
        'approve:proposals': 'Setujui Pengajuan',
        'view:approvals': 'Lihat Approval',
        'manage:settings': 'Kelola Settings',
        'view:settings': 'Lihat Settings',
        'view:audit_logs': 'Lihat Audit Log'
    };

    const renderModal = () => {
        if (!showModal) return null;

        const modalTitle = {
            'create': 'Tambah Role Baru',
            'edit': 'Edit Role',
            'users': `Kelola Pengguna - ${selectedRole?.name}`,
            'permissions': `Kelola Izin - ${selectedRole?.name}`
        }[modalMode];

        return (
            <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{modalTitle}</h5>
                            <button type="button" className="btn-close" onClick={handleModalClose}></button>
                        </div>
                        <div className="modal-body">
                            {(modalMode === 'create' || modalMode === 'edit') && (
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Nama Role</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Deskripsi</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={handleModalClose}>Batal</button>
                                        <button type="submit" className="btn btn-primary">Simpan</button>
                                    </div>
                                </form>
                            )}

                            {modalMode === 'users' && (
                                <div>
                                    <p>Pilih pengguna untuk ditambahkan ke role ini:</p>
                                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Pilih</th>
                                                    <th>Username</th>
                                                    <th>Nama</th>
                                                    <th>Role Sistem</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((user) => {
                                                    const isSelected = selectedRole?.users?.some(u => u.user_id === user.id);
                                                    return (
                                                        <tr key={user.id}>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    checked={isSelected}
                                                                    onChange={(e) => handleUserToggle(user.id, e.target.checked)}
                                                                />
                                                            </td>
                                                            <td>{user.username}</td>
                                                            <td>{user.nama_depan} {user.nama_belakang}</td>
                                                            <td>{user.role}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={handleModalClose}>Tutup</button>
                                    </div>
                                </div>
                            )}

                            {modalMode === 'permissions' && (
                                <form onSubmit={handleSubmit}>
                                    <p>Pilih izin untuk role ini:</p>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        {Object.entries(permissionCategories).map(([category, perms]) => (
                                            <div key={category} className="mb-3">
                                                <h6 className="fw-bold">{category}</h6>
                                                <div className="row">
                                                    {perms.map((perm) => (
                                                        <div key={perm} className="col-md-6 mb-2">
                                                            <div className="form-check">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    id={`perm-${perm}`}
                                                                    checked={formData.permissions.includes(perm)}
                                                                    onChange={(e) => {
                                                                        const newPerms = e.target.checked
                                                                            ? [...formData.permissions, perm]
                                                                            : formData.permissions.filter(p => p !== perm);
                                                                        setFormData({ ...formData, permissions: newPerms });
                                                                    }}
                                                                />
                                                                <label className="form-check-label" htmlFor={`perm-${perm}`}>
                                                                    {permissionLabels[perm] || perm}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={handleModalClose}>Batal</button>
                                        <button type="submit" className="btn btn-primary">Simpan Izin</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <PageHeader title="Manajemen Role" />
            <div className="main-content">
                <div className="card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="mb-1">Daftar Role</h4>
                            <p className="text-muted mb-0">Kelola role dan izin pengguna</p>
                        </div>
                        <button className="btn btn-primary" onClick={handleCreate}>
                            <i className="fas fa-plus me-2"></i>Tambah Role
                        </button>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Cari role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Nama Role</th>
                                        <th>Deskripsi</th>
                                        <th>Jumlah Pengguna</th>
                                        <th>Jumlah Izin</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRoles.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4">
                                                Tidak ada role yang ditemukan
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRoles.map((role) => (
                                            <tr key={role.id}>
                                                <td>{role.name}</td>
                                                <td>{role.description || '-'}</td>
                                                <td>{role.user_count || 0} pengguna</td>
                                                <td>{role.permissions?.length || 0} izin</td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => handleManageUsers(role)}
                                                            title="Kelola Pengguna"
                                                        >
                                                            <i className="fas fa-users"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-info"
                                                            onClick={() => handleManagePermissions(role)}
                                                            title="Kelola Izin"
                                                        >
                                                            <i className="fas fa-key"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => handleEdit(role)}
                                                            title="Edit"
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDelete(role.id, role.name)}
                                                            title="Hapus"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
            {renderModal()}
        </>
    );
};

export default RoleManagement;
