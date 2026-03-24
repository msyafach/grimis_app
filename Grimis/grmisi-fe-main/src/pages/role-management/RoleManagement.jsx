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
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [roleUsers, setRoleUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

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
            setError('Gagal memuat data peran. Silakan coba lagi.');
            console.error('Error fetching roles:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleManagePermissions = async (role) => {
        try {
            setSelectedRole(role);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getRolePermissions(role.id), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedPermissions(response.data.permissions || []);
            setShowModal(true);
        } catch (err) {
            console.error('Error fetching role permissions:', err);
        }
    };

    const handleViewUsers = async (role) => {
        try {
            setSelectedRole(role);
            setLoadingUsers(true);
            setShowUsersModal(true);
            const token = localStorage.getItem('access_token');
            // Fetch all users and filter by role
            const response = await axios.get(API_ENDPOINTS.users, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter users by role
            const users = response.data || [];
            let filteredUsers;
            if (role.id === 'root') {
                // For root role, filter by is_root flag
                filteredUsers = users.filter(user => user.is_root === true);
            } else {
                // For regular roles, filter by role
                filteredUsers = users.filter(user => user.role === role.id && !user.is_root);
            }
            setRoleUsers(filteredUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
            setRoleUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleCloseUsersModal = () => {
        setShowUsersModal(false);
        setRoleUsers([]);
        setSelectedRole(null);
    };

    const handleResetPermissions = async (role) => {
        if (!window.confirm(`Reset izin ${role.display_name} ke default?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(API_ENDPOINTS.resetRolePermissions(role.id), {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchRoles();
        } catch (err) {
            alert('Gagal reset izin.');
            console.error('Error resetting permissions:', err);
        }
    };

    const handleSavePermissions = async () => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.put(API_ENDPOINTS.updateRolePermissions(selectedRole.id), selectedPermissions, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            await fetchRoles();
        } catch (err) {
            alert('Gagal menyimpan izin.');
            console.error('Error saving permissions:', err);
        }
    };

    const handleTogglePermission = (perm) => {
        setSelectedPermissions(prev => {
            if (prev.includes(perm)) {
                return prev.filter(p => p !== perm);
            }
            return [...prev, perm];
        });
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedRole(null);
        setSelectedPermissions([]);
    };

    const filteredRoles = useMemo(() => {
        return (Array.isArray(roles) ? roles : []).filter((role) =>
            role.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [roles, searchTerm]);

    // Permission categories
    const permissionCategories = {
        'Dashboard': ['view:dashboard', 'view:risk_map'],
        'Organisasi': ['manage:organization', 'view:organization', 'manage:structural_units', 'view:structural_units'],
        'Parameter': ['manage:parameters', 'view:parameters', 'propose:parameters', 'manage:context_target', 'view:context_target', 'manage:context_probis', 'view:context_probis', 'manage:risk_dictionary', 'view:risk_dictionary', 'approve:risk_dictionary'],
        'Risiko': ['manage:risk', 'view:risk', 'propose:risk', 'approve:risk'],
        'Identifikasi': ['manage:identification', 'view:identification', 'create:identification', 'edit:identification', 'delete:identification', 'manage:risk_identification', 'view:risk_identification'],
        'Analisis': ['manage:analysis', 'view:analysis', 'create:analysis', 'edit:analysis', 'create:risk_assessment', 'approve:risk_assessment'],
        'Evaluasi': ['manage:evaluation', 'view:evaluation', 'create:evaluation', 'edit:evaluation', 'verify:evaluation', 'manage:risk_treatment', 'view:risk_treatment'],
        'Monitoring': ['manage:monitoring', 'view:monitoring', 'create:monitoring', 'manage:reporting', 'view:reports', 'export:reports'],
        'Kejadian': ['manage:event', 'view:event', 'approve:event', 'approve:kejadian'],
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
        'manage:context_target': 'Kelola Konteks Sasaran',
        'view:context_target': 'Lihat Konteks Sasaran',
        'manage:context_probis': 'Kelola Konteks Probis',
        'view:context_probis': 'Lihat Konteks Probis',
        'manage:risk_dictionary': 'Kelola Kamus Risiko',
        'view:risk_dictionary': 'Lihat Kamus Risiko',
        'approve:risk_dictionary': 'Setujui Kamus Risiko',
        'manage:risk': 'Kelola Risiko',
        'view:risk': 'Lihat Risiko',
        'propose:risk': 'Ajukan Risiko',
        'approve:risk': 'Setujui Risiko',
        'manage:identification': 'Kelola Identifikasi',
        'view:identification': 'Lihat Identifikasi',
        'create:identification': 'Buat Identifikasi',
        'edit:identification': 'Edit Identifikasi',
        'delete:identification': 'Hapus Identifikasi',
        'manage:risk_identification': 'Kelola Identifikasi Risiko',
        'view:risk_identification': 'Lihat Identifikasi Risiko',
        'manage:analysis': 'Kelola Analisis',
        'view:analysis': 'Lihat Analisis',
        'create:analysis': 'Buat Analisis',
        'edit:analysis': 'Edit Analisis',
        'create:risk_assessment': 'Buat Penilaian Risiko',
        'approve:risk_assessment': 'Setujui Penilaian Risiko',
        'manage:evaluation': 'Kelola Evaluasi',
        'view:evaluation': 'Lihat Evaluasi',
        'create:evaluation': 'Buat Evaluasi',
        'edit:evaluation': 'Edit Evaluasi',
        'verify:evaluation': 'Verifikasi Evaluasi',
        'manage:risk_treatment': 'Kelola Pengobatan Risiko',
        'view:risk_treatment': 'Lihat Pengobatan Risiko',
        'manage:monitoring': 'Kelola Monitoring',
        'view:monitoring': 'Lihat Monitoring',
        'create:monitoring': 'Buat Monitoring',
        'manage:reporting': 'Kelola Laporan',
        'view:reports': 'Lihat Laporan',
        'export:reports': 'Export Laporan',
        'manage:event': 'Kelola Kejadian',
        'view:event': 'Lihat Kejadian',
        'approve:event': 'Setujui Kejadian',
        'approve:kejadian': 'Setujui Kejadian (legacy)',
        'manage:users': 'Kelola Pengguna',
        'view:users': 'Lihat Pengguna',
        'create:users': 'Buat Pengguna',
        'edit:users': 'Edit Pengguna',
        'delete:users': 'Hapus Pengguna',
        'manage:groups': 'Kelola Group',
        'view:groups': 'Lihat Group',
        'manage:roles': 'Kelola Peran',
        'view:roles': 'Lihat Peran',
        'approve:proposals': 'Setujui Pengajuan',
        'view:approvals': 'Lihat Approval',
        'manage:settings': 'Kelola Settings',
        'view:settings': 'Lihat Settings',
        'view:audit_logs': 'Lihat Audit Log'
    };

    const renderModal = () => {
        if (!showModal || !selectedRole) return null;

        return (
            <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Kelola Izin - {selectedRole.display_name}</h5>
                            <button type="button" className="btn-close" onClick={handleModalClose}></button>
                        </div>
                        <div className="modal-body">
                            <p>Pilih izin untuk peran ini:</p>
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                {Object.entries(permissionCategories).map(([category, perms]) => (
                                    <div key={category} className="mb-3">
                                        <h6 className="fw-bold border-bottom pb-1">{category}</h6>
                                        <div className="row">
                                            {perms.map((perm) => (
                                                <div key={perm} className="col-md-6 mb-2">
                                                    <div className="form-check">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id={`perm-${perm}`}
                                                            checked={selectedPermissions.includes(perm)}
                                                            onChange={() => handleTogglePermission(perm)}
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
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={handleModalClose}>Batal</button>
                            <button type="button" className="btn btn-primary" onClick={handleSavePermissions}>Simpan Izin</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUsersModal = () => {
        if (!showUsersModal || !selectedRole) return null;

        return (
            <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Daftar Pengguna - {selectedRole.display_name}</h5>
                            <button type="button" className="btn-close" onClick={handleCloseUsersModal}></button>
                        </div>
                        <div className="modal-body">
                            {loadingUsers ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : roleUsers.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-muted">Tidak ada pengguna dengan peran ini</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Username</th>
                                                <th>Nama</th>
                                                <th>Email</th>
                                                <th>Instansi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roleUsers.map((user) => (
                                                <tr key={user.id}>
                                                    <td>{user.username}</td>
                                                    <td>{user.nama_depan} {user.nama_belakang}</td>
                                                    <td>{user.email}</td>
                                                    <td>{user.nama_instansi || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={handleCloseUsersModal}>Tutup</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <PageHeader title="Manajemen Peran" />
            <div className="main-content">
                <div className="card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="mb-1">Daftar Peran</h4>
                            <p className="text-muted mb-0">Kelola izin untuk peran pengguna yang ada (Super Admin, Admin KLP, dll)</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Cari peran..."
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
                                        <th>Nama Peran</th>
                                        <th>Jumlah Pengguna</th>
                                        <th>Jumlah Izin</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRoles.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4">
                                                Tidak ada peran yang ditemukan
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRoles.map((role) => (
                                            <tr key={role.id} className={role.is_root ? 'table-dark' : ''}>
                                                <td>
                                                    <strong>{role.display_name}</strong>
                                                    <br />
                                                    <small className={role.is_root ? 'text-white-50' : 'text-muted'}>
                                                        {role.name}
                                                    </small>
                                                    {role.is_root ? (
                                                        <span className="badge bg-warning text-dark ms-2">ROOT</span>
                                                    ) : role.has_all_permissions && (
                                                        <span className="badge bg-success ms-2">Semua Izin</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-link text-decoration-none p-0"
                                                        onClick={() => handleViewUsers(role)}
                                                        title="Lihat daftar pengguna"
                                                    >
                                                        {role.user_count || 0} pengguna
                                                    </button>
                                                </td>
                                                <td>{role.permissions?.length || 0} izin</td>
                                                <td>
                                                    {role.is_root ? (
                                                        <span className="badge bg-warning text-dark">ROOT</span>
                                                    ) : role.is_customized ? (
                                                        <span className="badge bg-info">Kustom</span>
                                                    ) : (
                                                        <span className="badge bg-secondary">Default</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        {!role.is_root ? (
                                                            <>
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={() => handleManagePermissions(role)}
                                                                    title="Kelola Izin"
                                                                >
                                                                    <i className="fas fa-key"></i> Izin
                                                                </button>
                                                                {role.is_customized && (
                                                                    <button
                                                                        className="btn btn-sm btn-outline-warning"
                                                                        onClick={() => handleResetPermissions(role)}
                                                                        title="Reset ke Default"
                                                                    >
                                                                        <i className="fas fa-undo"></i> Reset
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-muted fst-italic">Tidak dapat diubah</span>
                                                        )}
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
            {renderUsersModal()}
        </>
    );
};

export default RoleManagement;
