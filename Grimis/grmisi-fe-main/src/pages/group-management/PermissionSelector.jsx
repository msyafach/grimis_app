import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';

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
            // Deselect all in category
            setSelectedPermissions((prev) =>
                prev.filter((p) => !category.permissions.includes(p))
            );
        } else {
            // Select all in category
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
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '8px' }}>Kelola Izin: {groupData?.name}</h2>
                <p style={{ color: '#666' }}>{groupData?.description}</p>
            </div>

            {error && (
                <div
                    style={{
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '16px',
                        color: '#900',
                    }}
                >
                    {error}
                </div>
            )}

            <div
                style={{
                    maxHeight: '500px',
                    overflowY: 'auto',
                    marginBottom: '24px',
                }}
            >
                {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                    const isExpanded = expandedCategories.includes(key);
                    const isSelected = isCategorySelected(key);
                    const isIndeterminate =
                        !isSelected &&
                        category.permissions.some((p) => selectedPermissions.includes(p));

                    return (
                        <div
                            key={key}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: '#f5f5f5',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
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
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer',
                                        }}
                                    />
                                    <strong>{category.label}</strong>
                                    <span style={{ color: '#666', fontSize: '14px' }}>
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
                                <div
                                    style={{
                                        padding: '12px 16px',
                                        backgroundColor: 'white',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                            gap: '8px',
                                        }}
                                    >
                                        {category.permissions.map((permission) => (
                                            <label
                                                key={permission}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                    padding: '8px',
                                                    borderRadius: '4px',
                                                    ':hover': { backgroundColor: '#f0f0f0' },
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.includes(permission)}
                                                    onChange={() => handleTogglePermission(permission)}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        cursor: 'pointer',
                                                    }}
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
                <span style={{ color: '#666' }}>
                    {selectedPermissions.length} izin dipilih
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
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
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: loading ? '#ccc' : '#0066cc',
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionSelector;