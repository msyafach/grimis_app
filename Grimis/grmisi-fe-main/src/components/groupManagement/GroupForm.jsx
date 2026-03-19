import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { PropagateLoader } from 'react-spinners';
import { showToast } from '@/utils/toast';
import API_ENDPOINTS from '../../config/apiConfig';

const GroupForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [],
    });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // All available permissions grouped by category
    const permissionsByCategory = {
        "Dashboard": [
            { value: "view:dashboard", label: "View Dashboard" },
            { value: "view:risk_map", label: "View Risk Map" },
        ],
        "Organization": [
            { value: "manage:organization", label: "Manage Organization" },
            { value: "view:organization", label: "View Organization" },
        ],
        "Parameters": [
            { value: "manage:parameters", label: "Manage Parameters" },
            { value: "view:parameters", label: "View Parameters" },
            { value: "propose:parameters", label: "Propose Parameters" },
        ],
        "Risk Management": [
            { value: "manage:risk", label: "Manage Risk" },
            { value: "view:risk", label: "View Risk" },
            { value: "propose:risk", label: "Propose Risk" },
            { value: "approve:risk", label: "Approve Risk" },
        ],
        "Identification": [
            { value: "manage:identification", label: "Manage Identification" },
            { value: "view:identification", label: "View Identification" },
            { value: "create:identification", label: "Create Identification" },
            { value: "edit:identification", label: "Edit Identification" },
            { value: "delete:identification", label: "Delete Identification" },
        ],
        "Analysis": [
            { value: "manage:analysis", label: "Manage Analysis" },
            { value: "view:analysis", label: "View Analysis" },
            { value: "create:analysis", label: "Create Analysis" },
            { value: "edit:analysis", label: "Edit Analysis" },
        ],
        "Evaluation": [
            { value: "manage:evaluation", label: "Manage Evaluation" },
            { value: "view:evaluation", label: "View Evaluation" },
            { value: "create:evaluation", label: "Create Evaluation" },
            { value: "edit:evaluation", label: "Edit Evaluation" },
            { value: "verify:evaluation", label: "Verify Evaluation" },
        ],
        "Monitoring & Reporting": [
            { value: "manage:monitoring", label: "Manage Monitoring" },
            { value: "view:monitoring", label: "View Monitoring" },
            { value: "create:monitoring", label: "Create Monitoring" },
            { value: "manage:reporting", label: "Manage Reporting" },
        ],
        "User Management": [
            { value: "manage:users", label: "Manage Users" },
            { value: "view:users", label: "View Users" },
            { value: "create:users", label: "Create Users" },
            { value: "edit:users", label: "Edit Users" },
            { value: "delete:users", label: "Delete Users" },
        ],
        "Group Management": [
            { value: "manage:groups", label: "Manage Groups" },
            { value: "view:groups", label: "View Groups" },
        ],
        "Approval": [
            { value: "approve:proposals", label: "Approve Proposals" },
            { value: "view:approvals", label: "View Approvals" },
        ],
        "Settings": [
            { value: "manage:settings", label: "Manage Settings" },
            { value: "view:settings", label: "View Settings" },
        ],
    };

    useEffect(() => {
        if (isEditMode) {
            loadGroupData();
        }
    }, [id]);

    const loadGroupData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getGroupById(id), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const group = response.data;
            setFormData({
                name: group.name || '',
                description: group.description || '',
                permissions: group.permissions || [],
            });
        } catch (error) {
            showToast("error", "Gagal memuat data group");
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (permissionValue) => {
        setFormData(prev => {
            const currentPermissions = prev.permissions || [];
            if (currentPermissions.includes(permissionValue)) {
                return {
                    ...prev,
                    permissions: currentPermissions.filter(p => p !== permissionValue)
                };
            } else {
                return {
                    ...prev,
                    permissions: [...currentPermissions, permissionValue]
                };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            showToast("error", "Nama group harus diisi");
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('access_token');

            if (isEditMode) {
                await axios.put(API_ENDPOINTS.updateGroup(id), formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                showToast("success", "Group berhasil diupdate");
            } else {
                await axios.post(API_ENDPOINTS.createGroup, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                showToast("success", "Group berhasil dibuat");
            }

            navigate('/groups');
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan";
            showToast("error", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <PropagateLoader color="#021526" loading={loading} size={15} />
            </div>
        );
    }

    return (
        <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
            <div className="container-fluid">
                <div className="card">
                    <div className="card-header">
                        <h5 className="card-title mb-0">
                            {isEditMode ? 'Edit Group' : 'Tambah Group Baru'}
                        </h5>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="name" className="form-label">Nama Group *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Masukkan nama group"
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Deskripsi</label>
                                <textarea
                                    className="form-control"
                                    id="description"
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Masukkan deskripsi group (opsional)"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="form-label d-block">Permissions</label>
                                <div className="row">
                                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                        <div className="col-md-6 col-lg-4 mb-3" key={category}>
                                            <div className="card h-100">
                                                <div className="card-header py-2">
                                                    <h6 className="card-title mb-0 fs-6">{category}</h6>
                                                </div>
                                                <div className="card-body py-2">
                                                    {perms.map((perm) => (
                                                        <div key={perm.value} className="form-check mb-2">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id={perm.value}
                                                                checked={(formData.permissions || []).includes(perm.value)}
                                                                onChange={() => handlePermissionChange(perm.value)}
                                                            />
                                                            <label className="form-check-label" htmlFor={perm.value}>
                                                                {perm.label}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Menyimpan...' : (isEditMode ? 'Update' : 'Simpan')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/groups')}
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupForm;
