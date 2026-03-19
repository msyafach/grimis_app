import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';

const PERMISSION_CATEGORIES = {
    dashboard: {
        label: 'Dashboard',
        permissions: ['view:dashboard', 'view:risk_map'],
    },
    organization: {
        label: 'Organisasi',
        permissions: [
            'manage:organization',
            'view:organization',
            'manage:structural_units',
            'view:structural_units',
        ],
    },
    parameters: {
        label: 'Parameter',
        permissions: [
            'manage:context_target',
            'view:context_target',
            'manage:context_probis',
            'view:context_probis',
            'manage:risk_dictionary',
            'view:risk_dictionary',
        ],
    },
    risk_management: {
        label: 'Pengelolaan Risiko',
        permissions: [
            'manage:risk_identification',
            'view:risk_identification',
            'create:risk_assessment',
            'approve:risk_assessment',
            'manage:risk_treatment',
            'view:risk_treatment',
            'manage:monitoring',
            'view:monitoring',
        ],
    },
    event_management: {
        label: 'Manajemen Kejadian',
        permissions: [
            'manage:event',
            'view:event',
            'approve:event',
        ],
    },
    user_management: {
        label: 'Manajemen Pengguna',
        permissions: [
            'manage:users',
            'view:users',
            'manage:groups',
            'view:groups',
        ],
    },
    approval: {
        label: 'Persetujuan',
        permissions: [
            'approve:risk_dictionary',
            'approve:kejadian',
        ],
    },
    reports: {
        label: 'Laporan',
        permissions: [
            'view:reports',
            'export:reports',
        ],
    },
    settings: {
        label: 'Pengaturan',
        permissions: [
            'manage:settings',
            'view:audit_logs',
        ],
    },
};

const PermissionSelector = ({ group, onClose }) => {
    const [groupData, setGroupData] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState(
        Object.keys(PERMISSION_CATEGORIES)
    );

    useEffect(() => {
        fetchGroupData();
    }, [group.id]);

    const fetchGroupData = async () => {
        try {
            const response = await axios.get(`${API_ENDPOINTS.groups}/${group.id}`);
            setGroupData(response.data);
            setSelectedPermissions(response.data.permissions || []);
        } catch (err) {
            setError('Gagal memuat data group.');
            console.error('Error fetching group data:', err);
        }
    };

    const handleTogglePermission = (permission) => {
        setSelectedPermissions((prev) =>
            prev.includes(permission)
                ? prev.filter((p) => p !== permission)
                : [...prev, permission]
        );
    };

    const handleToggleCategory = (categoryKey) => {
        const category = PERMISSION_CATEGORIES[categoryKey];
        const allSelected = category.permissions.every((p) =>
            selectedPermissions.includes(p)
        );

        if (allSelected) {
            setSelectedPermissions((prev) =>
                prev.filter((p) => !category.permissions.includes(p))
            );
        } else {
            setSelectedPermissions((prev) => {
                const newPermissions = prev.filter(
                    (p) => !category.permissions.includes(p)
                );
                category.permissions.forEach((p) => {
                    if (!newPermissions.includes(p)) {
                        newPermissions.push(p);
                    }
                });
                return newPermissions;
            });
        }
    };

    const handleToggleExpand = (categoryKey) => {
        setExpandedCategories((prev) =>
            prev.includes(categoryKey)
                ? prev.filter((k) => k !== categoryKey)
                : [...prev, categoryKey]
        );
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);

        try {
            await axios.put(`${API_ENDPOINTS.groups}/${group.id}/permissions`, {
                permissions: selectedPermissions,
            });
            onClose();
        } catch (err) {
            setError('Gagal menyimpan perubahan.');
            console.error('Error saving permissions:', err);
        } finally {
            setLoading(false);
        }
    };

    const isCategorySelected = (categoryKey) => {
        return PERMISSION_CATEGORIES[categoryKey].permissions.every((p) =>
            selectedPermissions.includes(p)
        );
    };

    const getPermissionLabel = (permission) => {
        const labels = {
            'view:dashboard': 'Lihat Dashboard',
            'view:risk_map': 'Lihat Peta Risiko',
            'manage:organization': 'Kelola Organisasi',
            'view:organization': 'Lihat Organisasi',
            'manage:structural_units': 'Kelola Unit Struktural',
            'view:structural_units': 'Lihat Unit Struktural',
            'manage:context_target': 'Kelola Konteks Sasaran',
            'view:context_target': 'Lihat Konteks Sasaran',
            'manage:context_probis': 'Kelola Konteks Probis',
            'view:context_probis': 'Lihat Konteks Probis',
            'manage:risk_dictionary': 'Kelola Kamus Risiko',
            'view:risk_dictionary': 'Lihat Kamus Risiko',
            'manage:risk_identification': 'Kelola Identifikasi Risiko',
            'view:risk_identification': 'Lihat Identifikasi Risiko',
            'create:risk_assessment': 'Buat Kajian Risiko',
            'approve:risk_assessment': 'Setujui Kajian Risiko',
            'manage:risk_treatment': 'Kelola Penanganan Risiko',
            'view:risk_treatment': 'Lihat Penanganan Risiko',
            'manage:monitoring': 'Kelola Monitoring',
            'view:monitoring': 'Lihat Monitoring',
            'manage:event': 'Kelola Kejadian',
            'view:event': 'Lihat Kejadian',
            'approve:event': 'Setujui Kejadian',
            'manage:users': 'Kelola Pengguna',
            'view:users': 'Lihat Pengguna',
            'manage:groups': 'Kelola Group',
            'view:groups': 'Lihat Group',
            'approve:risk_dictionary': 'Setujui Kamus Risiko',
            'approve:kejadian': 'Setujui Kejadian',
            'view:reports': 'Lihat Laporan',
            'export:reports': 'Ekspor Laporan',
            'manage:settings': 'Kelola Pengaturan',
            'view:audit_logs': 'Lihat Audit Log',
        };
        return labels[permission] || permission;
    };

    return (
        <div>
            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    {error}
                </div>
            )}

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
                {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                    const isExpanded = expandedCategories.includes(key);
                    const isSelected = isCategorySelected(key);

                    return (
                        <div
                            key={key}
                            className="card mb-2"
                            style={{ marginBottom: '8px' }}
                        >
                            <div
                                className="card-header"
                                style={{
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    backgroundColor: '#f8f9fa',
                                }}
                                onClick={() => handleToggleExpand(key)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleToggleCategory(key);
                                        }}
                                        className="form-check-input"
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <strong>{category.label}</strong>
                                    <span className="text-muted" style={{ fontSize: '14px' }}>
                                        ({category.permissions.length} izin)
                                    </span>
                                </div>
                                <span
                                    style={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                    }}
                                >
                                    ▼
                                </span>
                            </div>

                            {isExpanded && (
                                <div className="card-body" style={{ padding: '12px 16px' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: '8px',
                                    }}>
                                        {category.permissions.map((permission) => (
                                            <label
                                                key={permission}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.includes(permission)}
                                                    onChange={() => handleTogglePermission(permission)}
                                                    className="form-check-input"
                                                />
                                                <span style={{ fontSize: '14px' }}>
                                                    {getPermissionLabel(permission)}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid #eee',
                }}
            >
                <span className="text-muted">
                    {selectedPermissions.length} izin dipilih
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionSelector;
